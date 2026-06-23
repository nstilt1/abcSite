"use client";

import { useState, useEffect } from "react";
import { updateUserAttributes, fetchUserAttributes } from "aws-amplify/auth";
import { useAuthState } from "@/hooks/useAuthState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ProfileClient() {
  const { account, isAdmin, refresh } = useAuthState();

  const [screenName, setScreenName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserAttributes()
      .then((attrs) => {
        // nickname = public screen name, settable by anyone
        setScreenName(attrs.nickname ?? "");
        // preferred_username = author name shown on blog posts, admin only
        setAuthorName(attrs.preferred_username ?? attrs.name ?? "");
        setEmail(attrs.email ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updates: Record<string, string> = {
        nickname: screenName.trim(),
      };
      if (isAdmin) {
        updates.preferred_username = authorName.trim();
      }
      await updateUserAttributes({ userAttributes: updates });
      await refresh();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 space-y-6">

      {/* Public screen name — all users */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your screen name is shown publicly throughout the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted/40 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="screenName">Screen Name</Label>
            <Input
              id="screenName"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="How you appear to others"
            />
            <p className="text-xs text-muted-foreground">
              Visible to other users. Stored as{" "}
              <code className="font-mono">nickname</code> in your account.
            </p>
          </div>

          {/* Admin-only: author name shown on blog posts */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="authorName">
                  Author Name{" "}
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (admin only)
                  </span>
                </Label>
                <Input
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Name shown as the author on blog posts"
                />
                <p className="text-xs text-muted-foreground">
                  Shown as "By [name]" on any blog post you publish. Stored as{" "}
                  <code className="font-mono">preferred_username</code>.
                </p>
              </div>
            </>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Profile saved.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium">{account?.username}</span>
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}