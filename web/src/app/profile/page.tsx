'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { queries, documents, firestoreOps } from '@/lib/firestore/collections';
import { getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [termId, setTermId] = useState(userProfile?.termId || '');
  const [departmentId, setDepartmentId] = useState(userProfile?.departmentId || '');
  const [sectionId, setSectionId] = useState(userProfile?.sectionId || '');

  const [terms, setTerms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await firestoreOps.update(documents.user(user.uid), {
        termId: termId || null,
        departmentId: departmentId || null,
        sectionId: sectionId || null,
        updatedAt: Timestamp.now()
      } as any);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Profile & Institution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Term</Label>
              <Select value={termId} onValueChange={(v) => setTermId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                  {sections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
