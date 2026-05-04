// Firebase Register Page - src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Lock, UserCircle, GraduationCap } from 'lucide-react';
import { useEffect } from 'react';
import { db, queries } from '@/lib/firestore/collections';
import { onSnapshot } from 'firebase/firestore';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'leader' as 'leader' | 'teacher',
    termId: '',
    departmentId: '',
    sectionId: ''
  });
  
  const [terms, setTerms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [filteredSections, setFilteredSections] = useState<any[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [loadedFlags, setLoadedFlags] = useState({ terms: false, departments: false, sections: false });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { register } = useAuth();

  // Load terms, departments, sections with real-time updates
  useEffect(() => {
    let mounted = true;

    const markLoaded = (key: 'terms' | 'departments' | 'sections') => {
      setLoadedFlags((prev) => ({ ...prev, [key]: true }));
    };

    const unsubTerms = onSnapshot(
      queries.terms(),
      (termsSnap) => {
        if (mounted) {
          setTerms(termsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded('terms');
        }
      },
      (err) => {
        console.warn('Failed to load terms', err);
        if (mounted) {
          setError('Unable to load terms. Please refresh or try again later.');
          markLoaded('terms');
        }
      }
    );

    const unsubDepartments = onSnapshot(
      queries.departments(),
      (deptSnap) => {
        if (mounted) {
          setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded('departments');
        }
      },
      (err) => {
        console.warn('Failed to load departments', err);
        if (mounted) {
          setError('Unable to load departments. Please refresh or try again later.');
          markLoaded('departments');
        }
      }
    );

    const unsubSections = onSnapshot(
      queries.sections(),
      (secSnap) => {
        if (mounted) {
          setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded('sections');
        }
      },
      (err) => {
        console.warn('Failed to load sections', err);
        if (mounted) {
          setError('Unable to load sections. Please refresh or try again later.');
          markLoaded('sections');
        }
      }
    );

    return () => {
      mounted = false;
      unsubTerms();
      unsubDepartments();
      unsubSections();
    };
  }, []);

  useEffect(() => {
    if (loadedFlags.terms && loadedFlags.departments && loadedFlags.sections) {
      setLoadingInstitutions(false);
    }
  }, [loadedFlags]);

  // Filter sections based on term and department
  useEffect(() => {
    let filtered = sections;
    
    if (form.termId) {
      filtered = filtered.filter(s => s.termId === form.termId);
    }
    if (form.departmentId) {
      filtered = filtered.filter(s => s.departmentId === form.departmentId);
    }
    
    setFilteredSections(filtered);
  }, [sections, form.termId, form.departmentId]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
      // Reset dependent fields
      ...(field === 'termId' && { sectionId: '' }),
      ...(field === 'departmentId' && { sectionId: '' })
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.email || !form.password || !form.displayName) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Section is optional during signup; leaders can complete group details later

    setLoading(true);
    
    try {
      await register(form.email, form.password, {
        displayName: form.displayName,
        role: form.role,
        termId: form.termId,
        departmentId: form.departmentId,
        sectionId: form.sectionId
      });
      
      // Redirect based on role
      if (form.role === 'leader') {
        router.push('/leader/dashboard');
      } else {
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Join the Research Tracker System
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={form.role === 'leader' ? 'default' : 'outline'}
                  onClick={() => setForm(prev => ({ ...prev, role: 'leader' }))}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <UserCircle className="w-5 h-5" />
                  Research Leader
                </Button>
                <Button
                  type="button"
                  variant={form.role === 'teacher' ? 'default' : 'outline'}
                  onClick={() => setForm(prev => ({ ...prev, role: 'teacher' }))}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <UserCircle className="w-5 h-5" />
                  Teacher
                </Button>
              </div>
            </div>
            
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <Input
                  id="displayName"
                  placeholder="Enter your full name"
                  value={form.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {form.role === 'leader' && (
                <p className="text-xs text-gray-500">
                  Use a leader.pnc email if available
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            {/* Institution Details - Only for Leaders */}
            {form.role === 'leader' && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Research Group Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Term</Label>
                    <Select value={form.termId} onValueChange={(v) => handleChange('termId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!loadingInstitutions && terms.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No terms available yet.</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Department</Label>
                    <Select value={form.departmentId} onValueChange={(v) => handleChange('departmentId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!loadingInstitutions && departments.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No departments available yet.</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Section</Label>
                    <Select 
                      value={form.sectionId} 
                      onValueChange={(v) => handleChange('sectionId', v)}
                      disabled={!form.termId || !form.departmentId || filteredSections.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!loadingInstitutions && filteredSections.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No sections match the selected term/department.</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Select your section (e.g., 3A, 4B)
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Already have an account?{' '}
              <a 
                href="/login" 
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
