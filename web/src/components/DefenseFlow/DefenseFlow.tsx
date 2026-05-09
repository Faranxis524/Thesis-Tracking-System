// Defense Flow UI Components - src/components/DefenseFlow/DefenseFlow.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDefenseFlowStore } from '@/store/defenseFlowStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock, BookOpen, Trophy, FileText, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { onSnapshot, addDoc, Timestamp, doc, updateDoc, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/firestore/collections';

interface DefenseFlowProps {
  groupId: string;
  canManageDefense?: boolean;
}

const stages = [
  {
    key: 'title' as const,
    label: 'Title Approval',
    description: 'Submit research title and get committee approval',
    icon: FileText,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200'
  },
  {
    key: 'proposal' as const,
    label: 'Proposal Defense',
    description: 'Present and defend your research proposal',
    icon: BookOpen,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200'
  },
  {
    key: 'final' as const,
    label: 'Final Defense',
    description: 'Final presentation and thesis defense',
    icon: Trophy,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200'
  }
];

export function DefenseFlow({ groupId, canManageDefense = false }: DefenseFlowProps) {
  const {
    currentGroup,
    loading,
    error,
    fetchGroup,
    updateStage
  } = useDefenseFlowStore();

  const [requirements, setRequirements] = useState<Record<string, unknown>[]>([]);
  const [openings, setOpenings] = useState<Record<string, unknown>[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, unknown>[]>([]);
  const [defenses, setDefenses] = useState<Record<string, unknown>[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
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

  const submissionsByRequirement = useMemo(() => {
    if (!currentGroup) return {} as Record<string, Record<string, unknown>>;
    return submissions
      .filter((sub) => sub.groupId === groupDocId)
      .reduce<Record<string, Record<string, unknown>>>((acc, sub) => {
        const reqId = sub.requirementId as string;
        acc[reqId] = sub;
        return acc;
      }, {});
  }, [currentGroup, submissions, groupDocId]);

   const currentDefenseDone = defenses.some(
     (defense) => (defense.groupId as string) === groupDocId && (defense.stage as string) === stageKey && defense.status === 'done'
   );

   const stageApproved = beforeStageRequirements.every((req) => {
     const reqId = req.id as string | undefined;
     const submission = submissionsByRequirement[reqId as string];
     return submission?.status === 'approved';
   });

  const effectiveStageKey = useMemo(() => {
    if (!currentGroup) return 'title' as const;

    if (currentGroup.stage === 'title' && stageApproved) {
      return 'proposal' as const;
    }

    if (currentGroup.stage === 'proposal' && stageApproved) {
      return 'final' as const;
    }

    return currentGroup.stage;
  }, [currentGroup, stageApproved]);

  const canAdvanceStage = stageApproved && currentDefenseDone;

  const openRequirements = useMemo(() => {
    if (!currentGroup) return [];
    const now = new Date();
    return openings.filter((opening) => {
      if (!opening.isOpen) return false;

      const openingStage = String(opening.requirementStage ?? '').trim().toLowerCase();
      const stageToMatch = String(effectiveStageKey).trim().toLowerCase();
      if (openingStage && openingStage !== stageToMatch) return false;

      const deadlineAt = opening.deadlineAt as Timestamp | undefined;
      const deadlineOk = !deadlineAt || deadlineAt.toDate() >= now;
      if (!deadlineOk) return false;

      const scopeType = String(opening.scopeType ?? '').trim().toLowerCase();

      if (scopeType === 'group') {
        const rawGroupIds = opening.groupIds as unknown;
        const groupIds = Array.isArray(rawGroupIds)
          ? rawGroupIds.map((value) => String(value).trim())
          : typeof rawGroupIds === 'string'
            ? rawGroupIds.split(',').map((value) => value.trim()).filter(Boolean)
            : [];

        return groupIds.includes(String(groupDocId).trim());
      }

      if (scopeType === 'section') {
        const sectionId = String(opening.sectionId ?? '').trim();
        return !sectionId || sectionId === String(currentGroup.sectionId ?? '').trim();
      }

      return false;
    });
  }, [currentGroup, openings, effectiveStageKey, groupDocId]);

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
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOpenings(docs);
      // DEBUG: log openings and current group info to trace visibility issues
      try {
        // eslint-disable-next-line no-console
        console.debug('DefenseFlow: formOpenings snapshot', { openings: docs, currentGroupSection: currentGroup?.sectionId, groupDocId, stageKey });
      } catch (err) {
        // ignore
      }
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
    if (!currentGroup?.leaderId) return;

    const unsubscribeLeader = onSnapshot(doc(db, 'users', currentGroup.leaderId), (snap) => {
      const data = snap.data() as { displayName?: string | null } | undefined;
      setLeaderName(data?.displayName ?? null);
    });

    return () => unsubscribeLeader();
  }, [currentGroup?.leaderId]);

  if (loading && !currentGroup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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
       await updateDoc(doc(db, 'submissions', String(existing.id || '')), {
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
           ? 'bg-emerald-100 text-emerald-900' 
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
                isActive && "ring-2 ring-emerald-500 shadow-lg",
                isCompleted && "opacity-90"
              )}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {isCompleted && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                {isActive && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                   <div className="flex items-center text-emerald-700 text-sm mb-4">
                     <CheckCircle2 className="w-4 h-4 mr-1" />
                     Completed
                   </div>
                 )}

                {isActive && (
                  <div className="space-y-3">
                    <div className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                      <span className="font-medium">Current Stage</span>
                      <p className="mt-1">Focus on completing this stage requirements</p>
                    </div>
                    
                    {/* Stage Actions */}
                    {canManageDefense ? (
                      <>
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
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        Stage changes are handled by the teacher.
                      </p>
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
          {/* DEBUG SUMMARY: show counts to help trace visibility */}
          <div className="mb-3 text-xs text-gray-500">
            Observed openings: {openings.length} • Stage requirements: {stageRequirements.length} • Matching stage openings: {openRequirements.length} • Group ID: {groupDocId} • Effective stage: {effectiveStageKey} • Stored stage: {currentGroup.stage}
          </div>
          {openRequirements.length === 0 ? (
               <p className="text-sm text-gray-500">No open requirements for this stage yet.</p>
             ) : (
             <div className="space-y-4">
                {openRequirements.map((opening) => {
                  const reqId = opening.requirementId as string | undefined;
                  const requirement = requirements.find((req) => String((req as any).id ?? '') === reqId);
                  const submission = submissionsByRequirement[reqId as string];
                  const isEditing = editingLinks[reqId as string] ?? false;
                 const isApproved = submission?.status === 'approved';
                 const isSubmitted = submission?.status === 'submitted' || submission?.status === 'approved';
                 return (
                    <div key={reqId} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {requirement?.code ? `${String(requirement.code)} - ` : ''}{String((requirement as any)?.name ?? reqId ?? 'Open Requirement')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Timing: {(requirement?.timing as string) || 'before/after'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Scope: {(opening.scopeType as string) || 'section'}
                            {opening.scopeType === 'section' && opening.sectionId ? ` • Section: ${opening.sectionId}` : ''}
                          </p>
                        {submission && (
                          <p className="text-xs text-emerald-700 mt-1">Status: {submission.status as string}</p>
                        )}
                        </div>
                        {(submission?.driveUrl as string | undefined) && (
                          <a className="text-sm text-emerald-700" href={submission.driveUrl as string} target="_blank" rel="noreferrer">
                            View Link
                          </a>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Paste Google Drive link"
                          value={driveLinks[reqId as string] ?? submission?.driveUrl ?? ''}
                          onChange={(e) => setDriveLinks((prev) => ({ ...prev, [reqId as string]: e.target.value }))}
                          disabled={isSubmitted && !isEditing}
                        />
{isApproved ? (
                          <Button size="sm" disabled={true} className="opacity-50 cursor-not-allowed">
                            Approved
                          </Button>
                         ) : isSubmitted && !isEditing ? (
                           <Button size="sm" variant="outline" onClick={() => setEditingLinks((prev) => ({ ...prev, [reqId as string]: true }))}>
                             Resubmit
                           </Button>
                         ) : submission?.status === 'needs_revision' ? (
                           <Button size="sm" onClick={() => submitRequirement(reqId as string)}>
                            Resubmit
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                             onClick={() => submitRequirement(reqId as string)}
                            disabled={isSubmitted && !isEditing}
                          >
                            {isEditing ? 'Update' : 'Submit'}
                          </Button>
                        )}
                     </div>
                      {(submission?.remarks as string | undefined) && (
                       <p className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                         <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-medium text-slate-700">Comment:</span> {submission.remarks as string}
                       </p>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
        {/* Full openings debug list (helps trace missing matches) */}
        <div className="mt-4 text-xs text-slate-600">
          <div className="font-medium">All observed openings (debug):</div>
               <div className="mt-2 space-y-2">
            {openings.map((op) => (
              <div key={op.id as string} className="p-2 border rounded bg-white">
                <div>id: {op.id as string}</div>
                <div>requirementId: {String(op.requirementId)}</div>
                <div>requirementStage: {String(op.requirementStage ?? 'unknown')}</div>
                <div>scopeType: {String(op.scopeType)}</div>
                <div>sectionId: {String(op.sectionId ?? '')}</div>
                <div>groupIds: {((op.groupIds as string[]) || []).join(', ')}</div>
                <div>isOpen: {String(op.isOpen)}</div>
              </div>
            ))}
          </div>
        </div>
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
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                   <FileText className="h-5 w-5 text-emerald-700" />
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
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                   <BookOpen className="h-5 w-5 text-emerald-700" />
                 </div>
                 <div className="flex-1">
                   <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Research Adviser</p>
                   <p className="mt-1 text-lg font-semibold text-slate-900">
                     {currentGroup.adviserName || 'Pending adviser'}
                   </p>
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
                   {members.length === 0 ? (
                     <p className="mt-1 text-base italic text-slate-500">No members added yet.</p>
                   ) : (
                     <div className="mt-2 space-y-1">
                        {members.map((member) => (
                          <p key={member.id as string} className="text-base text-slate-700">• {(member.displayName as string | undefined) || (member.userId as string)}</p>
                        ))}
                     </div>
                   )}
                 </div>
               </div>
             </div>
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
                    isCurrent && "bg-emerald-100",
                    !isPast && !isCurrent && "bg-gray-100"
                  )}>
                    {isPast && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {isCurrent && (
                      <div className="w-3 h-3 rounded-full bg-emerald-600" />
                    )}
                    {!isPast && !isCurrent && (
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 border-l-2 border-gray-200 pl-4">
                    <h4 className="font-medium text-gray-900">{stage.label}</h4>
                    <p className="text-sm text-gray-500">{stage.description}</p>
                     {(defense?.scheduledAt as Timestamp | undefined) && (
                       <p className="text-xs text-emerald-700 mt-1">
                         Scheduled: {(defense?.scheduledAt as Timestamp | undefined)?.toDate().toLocaleString()}
                       </p>
                    )}
                     {(defense?.meetLink as string | undefined) && (
                       <p className="text-xs text-gray-500">Location/Link: {defense?.meetLink as string}</p>
                    )}
                     {(defense?.notes as string | undefined) && (
                       <p className="text-xs text-gray-500">Notes: {defense?.notes as string}</p>
                     )}
                    {isCurrent && (
                      <span className="inline-block mt-2 text-xs bg-emerald-100 text-emerald-900 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                    {defense && defense.status !== 'cancelled' && (
                      <div className="mt-3 flex gap-2">
                        {defense.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (confirm('Mark this defense as done?')) {
                                try {
                                  await updateDoc(doc(db, 'defenses', defense.id as string), {
                                    status: 'done',
                                    updatedAt: Timestamp.now()
                                  });
                                } catch (err) {
                                  console.error('Error updating defense:', err);
                                  alert('Failed to mark defense as done');
                                }
                              }
                            }}
                          >
                            Mark Done
                          </Button>
                        )}
                        {defense.status === 'done' && (
                          <span className="text-xs bg-green-100 text-green-900 px-2 py-1 rounded">
                            ✓ Completed
                          </span>
                        )}
                      </div>
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
