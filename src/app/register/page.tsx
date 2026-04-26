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
            name="custom:newsletter_opt_in"
            label="Join the mailing list"
            value="false"
          />
        </>
      );
    },
  },
};

export default function RegisterPage() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Create account</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Create an account and verify your email address.
        </p>

        <Authenticator
          className="abc-authenticator"
          initialState="signUp"
          loginMechanisms={["email"]}
          components={components}
        />
      </div>
    </main>
  );
}