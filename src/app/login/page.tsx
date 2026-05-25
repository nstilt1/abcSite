"use client";

import { Authenticator, CheckboxField } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

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
        />
      </div>
    </main>
  );
}