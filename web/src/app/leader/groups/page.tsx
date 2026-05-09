'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, CheckCircle2, Clock } from 'lucide-react';
import { queries } from '@/lib/firestore/collections';
import { onSnapshot } from 'firebase/firestore';
import type { ResearchGroup } from '@/types/firestore';

export const dynamic = 'force-dynamic';

type GroupStatus = 'all' | 'pending' | 'active';

export default function LeaderGroupsPage() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<(ResearchGroup & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GroupStatus>('all');

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (userProfile && userProfile?.role !== 'leader') {
      router.push('/unauthorized');
      return;
    }
    if (!user) return;

    const unsubscribeGroups = onSnapshot(
      queries.groupsByLeader(user.uid),
      (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (ResearchGroup & { id: string })[];
        setGroups(groupsData.sort((a, b) => {
          const aTime = (a.createdAt as any)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as any)?.toMillis?.() ?? 0;
          return aTime - bTime;
        }));
        setLoading(false);
      }
    );

    return () => unsubscribeGroups();
  }, [user, userProfile, router]);

  const filteredGroups = groups.filter(group => {
    if (statusFilter === 'all') return true;
    return group.status === statusFilter;
  });

  const pendingCount = groups.filter(g => g.status === 'pending').length;
  const activeCount = groups.filter(g => g.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push('/leader/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Research Groups</h1>
              <p className="text-slate-500 mt-1">Manage and view all your research groups</p>
            </div>
            <Button onClick={() => router.push('/leader/dashboard')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Group
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            All ({groups.length})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
          >
            Approved ({activeCount})
          </Button>
        </div>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="text-slate-600">
                {statusFilter === 'all' && 'No groups found. Create your first research group!'}
                {statusFilter === 'pending' && 'No pending groups.'}
                {statusFilter === 'active' && 'No approved groups yet.'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group, index) => (
              <Card key={group.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {group.name || `Group ${index + 1}`}
                        </h3>
                        <Badge variant={group.status === 'active' ? 'default' : 'outline'} className="gap-1">
                          {group.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Research Title: {group.title || 'Not submitted'}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase">Stage</p>
                          <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{group.stage}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase">Adviser</p>
                          <p className="text-sm font-semibold text-slate-900 mt-1">{group.adviserName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase">Created</p>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            {group.createdAt?.toDate?.().toLocaleDateString?.() || 'Recently'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase">Status</p>
                          <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{group.status}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/leader/group-settings')}
                      className="ml-4"
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
