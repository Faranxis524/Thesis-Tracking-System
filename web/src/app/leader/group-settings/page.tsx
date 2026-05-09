// Leader Group Settings - src/app/leader/group-settings/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Save, Trash2, Plus, Edit2 } from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc, deleteDoc, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { queries } from '@/lib/firestore/collections';
import type { ResearchGroup, GroupMember } from '@/types/firestore';

export const dynamic = 'force-dynamic';

export default function GroupSettingsPage() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();
  
  const [groups, setGroups] = useState<ResearchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Group settings
  const [groupTitle, setGroupTitle] = useState('');
  const [adviserName, setAdviserName] = useState('');
  const [members, setMembers] = useState<(GroupMember & { id: string })[]>([]);
  const [saving, setSaving] = useState(false);
  
  // New member form
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  
  // Delete confirmation
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const group = groups.length > 0 ? groups[0] : null;
  const groupId = group?.id as string | undefined;
  const isTitleLocked = group?.stage === 'title';

  // Fetch leader's group
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
        })) as ResearchGroup[];
        setGroups(groupsData);
        
        if (groupsData.length > 0) {
          setGroupTitle(groupsData[0].title || '');
          setAdviserName(groupsData[0].adviserName || '');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching groups:', err);
        setError('Failed to load group');
        setLoading(false);
      }
    );

    return () => unsubscribeGroups();
  }, [user, userProfile, router]);

  // Fetch group members
  useEffect(() => {
    if (!groupId) return;

    const unsubscribeMembers = onSnapshot(
      collection(db, `groups/${groupId}/members`),
      (snapshot) => {
        const membersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (GroupMember & { id: string })[];
        setMembers(membersData.sort((a, b) => {
          if (a.role === 'leader') return -1;
          if (b.role === 'leader') return 1;
          return 0;
        }));
      }
    );

    return () => unsubscribeMembers();
  }, [groupId]);

  const handleSaveGroupSettings = async () => {
    if (!groupId || !group) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        title: groupTitle.trim() || null,
        adviserName: adviserName.trim() || null,
        updatedAt: Timestamp.now()
      });
      setError(null);
    } catch (err) {
      console.error('Error saving group settings:', err);
      setError('Failed to save group settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!groupId || !newMemberName.trim()) return;
    
    setAddingMember(true);
    try {
      await addDoc(collection(db, `groups/${groupId}/members`), {
        groupId,
        userId: 'manual',
        role: 'member',
        displayName: newMemberName.trim(),
        joinedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setNewMemberName('');
      setError(null);
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId) return;
    
    try {
      await deleteDoc(doc(db, `groups/${groupId}/members/${memberId}`));
      setDeletingMemberId(null);
      setError(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  const handleUpdateMemberName = async (memberId: string, newName: string) => {
    if (!groupId || !newName.trim()) return;
    
    try {
      await updateDoc(doc(db, `groups/${groupId}/members/${memberId}`), {
        displayName: newName.trim(),
        updatedAt: Timestamp.now()
      });
      setError(null);
    } catch (err) {
      console.error('Error updating member:', err);
      setError('Failed to update member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading group settings...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => router.push('/leader/dashboard')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No group found. Please create a group first.</p>
              <Button className="mt-6" onClick={() => router.push('/leader/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/leader/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Group Settings</h1>
          <p className="text-slate-500 mt-1">Manage your research group information and members</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Information */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name (Auto-generated)</Label>
              <Input
                id="groupName"
                placeholder="Group name"
                value={group?.name || `Group ${groups.findIndex(g => g.id === group?.id) + 1}`}
                disabled
                className="mt-2 bg-slate-100 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your group identifier (automatically assigned)
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="groupTitle">Research Title</Label>
                {isTitleLocked && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Locked (Stage: {group?.stage})
                  </span>
                )}
              </div>
              <Input
                id="groupTitle"
                placeholder="Enter your research title"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                disabled={isTitleLocked}
                className={`mt-2 ${isTitleLocked ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">
                {isTitleLocked 
                  ? '⚠️ Research title is locked until Title stage is approved.' 
                  : 'Research title is unlocked because Title stage is complete.'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="adviser">Research Adviser</Label>
                {isTitleLocked && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Locked (Stage: {group?.stage})
                  </span>
                )}
              </div>
              <Input
                id="adviser"
                placeholder="Enter adviser name"
                value={adviserName}
                onChange={(e) => setAdviserName(e.target.value)}
                disabled={isTitleLocked}
                className={`mt-2 ${isTitleLocked ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">
                {isTitleLocked 
                  ? '⚠️ Adviser name is locked until Title stage is approved.' 
                  : 'Adviser name is unlocked because Title stage is complete.'}
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveGroupSettings}
                disabled={saving || isTitleLocked}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Group Information'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Group Members */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Group Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Members List */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Current Members ({members.length})</h3>
              {members.length === 0 ? (
                <p className="text-sm text-slate-500">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {member.displayName || member.userId}
                          </p>
                          <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Joined {member.joinedAt?.toDate?.().toLocaleDateString?.() || 'recently'}
                        </p>
                      </div>
                      
                      {member.role !== 'leader' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newName = prompt('Edit member name:', member.displayName || '');
                              if (newName && newName !== member.displayName) {
                                handleUpdateMemberName(member.id, newName);
                              }
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletingMemberId(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Member */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-slate-900 mb-3">Add New Member</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddMember();
                  }}
                />
                <Button
                  onClick={handleAddMember}
                  disabled={addingMember || !newMemberName.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Maximum 4 members (plus you as leader = 5 total)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delete Member Confirmation */}
        {deletingMemberId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Remove Member?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to remove this member from your group? This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingMemberId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRemoveMember(deletingMemberId)}
                  >
                    Remove Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
