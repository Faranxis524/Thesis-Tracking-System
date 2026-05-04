// Leader Dashboard - src/app/(leader)/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDefenseFlowStore } from '@/store/defenseFlowStore';
import { DefenseFlow } from '@/components/DefenseFlow/DefenseFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, Calendar, Settings, GraduationCap } from 'lucide-react';
import { queries } from '@/lib/firestore/collections';
import { onSnapshot } from 'firebase/firestore';

export default function LeaderDashboard() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();
  const { fetchGroup } = useDefenseFlowStore();
  
  const [groups, setGroups] = useState<Record<string, unknown>[]>([]);
  const [submissions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const groupLabel = groups.length > 0 ? `Group 1` : null;

  useEffect(() => {
    // If user is null, redirect to login
    if (user === null) {
      router.push('/login');
      return;
    }

    // If userProfile exists and role is wrong, redirect to unauthorized
    if (userProfile && userProfile?.role !== 'leader') {
      router.push('/unauthorized');
      return;
    }

    // If user exists but profile hasn't loaded yet, wait
    // Don't do anything - let the profile load

    // Only proceed with fetching data if user exists
    if (!user) return;

    // Fetch leader's groups
    const unsubscribeGroups = onSnapshot(
      queries.groupsByLeader(user.uid),
      (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGroups(groupsData);
        setLoading(false);
      }
    );

    return () => unsubscribeGroups();
  }, [user, userProfile, router]);

  useEffect(() => {
    if (groups.length > 0) {
      const groupId = groups[0].id;
      fetchGroup(groupId);
    }
  }, [groups, fetchGroup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Leader Dashboard</h1>
                <p className="text-sm text-slate-500">
                  Manage your research progress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {groupLabel && (
                <span className="text-sm font-medium text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                  {groupLabel}
                </span>
              )}
              <span className="text-sm text-slate-600">
                Welcome, {userProfile?.displayName}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-slate-600">Submissions</p>
                   <p className="text-2xl font-bold text-slate-900">{submissions.length}</p>
                 </div>
                 <div className="p-3 bg-emerald-100 rounded-xl">
                   <FileText className="w-6 h-6 text-emerald-700" />
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-slate-600">My Groups</p>
                   <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
                 </div>
                 <div className="p-3 bg-emerald-100 rounded-xl">
                   <Users className="w-6 h-6 text-emerald-600" />
                 </div>
               </div>
             </CardContent>
           </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Defenses</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Settings</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/profile')}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl">
                  <Settings className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defense Flow */}
        {groups.length > 0 && (
          <Card className="mb-8 border-0 shadow-md">
            <CardHeader>
              <CardTitle>Research Defense Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <DefenseFlow groupId={groups[0].id} />
            </CardContent>
          </Card>
        )}

        {/* Create New Group Section */}
        {groups.length === 0 && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                <Plus className="w-10 h-10 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Research Groups Yet
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Create a new research group to get started with your thesis journey.
              </p>
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Research Group
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
