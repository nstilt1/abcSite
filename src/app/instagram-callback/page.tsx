"use client"

import { useMemo } from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge"; // optional but helps

export default function InstagramCallbackPage() {
  const result = useMemo(() => {
    const parameters = new URLSearchParams(window.location.search);

    const error = parameters.get("error");
    const errorDescription = parameters.get("error_description");
    const code = parameters.get("code")?.replace(/#_$/, "");

    if (error) {
      return {
        code: null,
        message:
          errorDescription ??
          `Instagram authorization failed: ${error}`,
      };
    }

    if (!code) {
      return {
        code: null,
        message: "Instagram did not return an authorization code.",
      };
    }

    return {
      code,
      message:
        "Instagram authorization succeeded. Copy this code immediately.",
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">
        Instagram authorization
      </h1>

      <p className="text-muted-foreground">{result.message}</p>

      {result.code && (
        <textarea
          readOnly
          value={result.code}
          className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-sm"
          aria-label="Instagram authorization code"
        />
      )}
    </main>
  );
}