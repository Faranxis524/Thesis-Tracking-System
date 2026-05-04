// Firestore Collections & Hooks - src/lib/firestore/collections.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query
} from 'firebase/firestore';
import { db } from '../firebase';

export { db } from '../firebase';
import type {
  UserProfile,
  Term,
  Department,
  Section,
  ResearchGroup,
  GroupMember,
  Requirement,
  Submission,
  Defense,
  FormOpening,
  AuditLog,
  RevisionItem
} from '@/types/firestore';

// Collection References (lazy to avoid SSR/runtime initialization issues)
export const collections = {
  users: () => collection(db, 'users') as CollectionReference<UserProfile>,
  terms: () => collection(db, 'terms') as CollectionReference<Term>,
  departments: () => collection(db, 'departments') as CollectionReference<Department>,
  sections: () => collection(db, 'sections') as CollectionReference<Section>,
  groups: () => collection(db, 'groups') as CollectionReference<ResearchGroup>,
  groupMembers: (groupId: string) => 
    collection(db, `groups/${groupId}/members`) as CollectionReference<GroupMember>,
  requirements: () => collection(db, 'requirements') as CollectionReference<Requirement>,
  submissions: () => collection(db, 'submissions') as CollectionReference<Submission>,
  defenses: () => collection(db, 'defenses') as CollectionReference<Defense>,
  formOpenings: () => collection(db, 'formOpenings') as CollectionReference<FormOpening>,
  auditLogs: () => collection(db, 'auditLogs') as CollectionReference<AuditLog>,
  revisionItems: () => collection(db, 'revisionItems') as CollectionReference<RevisionItem>
};

// Collection queries - lazy functions that fetch docs when called
export const queries = {
  terms: () => query(collections.terms()) as Query<Term>,
  departments: () => query(collections.departments()) as Query<Department>,
  sections: () => query(collections.sections()) as Query<Section>,

  // User queries
  userByEmail: (email: string) => 
    query(collections.users(), where('email', '==', email)) as Query<UserProfile>,
  
  // Group queries
  groupsByLeader: (leaderId: string) =>
    query(collections.groups(), where('leaderId', '==', leaderId)) as Query<ResearchGroup>,
  
  groupsBySection: (sectionId: string) =>
    query(collections.groups(), where('sectionId', '==', sectionId)) as Query<ResearchGroup>,
  
  // Member queries
  membersByGroup: (groupId: string) =>
    query(collections.groupMembers(groupId)) as Query<GroupMember>,
  
  // Submission queries
  submissionsByGroup: (groupId: string) =>
    query(collections.submissions(), where('groupId', '==', groupId)) as Query<Submission>,
  
  submissionsByGroupAndStatus: (groupId: string, status: Submission['status']) =>
    query(
      collections.submissions(),
      where('groupId', '==', groupId),
      where('status', '==', status)
    ) as Query<Submission>,
  
  // Requirement queries
  requirementsByStage: (stage: Requirement['stage']) =>
    query(collections.requirements(), where('stage', '==', stage)) as Query<Requirement>,
  
  // Defense queries
  defensesByGroup: (groupId: string) =>
    query(collections.defenses(), where('groupId', '==', groupId)) as Query<Defense>,
  
  defensesByGroupAndStage: (groupId: string, stage: Defense['stage']) =>
    query(
      collections.defenses(),
      where('groupId', '==', groupId),
      where('stage', '==', stage)
    ) as Query<Defense>,
  
  // Form opening queries
  openFormOpenings: () =>
    query(collections.formOpenings(), where('isOpen', '==', true)) as Query<FormOpening>,
  
  formOpeningsByTerm: (termId: string) =>
    query(
      collections.formOpenings(),
      where('termId', '==', termId),
      where('isOpen', '==', true)
    ) as Query<FormOpening>,
  
  // Audit log queries
  auditLogsByUser: (userId: string) =>
    query(collections.auditLogs(), where('actorId', '==', userId)) as Query<AuditLog>
};

// Document References
export const documents = {
  user: (userId: string) => doc(db, 'users', userId) as DocumentReference<UserProfile>,
  term: (termId: string) => doc(db, 'terms', termId) as DocumentReference<Term>,
  department: (departmentId: string) => doc(db, 'departments', departmentId) as DocumentReference<Department>,
  section: (sectionId: string) => doc(db, 'sections', sectionId) as DocumentReference<Section>,
  group: (groupId: string) => doc(db, 'groups', groupId) as DocumentReference<ResearchGroup>,
  groupMember: (groupId: string, userId: string) => 
    doc(db, `groups/${groupId}/members/${userId}`) as DocumentReference<GroupMember>,
  requirement: (reqId: string) => doc(db, 'requirements', reqId) as DocumentReference<Requirement>,
  submission: (subId: string) => doc(db, 'submissions', subId) as DocumentReference<Submission>,
  defense: (defenseId: string) => doc(db, 'defenses', defenseId) as DocumentReference<Defense>,
  formOpening: (openingId: string) => doc(db, 'formOpenings', openingId) as DocumentReference<FormOpening>,
  auditLog: (logId: string) => doc(db, 'auditLogs', logId) as DocumentReference<AuditLog>,
  revisionItem: (itemId: string) => doc(db, 'revisionItems', itemId) as DocumentReference<RevisionItem>
};

// Common Firestore operations
export const firestoreOps = {
  // Create or update document
  async set<T extends { createdAt?: any; updatedAt?: any }>(ref: DocumentReference<T>, data: Partial<T>) {
    const timestamp = Timestamp.now();
    await setDoc(ref, {
      ...data,
      updatedAt: timestamp,
      createdAt: (data as any).createdAt || timestamp
    } as T);
  },
  
  // Update document
  async update<T>(ref: DocumentReference<T>, data: Partial<T>) {
    await updateDoc(ref, {
      ...data,
      updatedAt: Timestamp.now()
    } as Partial<T>);
  },
  
  // Get document
  async get<T>(ref: DocumentReference<T>): Promise<T | null> {
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as T) : null;
  },
  
  // Delete document
  async delete(ref: DocumentReference<any>) {
    await deleteDoc(ref);
  }
};
