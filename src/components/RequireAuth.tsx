"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
    return (
        <Suspense><RequireAuthInner>{children}</RequireAuthInner></Suspense>
    )
}

function RequireAuthInner({ children }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const session = await fetchAuthSession();
        const isSignedIn = Boolean(session.tokens?.idToken);

        if (!isSignedIn) {
          const query = searchParams.toString();
          const redirectTo = query ? `${pathname}?${query}` : pathname;

          router.replace(`/auth?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        }

        if (!cancelled) {
          setChecking(false);
        }
      } catch {
        const query = searchParams.toString();
        const redirectTo = query ? `${pathname}?${query}` : pathname;

        router.replace(`/auth?redirect=${encodeURIComponent(redirectTo)}`);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  return <>{children}</>;
}