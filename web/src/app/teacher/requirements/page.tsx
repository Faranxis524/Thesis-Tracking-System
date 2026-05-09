"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onSnapshot, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { collections } from '@/lib/firestore/collections';
import { Edit2, Trash2 } from 'lucide-react';

type OpeningScope = 'section' | 'group';

import type { Requirement, FormOpening, ResearchGroup, Term, Department, Section, Defense, Submission } from '@/types/firestore';

export default function TeacherRequirementsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [formOpenings, setFormOpenings] = useState<FormOpening[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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

  // Filters for Active Openings
  const [activeOpeningsFilters, setActiveOpeningsFilters] = useState({
    sectionId: '',
    groupId: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    groupId: '',
    stage: 'title' as 'title' | 'proposal' | 'final',
    scheduledAt: '',
    location: '',
    notes: ''
  });

  // Edit defense state
  const [editingDefenseId, setEditingDefenseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    scheduledAt: '',
    location: '',
    notes: ''
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

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
    const unsubSubmissions = onSnapshot(collections.submissions(), (snap) => {
      setSubmissions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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
      unsubSubmissions();
      unsubGroups();
      unsubDefenses();
      unsubTerms();
      unsubDepartments();
      unsubSections();
    };
  }, []);

  const getOpeningTargetGroupIds = (opening: FormOpening) => {
    if (opening.scopeType === 'group') {
      return (opening.groupIds || []).filter(Boolean);
    }

    if (opening.scopeType === 'section' && opening.sectionId) {
      return groups
        .filter((group) => group.sectionId === opening.sectionId)
        .map((group) => String(group.id ?? ''))
        .filter(Boolean);
    }

    return [] as string[];
  };

  const getOpeningGroupStatus = (groupId: string, requirementId: string) => {
    const submission = submissions.find(
      (item) => item.groupId === groupId && item.requirementId === requirementId
    );

    if (!submission) {
      return { label: 'Pending', className: 'bg-slate-100 text-slate-700' };
    }

    if (submission.status === 'approved') {
      return { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' };
    }

    if (submission.status === 'needs_revision') {
      return { label: 'Needs Revision', className: 'bg-red-100 text-red-800' };
    }

    if (submission.status === 'resubmitted') {
      return { label: 'Resubmitted', className: 'bg-purple-100 text-purple-800' };
    }

    if (submission.status === 'submitted') {
      return { label: 'Submitted', className: 'bg-blue-100 text-blue-800' };
    }

    return { label: 'Missing', className: 'bg-slate-100 text-slate-700' };
  };

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

    const duplicateOpening = formOpenings.find((opening) => {
      if (opening.requirementId !== openingForm.requirementId) return false;
      if (opening.scopeType !== openingForm.scopeType) return false;

      if (openingForm.scopeType === 'section') {
        return opening.sectionId === openingForm.sectionId;
      }

      return (opening.groupIds || []).includes(openingForm.groupId);
    });

    if (duplicateOpening) {
      alert('This requirement is already open for the selected scope. Use the existing opening instead of creating a duplicate.');
      return;
    }

    const deadline = openingForm.deadlineAt ? Timestamp.fromDate(new Date(openingForm.deadlineAt)) : null;

    // Propagate section-scoped openings to all groups in that section
    const targetGroupIds = openingForm.scopeType === 'group'
      ? [openingForm.groupId]
      : openingForm.scopeType === 'section' && openingForm.sectionId
        ? groups.filter((g) => g.sectionId === openingForm.sectionId).map((g) => String(g.id ?? '')).filter(Boolean)
        : [];

    await addDoc(collections.formOpenings(), {
      requirementId: openingForm.requirementId,
      scopeType: openingForm.scopeType,
      termId: openingForm.scopeType === 'section' ? openingForm.termId || null : null,
      departmentId: openingForm.scopeType === 'section' ? openingForm.departmentId || null : null,
      sectionId: openingForm.scopeType === 'section' ? openingForm.sectionId || null : null,
      groupIds: targetGroupIds,
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
    try {
      setActionLoading({ id: defenseId, action: status });
      await updateDoc(doc(collections.defenses(), defenseId), {
        status,
        updatedAt: Timestamp.now()
      });
      setActionLoading(null);
    } catch (err) {
      console.error(`Error updating defense status to ${status}:`, err);
      alert(`Failed to update defense status. Please try again.`);
      setActionLoading(null);
    }
  };

  const handleEditDefense = (defense: Defense) => {
    setEditingDefenseId(defense.id || null);
    const scheduledDate = defense.scheduledAt instanceof Timestamp 
      ? defense.scheduledAt.toDate() 
      : new Date(defense.scheduledAt as any);
    const isoString = scheduledDate.toISOString().slice(0, 16);
    setEditForm({
      scheduledAt: isoString,
      location: defense.meetLink || '',
      notes: defense.notes || ''
    });
    setEditError(null);
  };

  const handleSaveDefense = async (defenseId: string) => {
    if (!editForm.scheduledAt) {
      setEditError('Please select a date and time');
      return;
    }
    try {
      await updateDoc(doc(collections.defenses(), defenseId), {
        scheduledAt: Timestamp.fromDate(new Date(editForm.scheduledAt)),
        meetLink: editForm.location || null,
        notes: editForm.notes || null,
        updatedAt: Timestamp.now()
      });
      setEditingDefenseId(null);
      setEditError(null);
    } catch (err) {
      console.error('Error saving defense:', err);
      setEditError('Failed to save defense. Please try again.');
    }
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
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 items-end">
              <div>
                <Label>Filter by Section</Label>
                <select
                  value={activeOpeningsFilters.sectionId}
                  onChange={(e) => setActiveOpeningsFilters(prev => ({ ...prev, sectionId: e.target.value }))}
                  className="mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">All Sections</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Filter by Group</Label>
                <select
                  value={activeOpeningsFilters.groupId}
                  onChange={(e) => setActiveOpeningsFilters(prev => ({ ...prev, groupId: e.target.value }))}
                  className="mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">All Groups</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.title || groupLabelLookup[group.id!]}</option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveOpeningsFilters({ sectionId: '', groupId: '' })}
              >
                Clear Filters
              </Button>
            </div>

            {/* Openings List */}
            {formOpenings.length === 0 ? (
              <p className="text-sm text-slate-500">No openings yet.</p>
            ) : (
              <div className="space-y-3">
                {formOpenings
                  .filter(opening => {
                    // Filter by section if selected
                    if (activeOpeningsFilters.sectionId && opening.sectionId !== activeOpeningsFilters.sectionId) {
                      return false;
                    }
                    // Filter by group if selected
                    if (activeOpeningsFilters.groupId && !(opening.groupIds as string[])?.includes(activeOpeningsFilters.groupId)) {
                      return false;
                    }
                    return true;
                  })
                  .map((opening) => (
                  <div key={opening.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
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
                        {opening.sectionId && (
                          <p className="text-xs text-slate-500">
                            Section: {sections.find(s => s.id === opening.sectionId)?.name}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleOpening(opening.id || '', !opening.isOpen)}>
                        {opening.isOpen ? 'Close' : 'Re-open'}
                      </Button>
                    </div>

                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Group Progress for This Document
                      </p>
                      <div className="space-y-2">
                        {getOpeningTargetGroupIds(opening).length === 0 ? (
                          <p className="text-xs text-slate-500">No groups found for this scope.</p>
                        ) : (
                          getOpeningTargetGroupIds(opening).map((groupId) => {
                            const status = getOpeningGroupStatus(groupId, opening.requirementId);
                            return (
                              <div key={`${opening.id}-${groupId}`} className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-medium text-slate-700">
                                  {groupLabelLookup[groupId] || groupId}
                                </span>
                                <Badge className={status.className}>{status.label}</Badge>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
              </div>
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
                <div key={defense.id} className="rounded-lg border p-3">
                  {editingDefenseId === defense.id ? (
                    // Edit form
                    <div className="space-y-3">
                      <div>
                        <Label>Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={editForm.scheduledAt}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Location / Link</Label>
                        <Input
                          placeholder="Room / Google Meet link"
                          value={editForm.location}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Notes (optional)</Label>
                        <Input
                          placeholder="Additional notes"
                          value={editForm.notes}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                      {editError && (
                        <p className="text-sm text-red-600">{editError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveDefense(defense.id || '')}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingDefenseId(null);
                          setEditError(null);
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-start justify-between">
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
                        {defense.status && (
                          <p className={`text-xs mt-1 px-2 py-1 rounded inline-block ${
                            defense.status === 'done' ? 'bg-green-100 text-green-800' :
                            defense.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {defense.status === 'done' ? '✓ Done' : defense.status === 'cancelled' ? '✗ Cancelled' : 'Scheduled'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditDefense(defense)}>
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {defense.status !== 'done' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateDefenseStatus(defense.id || '', 'done')}
                            disabled={actionLoading?.id === defense.id && actionLoading?.action === 'done'}
                          >
                            {actionLoading?.id === defense.id && actionLoading?.action === 'done' ? 'Marking...' : 'Mark Done'}
                          </Button>
                        )}
                        {defense.status !== 'cancelled' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Cancel this defense schedule?')) {
                                updateDefenseStatus(defense.id || '', 'cancelled');
                              }
                            }}
                            disabled={actionLoading?.id === defense.id && actionLoading?.action === 'cancelled'}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {actionLoading?.id === defense.id && actionLoading?.action === 'cancelled' ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}