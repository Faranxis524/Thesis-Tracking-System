// Teacher Dashboard - src/app/(teacher)/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, CheckCircle, Clock, AlertCircle, FileText, MessageSquare, GraduationCap } from 'lucide-react';
import { collection, doc, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

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
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

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
        const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const requirementLookup = requirements.reduce<Record<string, any>>((acc, req) => {
    acc[req.id] = req;
    return acc;
  }, {});

  const groupLabelLookup = groups
    .slice()
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0))
    .reduce<Record<string, string>>((acc, group, index) => {
      acc[group.id] = `Group ${index + 1}`;
      return acc;
    }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Teacher Dashboard</h1>
                <p className="text-sm text-slate-500">Review submissions and manage defenses</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{groups.length} Active Groups</Badge>
              <span className="text-sm text-slate-600">{userProfile?.displayName}</span>
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
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
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
                        Requirement: {requirementLookup[sub.requirementId]?.code
                          ? `${requirementLookup[sub.requirementId].code} - ${requirementLookup[sub.requirementId].name}`
                          : requirementLookup[sub.requirementId]?.name || sub.requirementId}
                      </p>
                      <p className="text-sm text-blue-600">
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
              {submissions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(sub.status)}
                    <span className="text-sm text-slate-600">{sub.groupTitle || 'Unnamed Group'}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {sub.reviewedAt ? format(sub.reviewedAt.toDate(), 'MMM d') : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}