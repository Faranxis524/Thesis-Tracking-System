import { Suspense } from "react";
import { CallbackClient } from "./CallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
          <div className="text-sm text-zinc-600">Finishing sign in…</div>
        </div>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
