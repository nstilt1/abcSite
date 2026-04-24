"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useAuthState } from "@/hooks/useAuthState";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: Props) {
  const auth = useAuthState();

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking account…</div>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Admin login</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in with an admin account to access the admin area.
          </p>
          <Authenticator hideSignUp />
        </div>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admins only, click here to sign out and sign in with another account.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void auth.signOut?.();
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}