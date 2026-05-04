'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { queries, collections, documents, firestoreOps } from '@/lib/firestore/collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function InstitutionsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [terms, setTerms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [newTerm, setNewTerm] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newSection, setNewSection] = useState({ name: '', termId: '', departmentId: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'terms' | 'departments' | 'sections', id: string, name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const [editTermName, setEditTermName] = useState('');
  const [editDepartmentName, setEditDepartmentName] = useState('');
  const [editSection, setEditSection] = useState({ name: '', termId: '', departmentId: '' });

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (userProfile && userProfile.role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }

    const unsubTerms = onSnapshot(queries.terms(), (snap) => setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubDepartments = onSnapshot(queries.departments(), (snap) => setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSections = onSnapshot(queries.sections(), (snap) => setSections(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubTerms(); unsubDepartments(); unsubSections();
    };
  }, [user, userProfile, router]);

  const createTerm = async () => {
    if (!newTerm.trim()) return;
    try {
      setErrorMessage(null);
      const now = Timestamp.now();
      await addDoc(collections.terms(), {
        name: newTerm.trim(),
        startsOn: now,
        endsOn: now,
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
      setNewTerm('');
    } catch (err) {
      console.warn('Failed to create term', err);
      setErrorMessage('Unable to save term. Check your permissions and try again.');
    }
  };

  const createDepartment = async () => {
    if (!newDepartment.trim()) return;
    try {
      setErrorMessage(null);
      await addDoc(collections.departments(), { name: newDepartment.trim(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      setNewDepartment('');
    } catch (err) {
      console.warn('Failed to create department', err);
      setErrorMessage('Unable to save department. Check your permissions and try again.');
    }
  };

  const createSection = async () => {
    if (!newSection.name.trim() || !newSection.termId || !newSection.departmentId) return;
    try {
      setErrorMessage(null);
      await addDoc(collections.sections(), { ...newSection, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      setNewSection({ name: '', termId: '', departmentId: '' });
    } catch (err) {
      console.warn('Failed to create section', err);
      setErrorMessage('Unable to save section. Check your permissions and try again.');
    }
  };

  const startEditTerm = (id: string, name: string) => {
    setEditingTermId(id);
    setEditTermName(name);
  };

  const startEditDepartment = (id: string, name: string) => {
    setEditingDepartmentId(id);
    setEditDepartmentName(name);
  };

  const startEditSection = (section: any) => {
    setEditingSectionId(section.id);
    setEditSection({ name: section.name ?? '', termId: section.termId ?? '', departmentId: section.departmentId ?? '' });
  };

  const saveEditTerm = async () => {
    if (!editingTermId || !editTermName.trim()) return;
    try {
      setErrorMessage(null);
      await firestoreOps.update(documents.term(editingTermId), { name: editTermName.trim() });
      setEditingTermId(null);
      setEditTermName('');
    } catch (err) {
      console.warn('Failed to update term', err);
      setErrorMessage('Unable to update term. Check your permissions and try again.');
    }
  };

  const saveEditDepartment = async () => {
    if (!editingDepartmentId || !editDepartmentName.trim()) return;
    try {
      setErrorMessage(null);
      await firestoreOps.update(documents.department(editingDepartmentId), { name: editDepartmentName.trim() });
      setEditingDepartmentId(null);
      setEditDepartmentName('');
    } catch (err) {
      console.warn('Failed to update department', err);
      setErrorMessage('Unable to update department. Check your permissions and try again.');
    }
  };

  const saveEditSection = async () => {
    if (!editingSectionId || !editSection.name.trim() || !editSection.termId || !editSection.departmentId) return;
    try {
      setErrorMessage(null);
      await firestoreOps.update(documents.section(editingSectionId), {
        name: editSection.name.trim(),
        termId: editSection.termId,
        departmentId: editSection.departmentId
      });
      setEditingSectionId(null);
      setEditSection({ name: '', termId: '', departmentId: '' });
    } catch (err) {
      console.warn('Failed to update section', err);
      setErrorMessage('Unable to update section. Check your permissions and try again.');
    }
  };

  const removeDoc = (path: 'terms' | 'departments' | 'sections', id: string, name: string) => {
    setDeleteConfirm({ type: path, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'terms') await firestoreOps.delete(documents.term(deleteConfirm.id));
      if (deleteConfirm.type === 'departments') await firestoreOps.delete(documents.department(deleteConfirm.id));
      if (deleteConfirm.type === 'sections') await firestoreOps.delete(documents.section(deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.warn('Failed to delete', err);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Manage Institutions</h1>
            <p className="text-sm text-slate-500">Add, edit, or remove terms, departments, and sections.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {terms.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  {editingTermId === t.id ? (
                    <div className="flex-1 mr-2">
                      <Input value={editTermName} onChange={(e) => setEditTermName(e.target.value)} />
                    </div>
                  ) : (
                    <div>{t.name}</div>
                  )}
                  <div className="flex gap-2">
                    {editingTermId === t.id ? (
                      <>
                        <Button variant="outline" onClick={saveEditTerm}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingTermId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => startEditTerm(t.id, t.name)}>Edit</Button>
                        <Button variant="ghost" onClick={() => removeDoc('terms', t.id, t.name)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <Label>New term</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="e.g. 2025-2026" />
                  <Button onClick={createTerm}>Add</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departments.map(d => (
                <div key={d.id} className="flex items-center justify-between">
                  {editingDepartmentId === d.id ? (
                    <div className="flex-1 mr-2">
                      <Input value={editDepartmentName} onChange={(e) => setEditDepartmentName(e.target.value)} />
                    </div>
                  ) : (
                    <div>{d.name}</div>
                  )}
                  <div className="flex gap-2">
                    {editingDepartmentId === d.id ? (
                      <>
                        <Button variant="outline" onClick={saveEditDepartment}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingDepartmentId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => startEditDepartment(d.id, d.name)}>Edit</Button>
                        <Button variant="ghost" onClick={() => removeDoc('departments', d.id, d.name)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <Label>New department</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g. BSIE, BSECE" />
                  <Button onClick={createDepartment}>Add</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sections.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  {editingSectionId === s.id ? (
                    <div className="flex-1 mr-2 space-y-2">
                      <Input value={editSection.name} onChange={(e) => setEditSection(prev => ({ ...prev, name: e.target.value }))} />
                      <Select value={editSection.termId} onValueChange={(v) => setEditSection(prev => ({ ...prev, termId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editSection.departmentId} onValueChange={(v) => setEditSection(prev => ({ ...prev, departmentId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>{s.name}</div>
                  )}
                  <div className="flex gap-2">
                    {editingSectionId === s.id ? (
                      <>
                        <Button variant="outline" onClick={saveEditSection}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => startEditSection(s)}>Edit</Button>
                        <Button variant="ghost" onClick={() => removeDoc('sections', s.id, s.name)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <Label>New section</Label>
                <Input placeholder="Section name (e.g. 3A, 4B)" value={newSection.name} onChange={(e) => setNewSection(s => ({ ...s, name: e.target.value }))} />
                <Label>Term</Label>
                <Select value={newSection.termId} onValueChange={(v) => setNewSection(s => ({ ...s, termId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label>Department</Label>
                <Select value={newSection.departmentId} onValueChange={(v) => setNewSection(s => ({ ...s, departmentId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button onClick={createSection}>Add section</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type.slice(0, -1)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
