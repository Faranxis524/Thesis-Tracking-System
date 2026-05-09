// Teacher Dashboard - src/app/(teacher)/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';

export const dynamic = 'force-dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, CheckCircle, Clock, AlertCircle, FileText, MessageSquare, GraduationCap } from 'lucide-react';
import { collection, doc, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import type { ResearchGroup } from '@/types/firestore';

interface SubmissionItem {
  id: string;
  groupId: string;
  requirementId: string;
  driveUrl: string;
  status: 'missing' | 'submitted' | 'approved' | 'needs_revision' | 'resubmitted';
  submittedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  leaderComment?: string | null;
  groupTitle?: string;
  studentName?: string;
}

export default function TeacherDashboard() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [groups, setGroups] = useState<ResearchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<Record<string, unknown>[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [groupTitleDrafts, setGroupTitleDrafts] = useState<Record<string, string>>({});
  const [leaderNames, setLeaderNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (userProfile && userProfile?.role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }
    if (!user) return;

    const unsubscribeGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ResearchGroup[];
        setGroups(groupsData);
      }
    );

    const unsubscribeRequirements = onSnapshot(
      collection(db, 'requirements'),
      (snapshot) => {
        const requirementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequirements(requirementsData);
      }
    );

    const unsubscribeSubmissions = onSnapshot(
      collection(db, 'submissions'),
      (snapshot) => {
        const submissionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SubmissionItem));
        setSubmissions(submissionsData);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeGroups();
      unsubscribeRequirements();
      unsubscribeSubmissions();
    };
  }, [user, userProfile, router]);

  useEffect(() => {
    const uniqueLeaderIds = Array.from(new Set(groups.map((group) => String(group.leaderId ?? '')).filter(Boolean)));
    const unsubscribers = uniqueLeaderIds.map((leaderId) => {
      return onSnapshot(doc(db, 'users', leaderId), (snap) => {
        const data = snap.data() as { displayName?: string | null } | undefined;
        setLeaderNames((prev) => ({
          ...prev,
          [leaderId]: data?.displayName?.trim() || leaderId
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [groups]);

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const revisionCount = submissions.filter(s => s.status === 'needs_revision').length;

  const getStatusBadge = (status: SubmissionItem['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'needs_revision':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Revision Needed</Badge>;
      case 'submitted':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'resubmitted':
        return <Badge variant="outline">Resubmitted</Badge>;
      default:
        return <Badge variant="outline">Missing</Badge>;
    }
  };

  const handleApprove = async (submissionId: string) => {
    await updateDoc(doc(db, 'submissions', submissionId), {
      status: 'approved' as const,
      reviewedAt: Timestamp.now(),
      reviewedBy: user?.uid ?? null,
      remarks: reviewNotes[submissionId] ?? null
    });
  };

  const handleRequestRevision = async (submissionId: string) => {
    await updateDoc(doc(db, 'submissions', submissionId), {
      status: 'needs_revision' as const,
      reviewedAt: Timestamp.now(),
      reviewedBy: user?.uid ?? null,
      remarks: reviewNotes[submissionId] ?? null
    });
  };

  const requirementLookup = requirements.reduce<Record<string, Record<string, unknown>>>((acc, req) => {
    const id = String((req as Record<string, unknown>).id ?? "");
    if (id) acc[id] = req;
    return acc;
  }, {});

  const groupingRequirementId = useMemo(() => {
    const groupingReq = requirements.find((req) => (req.code as string | undefined) === 'PNC:PRE-FO-64/65');
    return String(groupingReq?.id ?? '');
  }, [requirements]);

  const approvedGroupingGroupIds = useMemo(() => {
    if (!groupingRequirementId) return new Set<string>();
    return new Set(
      submissions
        .filter((sub) => sub.requirementId === groupingRequirementId && sub.status === 'approved')
        .map((sub) => sub.groupId)
    );
  }, [groupingRequirementId, submissions]);

  const approvedGroups = useMemo(() => {
    return groups.filter((group) => approvedGroupingGroupIds.has(group.id || ''));
  }, [approvedGroupingGroupIds, groups]);

  const saveGroupTitle = async (groupId: string) => {
    const nextTitle = groupTitleDrafts[groupId]?.trim();
    if (!nextTitle) return;

    await updateDoc(doc(db, 'groups', groupId), {
      title: nextTitle,
      updatedAt: Timestamp.now()
    });

    setGroupTitleDrafts((prev) => ({ ...prev, [groupId]: nextTitle }));
  };


  const getCreatedAtMillis = (group: ResearchGroup | Record<string, unknown>) => {
    const createdAt = group.createdAt as { toMillis?: () => number } | undefined;
    return createdAt?.toMillis?.() ?? 0;
  };

  const groupLabelLookup = groups
    .slice()
    .sort((a, b) => getCreatedAtMillis(a) - getCreatedAtMillis(b))
    .reduce<Record<string, string>>((acc, group, index) => {
      const id = String(group.id ?? "");
      if (id) acc[id] = `Group ${index + 1}`;
      return acc;
    }, {});

  const getGroupDisplayLabel = (group: ResearchGroup) => {
    return group.title || groupLabelLookup[group.id || ''] || 'Group';
  };

  const getLeaderDisplayName = (group: ResearchGroup) => {
    return leaderNames[String(group.leaderId ?? '')] || 'Leader';
  };

  const groupLeaderByGroupId = useMemo(() => {
    return groups.reduce<Record<string, string>>((acc, group) => {
      const groupId = String(group.id ?? '');
      if (!groupId) return acc;
      acc[groupId] = getLeaderDisplayName(group);
      return acc;
    }, {});
  }, [groups, leaderNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Teacher Dashboard</h1>
                <p className="text-sm text-slate-500">Review submissions and manage defenses</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{groups.length} Active Groups</Badge>
              <span className="text-sm text-slate-600">{userProfile?.displayName}</span>
              <Button variant="ghost" size="sm" onClick={() => router.push('/profile')}>
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/institutions')}>
                Manage Institutions
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/requirements')}>
                Requirements & Scheduling
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Groups</p>
                  <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Including pending</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Users className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending Review</p>
                  <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Approved</p>
                  <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Needs Revision</p>
                  <p className="text-2xl font-bold text-red-600">{revisionCount}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md mb-8">
          <CardHeader>
            <CardTitle>Approved Group Naming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              After the PNC:PRE-FO-64/65 grouping form is approved, assign a clear label like Group 1 or Group 2.
            </p>
            {approvedGroups.length === 0 ? (
              <p className="text-sm text-slate-500">No approved groupings yet.</p>
            ) : (
              <div className="space-y-3">
                {approvedGroups.map((group, index) => {
                  const groupId = String(group.id ?? '');
                  return (
                    <div key={groupId} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => router.push(`/teacher/group/${groupId}`)}
                        className="text-left hover:opacity-75 transition-opacity"
                      >
                        <div className="text-sm font-semibold text-slate-900 hover:text-emerald-600 underline">
                          {group.title || `Group ${index + 1}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          Leader: {getLeaderDisplayName(group)}
                        </div>
                      </button>
                      <div className="flex w-full gap-2 sm:max-w-md">
                        <Input
                          value={groupTitleDrafts[groupId] ?? group.title ?? `Group ${index + 1}`}
                          onChange={(e) => setGroupTitleDrafts((prev) => ({ ...prev, [groupId]: e.target.value }))}
                        />
                        <Button variant="outline" onClick={() => saveGroupTitle(groupId)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Submissions Pending Review
              {pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingCount === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No submissions pending review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.filter(s => s.status === 'submitted').map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div>
                      <h4 className="font-medium text-slate-900">
                        {sub.groupTitle || groupLabelLookup[sub.groupId] || 'Untitled Group'}
                      </h4>
                      <p className="text-sm text-slate-500">
                        Submitted: {sub.submittedAt ? format(sub.submittedAt.toDate(), 'MMM d, yyyy h:mm a') : 'Unknown'}
                      </p>
                       <p className="text-sm text-slate-400">
                         Requirement: {(() => {
                           const req = requirementLookup[sub.requirementId] as { code?: string; name: string } | undefined;
                           if (!req) return sub.requirementId;
                           return req.code ? `${req.code} - ${req.name}` : req.name;
                         })()}
                       </p>
                      <p className="text-sm text-emerald-700">
                        <a href={sub.driveUrl} target="_blank" rel="noreferrer">View Drive Link</a>
                      </p>
                      {sub.leaderComment && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-medium text-slate-700">Leader note:</span> {sub.leaderComment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Comment (optional)"
                        value={reviewNotes[sub.id] ?? ''}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        className="max-w-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleRequestRevision(sub.id)}>
                        Request Revision
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(sub.id)}>Approve</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions.slice(0, 5).map((sub) => {
                const requirement = requirements.find(r => r.id === sub.requirementId);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusBadge(sub.status)}
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">
                          {sub.groupTitle || groupLabelLookup[sub.groupId] || sub.groupId || 'Group'}
                          {requirement && ` - ${requirement.code || requirement.name}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sub.status === 'approved' && 'Approved'}
                          {sub.status === 'submitted' && 'Submitted for review'}
                          {sub.status === 'needs_revision' && 'Revision requested'}
                          {sub.status === 'resubmitted' && 'Resubmitted after revision'}
                          {sub.status === 'missing' && 'Missing'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Leader: {groupLeaderByGroupId[sub.groupId] || 'Leader'}</div>
                      <div className="text-xs text-slate-400">
                        {sub.reviewedAt ? format(sub.reviewedAt.toDate(), 'MMM d') : 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}