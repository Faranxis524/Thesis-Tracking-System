"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onSnapshot, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { collections } from '@/lib/firestore/collections';

type OpeningScope = 'section' | 'group';

import type { Requirement, FormOpening, ResearchGroup, Term, Department, Section, Defense } from '@/types/firestore';

export default function TeacherRequirementsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [formOpenings, setFormOpenings] = useState<FormOpening[]>([]);
  const [groups, setGroups] = useState<ResearchGroup[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);

  const [openingForm, setOpeningForm] = useState({
    requirementId: '',
    scopeType: 'section' as OpeningScope,
    termId: '',
    departmentId: '',
    sectionId: '',
    groupId: '',
    deadlineAt: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    groupId: '',
    stage: 'title' as 'title' | 'proposal' | 'final',
    scheduledAt: '',
    location: '',
    notes: ''
  });

  const requirementLookup = useMemo(() => {
    return requirements.reduce<Record<string, Requirement>>((acc, req) => {
      const id = String(req.id ?? '');
      if (id) acc[id] = req;
      return acc;
    }, {});
  }, [requirements]);

  const requirementGroups = useMemo(() => {
    const order = [
      { key: 'title', label: 'Title Approval' },
      { key: 'proposal', label: 'Proposal Defense' },
      { key: 'final', label: 'Final Defense' }
    ];

    return order.map((stage) => {
      const items = requirements
        .filter((req) => req.stage === stage.key)
        .sort((a, b) => {
          const timingOrder = { before: 0, after: 1 } as Record<string, number>;
          const timingDiff = (timingOrder[a.timing] ?? 0) - (timingOrder[b.timing] ?? 0);
          if (timingDiff !== 0) return timingDiff;
          const nameA = `${a.code || ''} ${a.name || ''}`.toLowerCase();
          const nameB = `${b.code || ''} ${b.name || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      return { ...stage, items };
    });
  }, [requirements]);

  const groupLabelLookup = useMemo(() => {
    const getCreatedAtMillis = (group: ResearchGroup) => {
      const createdAt = group.createdAt as Timestamp;
      return createdAt?.toMillis?.() ?? 0;
    };

    const sorted = [...groups].sort((a, b) => {
      const aTime = getCreatedAtMillis(a);
      const bTime = getCreatedAtMillis(b);
      return aTime - bTime;
    });
    return sorted.reduce<Record<string, string>>((acc, group, index) => {
      const id = String(group.id ?? '');
      if (id) acc[id] = `Group ${index + 1}`;
      return acc;
    }, {});
  }, [groups]);

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (userProfile && userProfile.role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }
  }, [user, userProfile, router]);

  useEffect(() => {
    const unsubRequirements = onSnapshot(collections.requirements(), (snap) => {
      const reqs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRequirements(reqs);
    });

    const unsubOpenings = onSnapshot(collections.formOpenings(), (snap) => {
      setFormOpenings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubGroups = onSnapshot(collections.groups(), (snap) => {
      setGroups(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubDefenses = onSnapshot(collections.defenses(), (snap) => {
      setDefenses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTerms = onSnapshot(collections.terms(), (snap) => {
      setTerms(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubDepartments = onSnapshot(collections.departments(), (snap) => {
      setDepartments(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSections = onSnapshot(collections.sections(), (snap) => {
      setSections(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubRequirements();
      unsubOpenings();
      unsubGroups();
      unsubDefenses();
      unsubTerms();
      unsubDepartments();
      unsubSections();
    };
  }, []);

  const scopedSections = useMemo(() => {
    return sections.filter((section) => {
      if (openingForm.termId && section.termId !== openingForm.termId) return false;
      if (openingForm.departmentId && section.departmentId !== openingForm.departmentId) return false;
      return true;
    });
  }, [sections, openingForm.termId, openingForm.departmentId]);

  const createOpening = async () => {
    if (!user) return;
    if (!openingForm.requirementId) return;
    if (openingForm.scopeType === 'section' && !openingForm.sectionId) return;
    if (openingForm.scopeType === 'group' && !openingForm.groupId) return;

    const deadline = openingForm.deadlineAt ? Timestamp.fromDate(new Date(openingForm.deadlineAt)) : null;

    await addDoc(collections.formOpenings(), {
      requirementId: openingForm.requirementId,
      scopeType: openingForm.scopeType,
      termId: openingForm.scopeType === 'section' ? openingForm.termId || null : null,
      departmentId: openingForm.scopeType === 'section' ? openingForm.departmentId || null : null,
      sectionId: openingForm.scopeType === 'section' ? openingForm.sectionId || null : null,
      groupIds: openingForm.scopeType === 'group' ? [openingForm.groupId] : [],
      deadlineAt: deadline,
      isOpen: true,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    setOpeningForm({
      requirementId: '',
      scopeType: openingForm.scopeType,
      termId: '',
      departmentId: '',
      sectionId: '',
      groupId: '',
      deadlineAt: ''
    });
  };

  const toggleOpening = async (openingId: string, isOpen: boolean) => {
    await updateDoc(doc(collections.formOpenings(), openingId), {
      isOpen,
      updatedAt: Timestamp.now()
    });
  };

  const createSchedule = async () => {
    if (!user) return;
    if (!scheduleForm.groupId || !scheduleForm.scheduledAt) return;

    await addDoc(collections.defenses(), {
      groupId: scheduleForm.groupId,
      stage: scheduleForm.stage,
      scheduledAt: Timestamp.fromDate(new Date(scheduleForm.scheduledAt)),
      meetLink: scheduleForm.location || null,
      notes: scheduleForm.notes || null,
      status: 'scheduled',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    setScheduleForm({ groupId: '', stage: 'title', scheduledAt: '', location: '', notes: '' });
  };

  const updateDefenseStatus = async (defenseId: string, status: 'scheduled' | 'done' | 'cancelled') => {
    await updateDoc(doc(collections.defenses(), defenseId), {
      status,
      updatedAt: Timestamp.now()
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Requirements & Scheduling</h1>
            <p className="text-sm text-slate-500">Open submissions, set deadlines, and schedule defenses.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open Requirement Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Requirement</Label>
              <Select value={openingForm.requirementId} onValueChange={(v) => setOpeningForm((prev) => ({ ...prev, requirementId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select requirement" />
                </SelectTrigger>
                <SelectContent>
                  {requirementGroups.map((group) => (
                    group.items.length > 0 ? (
                      <div key={group.key}>
                        <div className="px-2 py-1 text-xs font-semibold text-slate-500">
                          {group.label}
                        </div>
                       {group.items.map((req) => (
                         <SelectItem key={req.id || 'unknown-req'} value={req.id || 'unknown'}>
                           {req.code ? `${req.code} - ` : ''}{req.name}
                         </SelectItem>
                       ))}
                      </div>
                    ) : null
                  ))}
                </SelectContent>
              </Select>
              {requirements.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No requirements found. Run the seed script first.</p>
              )}
            </div>

            <div>
              <Label>Scope</Label>
              <Select value={openingForm.scopeType} onValueChange={(v: OpeningScope) => setOpeningForm((prev) => ({ ...prev, scopeType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="group">Specific Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {openingForm.scopeType === 'section' ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Term</Label>
                  <Select value={openingForm.termId} onValueChange={(v) => setOpeningForm((prev) => ({ ...prev, termId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                   {terms.map((term) => (
                     <SelectItem key={term.id || 'unknown-term3'} value={term.id || 'unknown'}>{term.name}</SelectItem>
                   ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={openingForm.departmentId} onValueChange={(v) => setOpeningForm((prev) => ({ ...prev, departmentId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                       {departments.map((dept) => (
                         <SelectItem key={dept.id || 'unknown-dept3'} value={dept.id || 'unknown'}>{dept.name}</SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={openingForm.sectionId} onValueChange={(v) => setOpeningForm((prev) => ({ ...prev, sectionId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                       {scopedSections.map((section) => (
                         <SelectItem key={section.id || 'unknown-sec2'} value={section.id || 'unknown'}>{section.name}</SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div>
                <Label>Group</Label>
                <Select value={openingForm.groupId} onValueChange={(v) => setOpeningForm((prev) => ({ ...prev, groupId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                     {groups.map((group) => (
                       <SelectItem key={group.id || 'unknown-grp'} value={group.id || 'unknown'}>
                         {group.title || (group.id && groupLabelLookup[group.id]) || String(group.id || '')}
                       </SelectItem>
                     ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Deadline</Label>
              <Input
                type="datetime-local"
                value={openingForm.deadlineAt}
                onChange={(e) => setOpeningForm((prev) => ({ ...prev, deadlineAt: e.target.value }))}
              />
            </div>

            <Button onClick={createOpening}>Open Requirement</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Openings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formOpenings.length === 0 ? (
              <p className="text-sm text-slate-500">No openings yet.</p>
            ) : (
              formOpenings.map((opening) => (
                <div key={opening.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {requirementLookup[opening.requirementId]?.code
                        ? `${requirementLookup[opening.requirementId]?.code} - ${requirementLookup[opening.requirementId]?.name}`
                        : requirementLookup[opening.requirementId]?.name || opening.requirementId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Scope: {opening.scopeType || 'section'}
                    </p>
                    {opening.scopeType === 'group' && opening.groupIds?.length ? (
                      <p className="text-xs text-slate-500">
                        Group: {groupLabelLookup[opening.groupIds[0]] || opening.groupIds[0]}
                      </p>
                    ) : null}
                  </div>
                   <Button variant="outline" size="sm" onClick={() => toggleOpening(opening.id || '', !opening.isOpen)}>
                    {opening.isOpen ? 'Close' : 'Re-open'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule Defense / Consultation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Group</Label>
              <Select value={scheduleForm.groupId} onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, groupId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                   {groups.map((group) => (
                     <SelectItem key={group.id || 'unknown-grp2'} value={group.id || 'unknown'}>
                       {group.title || (group.id && groupLabelLookup[group.id]) || String(group.id || '')}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Stage</Label>
                <Select value={scheduleForm.stage} onValueChange={(v: 'title' | 'proposal' | 'final') => setScheduleForm((prev) => ({ ...prev, stage: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title Defense</SelectItem>
                    <SelectItem value="proposal">Proposal Defense</SelectItem>
                    <SelectItem value="final">Final Defense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Location / Link</Label>
              <Input
                placeholder="Room / Google Meet link"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Additional notes"
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <Button onClick={createSchedule}>Create Schedule</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defense Schedule List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {defenses.length === 0 ? (
              <p className="text-sm text-slate-500">No schedules yet.</p>
            ) : (
              defenses.map((defense) => (
                <div key={defense.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{defense.stage} defense</p>
                    <p className="text-xs text-slate-500">
                      {groupLabelLookup[defense.groupId] || defense.groupId}
                    </p>
                    <p className="text-xs text-slate-500">{defense.scheduledAt?.toDate?.().toLocaleString?.() || 'No date'}</p>
                    {defense.meetLink && (
                      <p className="text-xs text-slate-500">Location: {defense.meetLink}</p>
                    )}
                    {defense.notes && (
                      <p className="text-xs text-slate-500">Notes: {defense.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={() => updateDefenseStatus(defense.id || '', 'done')}>
                      Mark Done
                    </Button>
                     <Button size="sm" variant="ghost" onClick={() => updateDefenseStatus(defense.id || '', 'cancelled')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}