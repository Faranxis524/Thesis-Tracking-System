// Firebase Login Page - src/app/login/page.tsx
import { Suspense } from 'react';
import LoginForm from './login-form';
import PNCBrandShell from "@/components/PNCBrandShell";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <PNCBrandShell subtitle="Sign in to continue">
        <LoginForm />
      </PNCBrandShell>
    </Suspense>
  );
}
