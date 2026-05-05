'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { queries, documents, firestoreOps } from '@/lib/firestore/collections';
import { getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import type { Term, Department, Section } from '@/types/firestore';

export default function ProfilePage() {
  const { user, userProfile, updateDisplayName, updatePassword } = useAuth();
  const router = useRouter();
  const dashboardPath = userProfile?.role === 'teacher' ? '/teacher/dashboard' : '/leader/dashboard';

  const [termId, setTermId] = useState(userProfile?.termId || '');
  const [departmentId, setDepartmentId] = useState(userProfile?.departmentId || '');
  const [sectionId, setSectionId] = useState(userProfile?.sectionId || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [newPassword, setNewPassword] = useState('');

  const [terms, setTerms] = useState<Term[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const termsSnap = await getDocs(queries.terms());
        const termsData = termsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (mounted) setTerms(termsData);

        const departmentsSnap = await getDocs(queries.departments());
        const departmentsData = departmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (mounted) setDepartments(departmentsData);

        const sectionsSnap = await getDocs(queries.sections());
        const sectionsData = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (mounted) setSections(sectionsData);
      } catch (err) {
        console.warn('Could not load institution lists:', err);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSaveAccount = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (displayName.trim() && displayName.trim() !== (userProfile?.displayName ?? '')) {
        await updateDisplayName(displayName);
      }
      if (newPassword.trim()) {
        await updatePassword(newPassword);
        setNewPassword('');
      }
      setSuccess('Account updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update account';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await firestoreOps.update(documents.user(user.uid), {
        termId: termId || null,
        departmentId: departmentId || null,
        sectionId: sectionId || null,
        updatedAt: Timestamp.now()
      } as Record<string, unknown>);
      router.refresh();
      setSuccess('Profile updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Update your account and institution details.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(dashboardPath)}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="mx-auto w-full max-w-5xl bg-white/85 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(error || success) && (
              <Alert variant={error ? 'destructive' : 'default'}>
                <AlertDescription>{error ?? success}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Account</div>
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveAccount} disabled={saving}>
                    {saving ? 'Saving...' : 'Save account'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Institution</div>
              <p className="mt-2 text-sm text-slate-500">
                Keep your term, department, and section updated.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <Label>Term</Label>
                  <Select value={termId} onValueChange={(v) => setTermId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((t, index) => (
                        <SelectItem key={t.id || index} value={t.id || 'unknown'}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Select value={departmentId} onValueChange={(v) => setDepartmentId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d, index) => (
                        <SelectItem key={d.id || index} value={d.id || 'unknown'}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Section</Label>
                  <Select value={sectionId} onValueChange={(v) => setSectionId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s, index) => (
                        <SelectItem key={s.id || index} value={s.id || 'unknown'}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
