'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, GraduationCap } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const nextPath = searchParams.get('next') || '/leader/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    
    try {
      const credential = await login(email, password);

      if (nextPath !== '/leader/dashboard') {
        router.push(nextPath);
        return;
      }

        try {
          const profileSnap = await getDoc(doc(db, 'users', credential.user.uid));
          const role = profileSnap.exists() ? profileSnap.data()?.role : null;
          // Redirect based on role
          if (role === 'teacher') {
            router.push('/teacher/dashboard');
          } else {
            router.push('/leader/dashboard');
          }
        } catch {
          // Default to teacher dashboard if the profile cannot be read yet
          router.push('/teacher/dashboard');
        }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">PNC Thesis Tracker</h1>
          <p className="text-slate-600">Research Document Management System</p>
        </div>
        
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-slate-800">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to continue to your research dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@pnc.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing In...
                  </div>
                ) : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              <p>Don't have an account?{' '}
                <a 
                  href="/register" 
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Create one
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} PNC Thesis Tracker System</p>
        </div>
      </div>
    </div>
  );
}
