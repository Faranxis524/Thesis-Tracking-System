// Firestore Type Definitions - src/types/firestore.ts
import { Timestamp, DocumentData } from 'firebase/firestore';

// Base document with timestamps
export interface BaseDocument {
  id?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User Profile
export interface UserProfile extends BaseDocument {
  email: string;
  displayName: string | null;
  role: 'leader' | 'teacher';
  termId?: string;
  departmentId?: string;
  sectionId?: string;
}

// Academic Term
export interface Term extends BaseDocument {
  name: string;
  startsOn: Timestamp;
  endsOn: Timestamp;
  isActive: boolean;
}

// Department
export interface Department extends BaseDocument {
  name: string;
}

// Section
export interface Section extends BaseDocument {
  termId: string;
  departmentId: string;
  name: string;
}

// Research Group
export interface ResearchGroup extends BaseDocument {
  leaderId: string;
  termId: string;
  departmentId?: string;
  sectionId: string;
  title: string | null;
  adviserName: string | null;
  stage: 'title' | 'proposal' | 'final';
  status: 'pending' | 'active';
}

// Group Member
export interface GroupMember extends BaseDocument {
  groupId: string;
  userId: string;
  role: 'leader' | 'member';
  displayName?: string | null;
  joinedAt: Timestamp;
}

// Requirement
export interface Requirement extends BaseDocument {
  stage: 'title' | 'proposal' | 'final';
  timing: 'before' | 'after';
  owner: 'leader' | 'teacher';
  code: string | null;
  name: string;
  isOptional: boolean;
  category?: 'grouping_unlock' | 'advising_unlock' | 'title_unlock' | null;
}

// Submission
export interface Submission extends BaseDocument {
  groupId: string;
  requirementId: string;
  driveUrl: string;
  status: 'missing' | 'submitted' | 'approved' | 'needs_revision' | 'resubmitted';
  remarks: string | null;
  leaderComment?: string | null;
  submittedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
}

// Defense
export interface Defense extends BaseDocument {
  groupId: string;
  stage: 'title' | 'proposal' | 'final';
  scheduledAt: Timestamp;
  meetLink: string | null;
  status: 'scheduled' | 'done' | 'cancelled';
  notes?: string | null;
}

// Form Opening
export interface FormOpening extends BaseDocument {
  requirementId: string;
  termId: string | null;
  departmentId: string | null;
  sectionId: string | null;
  scopeType?: 'section' | 'group';
  groupIds?: string[];
  deadlineAt: Timestamp | null;
  isOpen: boolean;
  createdBy: string;
}

// Audit Log
export interface AuditLog extends BaseDocument {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, any>;
}

// Revision Item
export interface RevisionItem extends BaseDocument {
  groupId: string;
  stage: 'proposal' | 'final';
  description: string;
  dueDate: Timestamp;
  status: 'open' | 'submitted' | 'accepted';
  evidenceUrl: string | null;
}

// Helper type converter - Firestore Timestamp to Date
export const timestampToDate = (timestamp: Timestamp | null): Date | null => {
  return timestamp ? timestamp.toDate() : null;
};

export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Firestore data converter for type safety
export const createConverter = <T>() => ({
  toFirestore: (data: Partial<T>) => {
    const result: Record<string, any> = { ...data };
    if (result.createdAt instanceof Date) {
      result.createdAt = Timestamp.fromDate(result.createdAt);
    }
    if (result.updatedAt instanceof Date) {
      result.updatedAt = Timestamp.fromDate(result.updatedAt);
    }
    return result;
  },
  fromFirestore: (snapshot: DocumentData) => {
    return snapshot as T;
  }
});
