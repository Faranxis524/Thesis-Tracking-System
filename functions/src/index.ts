// Firebase Cloud Functions - functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// 1. ENFORCE MEMBER LIMIT (Max 4 members per group)
// ============================================================
export const enforceMemberLimit = onDocumentCreated(
  'groupMembers/{groupId}/members/{userId}',
  async (event) => {
    const memberData = event.data?.data();
    const groupId = event.params.groupId;
    
    // Only check for non-leader members
    if (memberData?.role !== 'member') {
      return;
    }
    
    // Count existing members
    const membersSnapshot = await db
      .collection('groupMembers')
      .doc(groupId)
      .collection('members')
      .where('role', '==', 'member')
      .get();
    
    // Enforce maximum of 4 members (plus 1 leader = 5 total)
    if (membersSnapshot.size > 4) {
      await event.data?.ref.delete();
      
      // Log violation
      await db.collection('auditLogs').add({
        actorId: memberData.userId,
        action: 'member_limit_violation',
        entityType: 'groupMembers',
        entityId: groupId,
        meta: {
          memberId: memberData.userId,
          message: 'Attempted to exceed 4 member limit',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Maximum of 4 members allowed per group (leader + 4 = 5 total)'
      );
    }
  }
);

// ============================================================
// 2. AUTO-ADVANCE GROUP STAGE ON DEFENSE COMPLETION
// ============================================================
export const autoAdvanceGroupStage = onDocumentUpdated(
  'defenses/{defenseId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const groupId = event.params.groupId;
    
    // Check if defense was marked as 'done'
    if (before?.status !== 'done' && after?.status === 'done') {
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      
      if (!groupDoc.exists()) {
        return;
      }
      
      const currentStage = groupDoc.data()?.stage;
      let newStage = currentStage;
      
      // Advance based on defense stage
      if (after.stage === 'title' && currentStage === 'title') {
        newStage = 'proposal';
      } else if (after.stage === 'proposal' && currentStage === 'proposal') {
        newStage = 'final';
      }
      
      // Update group stage if changed
      if (newStage !== currentStage) {
        await groupRef.update({ stage: newStage });
        
        // Log stage transition
        await db.collection('auditLogs').add({
          actorId: after.updatedBy || after.createdBy,
          action: 'stage_auto_advance',
          entityType: 'groups',
          entityId: groupId,
          meta: {
            oldStage: currentStage,
            newStage,
            defenseId: event.params.defenseId,
            defenseStage: after.stage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Notify group leader
        const groupData = groupDoc.data();
        if (groupData?.leaderId) {
          await db.collection('notifications').add({
            userId: groupData.leaderId,
            type: 'stage_advance',
            title: 'Research Stage Advanced',
            message: `Your research has advanced to ${newStage} stage`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  }
);

// ============================================================
// 3. SUBMISSION STATUS AUDIT
// ============================================================
export const auditSubmissionChange = onDocumentUpdated(
  'submissions/{submissionId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    // Log status changes
    if (before?.status !== after?.status) {
      await db.collection('auditLogs').add({
        actorId: after?.reviewedBy || 'system',
        action: 'submission_status_change',
        entityType: 'submissions',
        entityId: event.params.submissionId,
        meta: {
          groupId: after?.groupId,
          requirementId: after?.requirementId,
          oldStatus: before?.status,
          newStatus: after?.status,
          reviewedAt: after?.reviewedAt,
          driveUrl: after?.driveUrl
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify teacher on approval/rejection
      if (after?.status === 'approved' || after?.status === 'needs_revision') {
        const groupDoc = await db.collection('groups').doc(after?.groupId).get();
        const groupData = groupDoc.data();
        
        if (groupData?.leaderId) {
          await db.collection('notifications').add({
            userId: groupData.leaderId,
            type: 'submission_reviewed',
            title: `Submission ${after?.status === 'approved' ? 'Approved' : 'Needs Revision'}`,
            message: `Your submission for requirement ${after?.requirementId} has been reviewed`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  }
);

// ============================================================
// 4. USER CREATION HOOK
// ============================================================
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const email = user.email || '';
  const isLeader = email.includes('leader');
  const role = isLeader ? 'leader' : 'teacher';
  
  // Create user profile in Firestore
  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Set custom claims for role-based access
  await admin.auth().setCustomUserClaims(user.uid, {
    role,
    canManageStudents: isLeader,
    canApproveSubmissions: !isLeader // Teachers can approve
  });
  
  // Log user creation
  await db.collection('auditLogs').add({
    actorId: user.uid,
    action: 'user_created',
    entityType: 'users',
    entityId: user.uid,
    meta: {
      role,
      email,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`User created: ${user.uid} with role: ${role}`);
});

// ============================================================
// 5. FORM OPENING VALIDATION
// ============================================================
export const validateFormOpening = onDocumentCreated(
  'formOpenings/{openingId}',
  async (event) => {
    const opening = event.data?.data();
    
    if (!opening) {
      return;
    }
    
    // Check for conflicting form openings (same scope)
    const conflicts = await db.collection('formOpenings')
      .where('requirementId', '==', opening.requirementId)
      .where('isOpen', '==', true)
      .get();
    
    // Allow multiple openings only if they have different scope
    // (different term, college, or section)
    if (!opening.termId && !opening.collegeId && !opening.sectionId) {
      // Global opening - should be unique
      if (conflicts.size > 0) {
        await event.data?.ref.delete();
        throw new functions.https.HttpsError(
          'already-exists',
          'A global form opening already exists for this requirement'
        );
      }
    }
  }
);

// ============================================================
// 6. REVISION DEADLINE REMINDER (Scheduled Function)
// ============================================================
export const checkRevisionDeadlines = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingRevisions = await db.collection('revisionItems')
      .where('status', '==', 'open')
      .where('dueDate', '<=', tomorrow)
      .get();
    
    // Send notifications for upcoming deadlines
    for (const doc of upcomingRevisions.docs) {
      const revision = doc.data();
      
      // Find group leader
      const groupDoc = await db.collection('groups').doc(revision.groupId).get();
      const groupData = groupDoc.data();
      
      if (groupData?.leaderId) {
        await db.collection('notifications').add({
          userId: groupData.leaderId,
          type: 'deadline_reminder',
          title: 'Revision Deadline Approaching',
          message: `Revision "${revision.description}" is due soon`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    console.log(`Checked deadlines for ${upcomingRevisions.size} revisions`);
  });

// ============================================================
// 7. GROUP DELETION CASCADE
// ============================================================
export const cleanupGroupData = onDocumentDeleted(
  'groups/{groupId}',
  async (event) => {
    const groupId = event.params.groupId;
    
    // Cascade delete related data
    const batch = db.batch();
    
    // Delete submissions
    const submissions = await db.collection('submissions')
      .where('groupId', '==', groupId)
      .get();
    
    submissions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete defenses
    const defenses = await db.collection('defenses')
      .where('groupId', '==', groupId)
      .get();
    
    defenses.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete revision items
    const revisions = await db.collection('revisionItems')
      .where('groupId', '==', groupId)
      .get();
    
    revisions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit batch
    await batch.commit();
    
    console.log(`Cleaned up data for deleted group: ${groupId}`);
  }
);
