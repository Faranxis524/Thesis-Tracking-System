# Firebase Architecture Guide

## Overview
This document describes the Firebase-based architecture for the Thesis Tracker System.

## Architecture Changes

### Database
- **Firestore (NoSQL)** with Security Rules

### Authentication
- **Firebase Auth** with custom claims
- **Roles**: `leader`, `teacher`

### Backend Logic
- **Cloud Functions** for server-side workflows

### Frontend
- **Firebase modular SDK** for client operations

## Firestore Schema

### Collections

#### 1. `users/{userId}`
```typescript
{
  email: string;
  displayName: string | null;
  role: 'leader' | 'teacher';
  termId?: string;
  collegeId?: string;
  sectionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `terms/{termId}`
```typescript
{
  name: string;
  startsOn: Timestamp;
  endsOn: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}
```

#### 3. `colleges/{collegeId}`
```typescript
{
  name: string;
  createdAt: Timestamp;
}
```

#### 4. `sections/{sectionId}`
```typescript
{
  termId: string; // ref -> terms
  collegeId: string; // ref -> colleges
  program: string;
  name: string;
  createdAt: Timestamp;
}
```

#### 5. `groups/{groupId}`
```typescript
{
  leaderId: string; // ref -> users
  termId: string; // ref -> terms
  sectionId: string; // ref -> sections
  title: string | null;
  adviserName: string | null;
  stage: 'title' | 'proposal' | 'final';
  status: 'pending' | 'active';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6. `groupMembers/{groupId}/members/{userId}`
```typescript
{
  groupId: string; // ref -> groups
  userId: string; // ref -> users
  role: 'leader' | 'member';
  joinedAt: Timestamp;
}
```

#### 7. `requirements/{reqId}`
```typescript
{
  stage: 'title' | 'proposal' | 'final';
  timing: 'before' | 'after';
  owner: 'student' | 'teacher';
  code: string | null;
  name: string;
  isOptional: boolean;
  category: 'grouping_unlock' | 'advising_unlock' | 'title_unlock' | null;
  createdAt: Timestamp;
}
```

#### 8. `submissions/{subId}`
```typescript
{
  groupId: string; // ref -> groups
  requirementId: string; // ref -> requirements
  driveUrl: string;
  status: 'missing' | 'submitted' | 'approved' | 'needs_revision' | 'resubmitted';
  remarks: string | null;
  submittedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null; // ref -> users
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 9. `defenses/{defenseId}`
```typescript
{
  groupId: string; // ref -> groups
  stage: 'title' | 'proposal' | 'final';
  scheduledAt: Timestamp;
  meetLink: string | null;
  status: 'scheduled' | 'done' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 10. `formOpenings/{openingId}`
```typescript
{
  requirementId: string; // ref -> requirements
  termId: string | null; // ref -> terms
  collegeId: string | null; // ref -> colleges
  sectionId: string | null; // ref -> sections
  deadlineAt: Timestamp | null;
  isOpen: boolean;
  createdBy: string; // ref -> users
  createdAt: Timestamp;
}
```

#### 11. `auditLogs/{logId}`
```typescript
{
  actorId: string; // ref -> users
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, any>;
  createdAt: Timestamp;
}
```

#### 12. `revisionItems/{itemId}`
```typescript
{
  groupId: string; // ref -> groups
  stage: 'proposal' | 'final';
  description: string;
  dueDate: Timestamp;
  status: 'open' | 'submitted' | 'accepted';
  evidenceUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Cloud Functions

### 1. `enforceMemberLimit`
- Triggers on new member creation
- Enforces max 4 members per group
- Deletes excess members and logs violation

### 2. `autoAdvanceGroupStage`
- Triggers on defense update
- Auto-advances group stage when defense marked 'done'
- Sends notification to group leader

### 3. `auditSubmissionChange`
- Triggers on submission update
- Logs all status changes
- Notifies leader on approval/rejection

### 4. `onUserCreate`
- Triggers on new user signup
- Creates user profile in Firestore
- Sets custom claims for role-based access

### 5. `validateFormOpening`
- Triggers on new form opening
- Prevents duplicate global openings
- Validates scope conflicts

### 6. `checkRevisionDeadlines` (Scheduled)
- Runs daily at midnight
- Checks for upcoming revision deadlines
- Sends reminder notifications

### 7. `cleanupGroupData`
- Triggers on group deletion
- Cascade deletes related data
- Maintains data integrity

## Security Rules Highlights

### Leader Permissions
- Read/write own profile
- Create/update own group
- Update group title and adviser name
- Create/update submissions for own group
- View own submissions and defenses

### Teacher Permissions
- Full CRUD on all collections except users
- Approve/review submissions
- Schedule defenses
- Manage terms, colleges, sections
- View all groups and submissions
- Read audit logs

## Migration Steps

### Phase 1: Setup (Week 1)
1. Create Firebase project
2. Enable Firestore, Auth, Functions
3. Set up billing
4. Configure email templates
5. Deploy security rules

### Phase 2: Data Models (Week 2)
1. Create collections with indexes
2. Define TypeScript interfaces
3. Set up Firestore SDK
4. Create query helpers

### Phase 3: Authentication (Week 2-3)
1. Configure Firebase Auth providers
2. Set up custom claims
3. Implement auth context
4. Create login/register pages

### Phase 4: Core Features (Week 3-4)
1. Implement defense flow
2. Build submission system
3. Create teacher dashboard
4. Build leader dashboard

### Phase 5: Business Logic (Week 4-5)
1. Deploy Cloud Functions
2. Test member limits
3. Test stage auto-advance
4. Test audit logging

### Phase 6: Migration (Week 6)
1. Run migration script
2. Verify data integrity
3. Test all features
4. Deploy to production

## Setting Up Locally

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Firebase Emulators
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulators
firebase emulators:start
```

### 3. Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. Run Development Server
```bash
npm run dev
```

## Deployment

### Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Hosting
```bash
firebase deploy --only hosting
```

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Monitoring

### Firebase Console
- Functions logs and metrics
- Firestore usage and performance
- Auth monitoring

### Error Tracking
- Sentry integration (optional)
- Custom error logging to Firestore

## Rollback Plan

### If Deployment Fails
1. Maintain database snapshots
2. Verify each data batch before proceeding
3. Maintain the ability to restore from backups

### Data Backup
```bash
# Export Firestore data
firebase firestore:export gs://your-bucket/backup

# Export Storage files
gsutil -m cp -r gs://your-bucket gs://your-backup-bucket
```

## Performance Optimization

### Indexes
Create composite indexes in `firestore.indexes.json`:
- `submissions`: groupId + status
- `defenses`: groupId + scheduledAt
- `formOpenings`: isOpen + termId

### Caching
- Use Firestore persistence
- Implement local cache with Zustand
- Cache frequently accessed data

### Batch Operations
- Use `writeBatch` for bulk updates
- Limit query results with pagination
- Use `getDocs` instead of real-time listeners where appropriate

## Cost Estimation

### Firestore
- 50K reads/day
- 10K writes/day
- 5K deletes/day
- Estimated: $0.18/day

### Functions
- 2M invocations/month
- 400K GB-seconds/month
- Estimated: $5/month

### Auth
- 10K MAU
- Estimated: Free tier sufficient

**Total Estimated: ~$150/month**

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Auth](https://firebase.google.com/docs/auth)

## Support

For issues or questions:
- Check Firebase documentation
- Review Cloud Functions logs
- Check browser console for errors
- Verify security rules are deployed
