"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";

type AuthState = {
  isSignedIn: boolean;
  isAdmin: boolean;
  displayName: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

function normalizeGroups(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

export function useAuthState(): AuthState {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [user, attributes, session] = await Promise.all([
        getCurrentUser(),
        fetchUserAttributes(),
        fetchAuthSession(),
      ]);

      const idPayload = session.tokens?.idToken?.payload ?? {};
      const accessPayload = session.tokens?.accessToken?.payload ?? {};

      const groups = [
        ...normalizeGroups(idPayload["cognito:groups"]),
        ...normalizeGroups(accessPayload["cognito:groups"]),
      ];

      const role =
        typeof attributes["custom:role"] === "string"
          ? attributes["custom:role"].toLowerCase()
          : "";

      const admin =
        groups.some((group) => group.toLowerCase() === "admin") ||
        role === "admin";

      const name =
        attributes.preferred_username ||
        attributes.name ||
        attributes.email ||
        user.username ||
        null;

      setIsSignedIn(true);
      setIsAdmin(admin);
      setDisplayName(name);
    } catch {
      setIsSignedIn(false);
      setIsAdmin(false);
      setDisplayName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch {
      // ignore auth teardown issues in UI
    } finally {
      setIsSignedIn(false);
      setIsAdmin(false);
      setDisplayName(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    isSignedIn,
    isAdmin,
    displayName,
    loading,
    refresh,
    signOut,
  };
}