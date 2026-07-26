"use client"

import { CredentialsQrGenerator } from "@/components/CredentialsQrGenerator";

export default function CredentialsQrPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <CredentialsQrGenerator />
    </main>
  );
}