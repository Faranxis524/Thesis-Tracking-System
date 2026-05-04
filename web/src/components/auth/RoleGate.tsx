// Role-Based Access Control - src/components/auth/RoleGate.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: ('leader' | 'teacher')[];
  fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userProfile) {
      if (!allowedRoles.includes(userProfile.role)) {
        // Redirect based on role
        if (userProfile.role === 'leader') {
          router.push('/leader/dashboard');
        } else if (userProfile.role === 'teacher') {
          router.push('/teacher/dashboard');
        } else {
          router.push('/unauthorized');
        }
      }
    }
  }, [user, userProfile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Specific role gates
export function LeaderGate({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={['leader']}>
      {children}
    </RoleGate>
  );
}

export function TeacherGate({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={['teacher']}>
      {children}
    </RoleGate>
  );
}
