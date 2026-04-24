"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hub } from "aws-amplify/utils";
import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

export type AuthAccount = {
  username: string;
  name: string | null;
  email: string | null;
  displayName: string | null;
};

export type AuthState = {
  isSignedIn: boolean;
  isAdmin: boolean;
  account: AuthAccount | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: (() => Promise<void>) | null;
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
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);

  const applySignedOutState = useCallback(() => {
    if (!mountedRef.current) return;
    setIsSignedIn(false);
    setIsAdmin(false);
    setAccount(null);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const run = (async () => {
      try {
        if (mountedRef.current) {
          setLoading(true);
        }

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

        const displayName =
          attributes.preferred_username ||
          attributes.name ||
          attributes.email ||
          user.username ||
          null;

        if (!mountedRef.current) return;

        setIsSignedIn(true);
        setIsAdmin(admin);
        setAccount({
          username: user.username,
          name: attributes.name ?? null,
          email: attributes.email ?? null,
          displayName,
        });
      } catch {
        applySignedOutState();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        lastRefreshAtRef.current = Date.now();
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = run;
    return run;
  }, [applySignedOutState]);

  const maybeRefresh = useCallback(async (minIntervalMs = 1000) => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < minIntervalMs) {
      return;
    }
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch {
      // ignore auth teardown issues in UI
    } finally {
      applySignedOutState();
    }
  }, [applySignedOutState]);

  useEffect(() => {
    mountedRef.current = true;

    void refresh();

    const cancelHub = Hub.listen("auth", ({ payload }) => {
      const event = payload?.event;

      switch (event) {
        case "signedIn":
        case "signedOut":
        case "tokenRefresh":
        case "tokenRefresh_failure":
        case "signInWithRedirect":
        case "signInWithRedirect_failure":
        case "customOAuthState":
          void refresh();
          break;
        default:
          break;
      }
    });

    const handleStorage = () => {
      // Another tab changed shared auth storage (most useful for localStorage-backed auth).
      void maybeRefresh(250);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void maybeRefresh(1000);
      }
    };

    const handleFocus = () => {
      void maybeRefresh(1000);
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      mountedRef.current = false;
      cancelHub();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [maybeRefresh, refresh]);

  return {
    isSignedIn,
    isAdmin,
    account,
    loading,
    refresh,
    signOut: isSignedIn ? signOut : null,
  };
}