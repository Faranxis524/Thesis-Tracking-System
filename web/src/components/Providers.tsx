"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
