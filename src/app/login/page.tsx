"use client";

import { Suspense } from "react";
import { Authenticator, CheckboxField, useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const components = {
  SignUp: {
    FormFields() {
      return (
        <>
          <Authenticator.SignUp.FormFields />
          <CheckboxField
            name="custom:newsletterOptIn"
            label="Join the mailing list"
            value="true"
            defaultChecked={false}
            className="newsletter-opt-in"
          />
        </>
      );
    },
  },
};

// Must be rendered inside <Authenticator> so useAuthenticator context exists.
function RedirectAfterSignIn() {
  const { authStatus } = useAuthenticator((ctx) => [ctx.authStatus]);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const redirectTo = searchParams.get("redirect");
    // Guard against open-redirect: only allow relative paths.
    if (redirectTo && redirectTo.startsWith("/")) {
      router.replace(redirectTo);
    } else {
      router.replace("/");
    }
  }, [authStatus, router, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in or create an account.
        </p>

        <Authenticator
          className="abc-authenticator"
          loginMechanisms={["email"]}
          components={components}
        >
          {/* Rendered only when Amplify considers the user authenticated */}
          <Suspense>
            <RedirectAfterSignIn />
          </Suspense>
        </Authenticator>
      </div>
    </main>
  );
}