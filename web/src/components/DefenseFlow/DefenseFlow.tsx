// Defense Flow UI Components - src/components/DefenseFlow/DefenseFlow.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDefenseFlowStore } from '@/store/defenseFlowStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock, BookOpen, Trophy, FileText, MessageSquare, Edit, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { onSnapshot, addDoc, Timestamp, doc, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firestore/collections';

interface DefenseFlowProps {
  groupId: string;
}

const stages = [
  {
    key: 'title' as const,
    label: 'Title Approval',
    description: 'Submit research title and get committee approval',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  {
    key: 'proposal' as const,
    label: 'Proposal Defense',
    description: 'Present and defend your research proposal',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  {
    key: 'final' as const,
    label: 'Final Defense',
    description: 'Final presentation and thesis defense',
    icon: Trophy,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  }
];

export function DefenseFlow({ groupId }: DefenseFlowProps) {
  const {
    currentGroup,
    currentStage,
    loading,
    error,
    fetchGroup,
    updateStage
  } = useDefenseFlowStore();

  const [requirements, setRequirements] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [defenses, setDefenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [memberName, setMemberName] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [adviserDraft, setAdviserDraft] = useState('');
  const [driveLinks, setDriveLinks] = useState<Record<string, string>>({});
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [editingLinks, setEditingLinks] = useState<Record<string, boolean>>({});

  const groupDocId = currentGroup?.id ?? groupId;
  const stageKey = currentGroup?.stage ?? 'title';

  const stageRequirements = useMemo(() => {
    return requirements.filter((req) => req.stage === stageKey);
  }, [requirements, stageKey]);

  const beforeStageRequirements = useMemo(() => {
    return stageRequirements.filter((req) => req.timing === 'before');
  }, [stageRequirements]);

  const openRequirements = useMemo(() => {
    if (!currentGroup) return [];
    const now = new Date();
    return stageRequirements.filter((req) => {
      const relatedOpenings = openings.filter((opening) => opening.requirementId === req.id && opening.isOpen);
      return relatedOpenings.some((opening) => {
        const deadlineOk = !opening.deadlineAt || opening.deadlineAt.toDate() >= now;
        if (!deadlineOk) return false;

        if (opening.scopeType === 'group') {
          return (opening.groupIds || []).includes(groupDocId);
        }

        if (opening.sectionId) {
          return opening.sectionId === currentGroup.sectionId;
        }
        return true;
      });
    });
  }, [currentGroup, openings, stageRequirements]);

  const submissionsByRequirement = useMemo(() => {
    if (!currentGroup) return {} as Record<string, any>;
    return submissions
      .filter((sub) => sub.groupId === groupDocId)
      .reduce<Record<string, any>>((acc, sub) => {
        acc[sub.requirementId] = sub;
        return acc;
      }, {});
  }, [currentGroup, submissions, groupDocId]);

  const groupingReqId = requirements.find((req) => req.code === 'PNC:PRE-FO-64/65')?.id;
  const canEditMembers = groupingReqId
    ? submissionsByRequirement[groupingReqId]?.status === 'approved'
    : false;

  const adviserReqId = requirements.find((req) => req.code === 'PNC:PRE-FO-59')?.id;
  const canEditAdviser = adviserReqId
    ? submissionsByRequirement[adviserReqId]?.status === 'approved'
    : false;

  const titleDefenseApproved = defenses.some(
    (defense) => defense.groupId === groupDocId && defense.stage === 'title' && defense.status === 'done'
  );
  const canEditTitle = titleDefenseApproved;

  const currentDefenseDone = defenses.some(
    (defense) => defense.groupId === groupDocId && defense.stage === stageKey && defense.status === 'done'
  );

  const stageApproved = beforeStageRequirements.every((req) => {
    const submission = submissionsByRequirement[req.id];
    return submission?.status === 'approved';
  });

  const canAdvanceStage = stageApproved && currentDefenseDone;

  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId);
    }
  }, [groupId, fetchGroup]);

  useEffect(() => {
    const unsubRequirements = onSnapshot(collection(db, 'requirements'), (snap) => {
      setRequirements(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubOpenings = onSnapshot(collection(db, 'formOpenings'), (snap) => {
      setOpenings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const submissionsQuery = query(collection(db, 'submissions'), where('groupId', '==', groupDocId));
    const unsubSubmissions = onSnapshot(submissionsQuery, (snap) => {
      setSubmissions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const defensesQuery = query(collection(db, 'defenses'), where('groupId', '==', groupDocId));
    const unsubDefenses = onSnapshot(defensesQuery, (snap) => {
      setDefenses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubMembers = onSnapshot(collection(db, `groups/${groupDocId}/members`), (snap) => {
      setMembers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubRequirements();
      unsubOpenings();
      unsubSubmissions();
      unsubDefenses();
      unsubMembers();
    };
  }, [groupId, groupDocId]);

  useEffect(() => {
    if (!currentGroup?.leaderId) {
      setLeaderName(null);
      return;
    }

    const unsubscribeLeader = onSnapshot(doc(db, 'users', currentGroup.leaderId), (snap) => {
      const data = snap.data() as { displayName?: string | null } | undefined;
      setLeaderName(data?.displayName ?? null);
    });

    return () => unsubscribeLeader();
  }, [currentGroup?.leaderId]);

  if (loading && !currentGroup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchGroup(groupId)}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Group not found or no access</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageIndex = stages.findIndex(s => s.key === currentGroup.stage);
  const progress = ((currentStageIndex + 1) / stages.length) * 100;


  const submitRequirement = async (reqId: string) => {
    if (!currentGroup) return;
    const link = driveLinks[reqId];
    if (!link) return;
    const existing = submissionsByRequirement[reqId];

    if (existing) {
      await updateDoc(doc(db, 'submissions', existing.id), {
        driveUrl: link,
        status: existing.status === 'needs_revision' ? 'resubmitted' : 'submitted',
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setEditingLinks((prev) => ({ ...prev, [reqId]: false }));
      return;
    }

    await addDoc(collection(db, 'submissions'), {
      groupId: groupDocId,
      requirementId: reqId,
      driveUrl: link,
      status: 'submitted',
      remarks: null,
      submittedAt: Timestamp.now(),
      reviewedAt: null,
      reviewedBy: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    setEditingLinks((prev) => ({ ...prev, [reqId]: false }));
  };

  const addMember = async () => {
    if (!memberName.trim() || !currentGroup) return;
    await addDoc(collection(db, `groups/${groupDocId}/members`), {
      groupId: groupDocId,
      userId: 'manual',
      role: 'member',
      displayName: memberName.trim(),
      joinedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    setMemberName('');
  };

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    await updateDoc(doc(db, 'groups', groupDocId), {
      title: titleDraft.trim(),
      updatedAt: Timestamp.now()
    });
    setTitleDraft('');
  };

  const saveAdviser = async () => {
    if (!adviserDraft.trim()) return;
    await updateDoc(doc(db, 'groups', groupDocId), {
      adviserName: adviserDraft.trim(),
      updatedAt: Timestamp.now()
    });
    setAdviserDraft('');
  };

  const handleStageTransition = async (newStage: 'title' | 'proposal' | 'final') => {
    if (window.confirm(`Are you sure you want to advance to ${newStage} stage?`)) {
      await updateStage(groupId, newStage);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research Defense Progress</h1>
          <p className="text-gray-500 mt-1">
            Group: {currentGroup.title || 'Group'}
          </p>
          <p className="text-sm text-gray-400">
            Leader: {leaderName || currentGroup.leaderId}
          </p>
        </div>
        <div className="text-right">
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
         currentGroup.status === 'active' 
           ? 'bg-blue-100 text-blue-800' 
           : 'bg-yellow-100 text-yellow-800'
          )}>
            {currentGroup.status === 'active' ? 'Active' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">
                {currentStageIndex + 1} / {stages.length} Stages
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Stage Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isActive = index === currentStageIndex;
          const isFuture = index > currentStageIndex;

          return (
            <Card
              key={stage.key}
              className={cn(
                "relative overflow-hidden transition-all duration-200",
                isActive && "ring-2 ring-blue-500 shadow-lg",
                isCompleted && "opacity-90"
              )}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {isCompleted && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                {isActive && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                )}
                {isFuture && (
                  <Clock className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <CardContent className="p-6 pt-12">
                {/* Stage Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
                  stage.bgColor
                )}>
                  <stage.icon className={cn("w-6 h-6", stage.color)} />
                </div>

                {/* Stage Info */}
                <h3 className={cn(
                  "text-lg font-semibold mb-2",
                  isActive ? "text-gray-900" : "text-gray-500"
                )}>
                  {stage.label}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {stage.description}
                </p>

                {/* Stage Status */}
                 {isCompleted && (
                   <div className="flex items-center text-blue-600 text-sm mb-4">
                     <CheckCircle2 className="w-4 h-4 mr-1" />
                     Completed
                   </div>
                 )}

                {isActive && (
                  <div className="space-y-3">
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium">Current Stage</span>
                      <p className="mt-1">Focus on completing this stage requirements</p>
                    </div>
                    
                    {/* Stage Actions */}
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStageTransition(
                          stages[index - 1].key
                        )}
                      >
                        ← Revert to {stages[index - 1].label}
                      </Button>
                    )}
                    
                    {index < stages.length - 1 && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!canAdvanceStage}
                        onClick={() => handleStageTransition(
                          stages[index + 1].key
                        )}
                      >
                        Advance to {stages[index + 1].label} →
                      </Button>
                    )}
                  </div>
                )}

                {isFuture && (
                  <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded-lg">
                    Locked - Complete previous stages to unlock
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Open Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Open Requirements (Current Stage)
          </CardTitle>
        </CardHeader>
        <CardContent>
{openRequirements.length === 0 ? (
             <p className="text-sm text-gray-500">No open requirements for this stage yet.</p>
           ) : (
             <div className="space-y-4">
               {openRequirements.map((req) => {
                 const submission = submissionsByRequirement[req.id];
                 const isEditing = editingLinks[req.id] ?? false;
                 const isApproved = submission?.status === 'approved';
                 const isSubmitted = submission?.status === 'submitted' || submission?.status === 'approved';
                 return (
                   <div key={req.id} className="rounded-lg border p-4">
                     <div className="flex items-start justify-between">
                       <div>
                         <p className="font-medium text-gray-900">
                           {req.code ? `${req.code} - ` : ''}{req.name}
                         </p>
                         <p className="text-xs text-gray-500">Timing: {req.timing}</p>
                         {submission && (
                           <p className="text-xs text-blue-600 mt-1">Status: {submission.status}</p>
                         )}
                       </div>
                       {submission?.driveUrl && (
                         <a className="text-sm text-blue-600" href={submission.driveUrl} target="_blank" rel="noreferrer">
                           View Link
                         </a>
                       )}
                     </div>
                     <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                       <input
                         className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                         placeholder="Paste Google Drive link"
                         value={driveLinks[req.id] ?? submission?.driveUrl ?? ''}
                         onChange={(e) => setDriveLinks((prev) => ({ ...prev, [req.id]: e.target.value }))}
                         disabled={isSubmitted && !isEditing}
                       />
{isApproved ? (
                          <Button size="sm" disabled={true} className="opacity-50 cursor-not-allowed">
                            Approved
                          </Button>
                        ) : isSubmitted && !isEditing ? (
                          <Button size="sm" variant="outline" onClick={() => setEditingLinks((prev) => ({ ...prev, [req.id]: true }))}>
                            <Edit className="w-3 h-3 mr-1" />
                            Resubmit
                          </Button>
                        ) : submission?.status === 'needs_revision' ? (
                          <Button size="sm" onClick={() => submitRequirement(req.id)}>
                            Resubmit
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => submitRequirement(req.id)}
                            disabled={isSubmitted && !isEditing}
                          >
                            {isEditing ? 'Update' : 'Submit'}
                          </Button>
                        )}
                     </div>
                     {submission?.remarks && (
                       <p className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                         <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                         <span className="font-medium text-slate-700">Comment:</span> {submission.remarks}
                       </p>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
        </CardContent>
      </Card>

{/* Research Highlights */}
       <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
         <CardHeader>
           <CardTitle className="text-xl text-slate-800">Research Highlights</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid gap-4">
             <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
               <div className="flex items-start gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                   <FileText className="h-5 w-5 text-blue-600" />
                 </div>
                 <div className="flex-1">
                   <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Research Title</p>
                   <p className="mt-1 text-lg font-semibold text-slate-900">
                     {currentGroup.title || 'Pending title'}
                   </p>
                 </div>
               </div>
             </div>

             <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
               <div className="flex items-start gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                   <BookOpen className="h-5 w-5 text-purple-600" />
                 </div>
                 <div className="flex-1">
                   <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Research Adviser</p>
                   {canEditAdviser ? (
                     <p className="mt-1 text-lg font-semibold text-slate-900">
                       {currentGroup.adviserName || 'Pending adviser'}
                     </p>
                   ) : (
                     <p className="mt-1 text-base italic text-slate-500">
                       Locked until Adviser Form is approved
                     </p>
                   )}
                 </div>
               </div>
             </div>

             <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
               <div className="flex items-start gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                   <Users className="h-5 w-5 text-emerald-600" />
                 </div>
                 <div className="flex-1">
                   <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Group Leader</p>
                   <p className="mt-1 text-lg font-semibold text-slate-900">
                     {leaderName || currentGroup.leaderId}
                   </p>
                 </div>
               </div>
             </div>

             <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
               <div className="flex items-start gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                   <Users className="h-5 w-5 text-amber-600" />
                 </div>
                 <div className="flex-1">
                   <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Members</p>
                   {canEditMembers ? (
                     members.length === 0 ? (
                       <p className="mt-1 text-base italic text-slate-500">No members added yet.</p>
                     ) : (
                       <div className="mt-2 space-y-1">
                         {members.map((member) => (
                           <p key={member.id} className="text-base text-slate-700">• {member.displayName || member.userId}</p>
                         ))}
                       </div>
                     )
                   ) : (
                     <p className="mt-1 text-base italic text-slate-500">
                       Locked until grouping form is approved
                     </p>
                   )}
                 </div>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>

      {/* Unlocks */}
      <Card>
        <CardHeader>
          <CardTitle>Unlocked Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="font-medium text-gray-900">Group Members</p>
            <p className="text-xs text-gray-500">Unlocks after PNC:PRE-FO-64/65 is approved.</p>
            {canEditMembers ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Add member name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                  <Button size="sm" onClick={addMember}>Add</Button>
                </div>
                <div className="space-y-1">
                  {members.map((member) => (
                    <p key={member.id} className="text-sm text-gray-700">• {member.displayName || member.userId}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Locked</p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium text-gray-900">Research Title</p>
            <p className="text-xs text-gray-500">Unlocks after Title Defense is marked done.</p>
            {canEditTitle ? (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Enter research title"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                />
                <Button size="sm" onClick={saveTitle}>Save</Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Locked</p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium text-gray-900">Research Adviser</p>
            <p className="text-xs text-gray-500">Unlocks after PNC:PRE-FO-59 is approved.</p>
            {canEditAdviser ? (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Enter adviser name"
                  value={adviserDraft}
                  onChange={(e) => setAdviserDraft(e.target.value)}
                />
                <Button size="sm" onClick={saveAdviser}>Save</Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Locked</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Defense Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const isPast = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const defense = defenses.find((item) => item.groupId === groupDocId && item.stage === stage.key);
              
              return (
                <div key={stage.key} className="flex items-start gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isPast && "bg-green-100",
                    isCurrent && "bg-blue-100",
                    !isPast && !isCurrent && "bg-gray-100"
                  )}>
                    {isPast && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {isCurrent && (
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                    )}
                    {!isPast && !isCurrent && (
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 border-l-2 border-gray-200 pl-4">
                    <h4 className="font-medium text-gray-900">{stage.label}</h4>
                    <p className="text-sm text-gray-500">{stage.description}</p>
                    {defense?.scheduledAt && (
                      <p className="text-xs text-blue-600 mt-1">
                        Scheduled: {defense.scheduledAt.toDate().toLocaleString()}
                      </p>
                    )}
                    {defense?.meetLink && (
                      <p className="text-xs text-gray-500">Location/Link: {defense.meetLink}</p>
                    )}
                    {defense?.notes && (
                      <p className="text-xs text-gray-500">Notes: {defense.notes}</p>
                    )}
                    {isCurrent && (
                      <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
