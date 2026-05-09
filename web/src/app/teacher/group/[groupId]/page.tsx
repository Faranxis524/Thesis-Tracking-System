// Teacher Group View - src/app/teacher/group/[groupId]/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, FileText, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { collection, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import type { ResearchGroup, GroupMember, Submission, Requirement } from '@/types/firestore';

export const dynamic = 'force-dynamic';

interface GroupMemberDisplay extends GroupMember {
  id: string;
}

interface SubmissionDisplay extends Submission {
  id: string;
  requirementName?: string;
}

export default function TeacherGroupViewPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  
  const [group, setGroup] = useState<ResearchGroup & { id: string } | null>(null);
  const [members, setMembers] = useState<GroupMemberDisplay[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDisplay[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [leaderName, setLeaderName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth checks
  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (userProfile && userProfile?.role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }
  }, [user, userProfile, router]);

  // Fetch group info
  useEffect(() => {
    if (!groupId) return;

    const unsubGroup = onSnapshot(
      doc(db, 'groups', groupId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ResearchGroup;
          setGroup({ id: snap.id, ...data });
        } else {
          setError('Group not found');
        }
      },
      (err) => {
        console.error('Error fetching group:', err);
        setError('Failed to load group');
      }
    );

    return () => unsubGroup();
  }, [groupId]);

  // Fetch group members
  useEffect(() => {
    if (!groupId) return;

    const unsubMembers = onSnapshot(
      collection(db, `groups/${groupId}/members`),
      (snap) => {
        const membersData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GroupMemberDisplay[];
        setMembers(membersData.sort((a, b) => {
          if (a.role === 'leader') return -1;
          if (b.role === 'leader') return 1;
          return 0;
        }));
        setLoading(false);
      }
    );

    return () => unsubMembers();
  }, [groupId]);

  // Fetch leader info
  useEffect(() => {
    if (!group?.leaderId) return;

    const unsubLeader = onSnapshot(
      doc(db, 'users', group.leaderId),
      (snap) => {
        const data = snap.data() as { displayName?: string } | undefined;
        setLeaderName(data?.displayName || group.leaderId);
      }
    );

    return () => unsubLeader();
  }, [group?.leaderId]);

  // Fetch submissions
  useEffect(() => {
    if (!groupId) return;

    const unsubSubmissions = onSnapshot(
      collection(db, 'submissions'),
      (snap) => {
        const submissionsData = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as SubmissionDisplay))
          .filter(sub => sub.groupId === groupId);
        setSubmissions(submissionsData);
      }
    );

    return () => unsubSubmissions();
  }, [groupId]);

  // Fetch requirements for reference
  useEffect(() => {
    const unsubRequirements = onSnapshot(
      collection(db, 'requirements'),
      (snap) => {
        const reqs = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Requirement[];
        setRequirements(reqs);
      }
    );

    return () => unsubRequirements();
  }, []);

  // Build requirement lookup
  const requirementLookup = requirements.reduce((acc, req) => {
    acc[req.id || ''] = req;
    return acc;
  }, {} as Record<string, Requirement>);

  const getStatusBadge = (status: Submission['status']) => {
    const configs: Record<Submission['status'], { color: string; label: string; icon: typeof CheckCircle2 }> = {
      approved: { color: 'bg-emerald-100 text-emerald-800', label: 'Approved', icon: CheckCircle2 },
      submitted: { color: 'bg-blue-100 text-blue-800', label: 'Submitted', icon: Clock },
      needs_revision: { color: 'bg-red-100 text-red-800', label: 'Needs Revision', icon: AlertTriangle },
      resubmitted: { color: 'bg-purple-100 text-purple-800', label: 'Resubmitted', icon: Clock },
      missing: { color: 'bg-slate-100 text-slate-800', label: 'Missing', icon: AlertCircle }
    };
    const config = configs[status];
    return (
      <Badge className={config.color}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.push('/teacher/dashboard')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="border-0 shadow-md border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-slate-600">{error || 'Group not found'}</p>
              <Button className="mt-6" onClick={() => router.push('/teacher/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const approvedSubmissions = submissions.filter(s => s.status === 'approved').length;
  const totalRequired = submissions.length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/teacher/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{group.title || 'Research Group'}</h1>
              <p className="text-slate-500 mt-1">Group ID: {group.id}</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Stage: {group.stage?.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Members</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{members.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Submissions</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{totalRequired}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Approved</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{approvedSubmissions}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Progress</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {totalRequired > 0 ? Math.round((approvedSubmissions / totalRequired) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Group Information */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Group Leader</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">{leaderName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Research Adviser</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  {group.adviserName || 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Research Title</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  {group.title ? `${group.title}` : 'Not submitted'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Current Stage</p>
                <p className="text-lg font-semibold text-slate-900 mt-2 capitalize">{group.stage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Members */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Group Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {member.displayName || member.userId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Joined {member.joinedAt?.toDate?.().toLocaleDateString?.() || 'recently'}
                    </p>
                  </div>
                  <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-500">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => {
                  const requirement = requirementLookup[submission.requirementId || ''];
                  return (
                    <div
                      key={submission.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {requirement?.code ? `${requirement.code} - ` : ''}
                          {requirement?.name || 'Unknown requirement'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                          {submission.submittedAt && (
                            <span>
                              Submitted: {format(submission.submittedAt.toDate(), 'MMM d, yyyy')}
                            </span>
                          )}
                          {submission.reviewedAt && (
                            <span>
                              Reviewed: {format(submission.reviewedAt.toDate(), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(submission.status)}
                        {submission.driveUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(submission.driveUrl, '_blank')}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
