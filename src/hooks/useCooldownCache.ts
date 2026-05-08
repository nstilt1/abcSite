"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

type CachedValue<T> = {
  value: T | null;
  lastRequestAt: number | null;
};

type UseCooldownCacheReturn<T> = {
  value: T | null;
  setValue: Dispatch<SetStateAction<T | null>>;
  lastRequestAt: number | null;
  markRequested: () => void;
  isLoaded: boolean;
  isOnCooldown: boolean;
  nextAvailableAt: Date | null;
  nextAvailableText: string | null;
  remainingMs: number;
  clear: () => void;
};

function readCache<T>(key: string): CachedValue<T> {
  if (typeof window === "undefined") {
    return { value: null, lastRequestAt: null };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { value: null, lastRequestAt: null };

    const parsed = JSON.parse(raw) as CachedValue<T>;

    return {
      value: parsed.value ?? null,
      lastRequestAt: parsed.lastRequestAt ?? null,
    };
  } catch {
    return { value: null, lastRequestAt: null };
  }
}

function writeCache<T>(key: string, cache: CachedValue<T>) {
  window.localStorage.setItem(key, JSON.stringify(cache));
}

export function useCooldownCache<T>(
  key: string,
  cooldownMs: number,
): UseCooldownCacheReturn<T> {
  const [cache, setCache] = useState<CachedValue<T>>({
    value: null,
    lastRequestAt: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setCache(readCache<T>(key));
    setIsLoaded(true);
  }, [key]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const setValue: Dispatch<SetStateAction<T | null>> = useCallback(
    (next) => {
      setCache((current) => {
        const value = next instanceof Function ? next(current.value) : next;
        const updated = { ...current, value };

        if (typeof window !== "undefined") {
          writeCache(key, updated);
        }

        return updated;
      });
    },
    [key],
  );

  const markRequested = useCallback(() => {
    setCache((current) => {
      const updated = { ...current, lastRequestAt: Date.now() };

      if (typeof window !== "undefined") {
        writeCache(key, updated);
      }

      return updated;
    });
  }, [key]);

  const nextAvailableAt = useMemo(() => {
    if (!cache.lastRequestAt || cooldownMs <= 0) return null;
    return new Date(cache.lastRequestAt + cooldownMs);
  }, [cache.lastRequestAt, cooldownMs]);

  const remainingMs = nextAvailableAt
    ? Math.max(0, nextAvailableAt.getTime() - now)
    : 0;

  const isOnCooldown = remainingMs > 0;

  const nextAvailableText = nextAvailableAt
    ? nextAvailableAt.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : null;

  const clear = useCallback(() => {
    setCache({ value: null, lastRequestAt: null });
    window.localStorage.removeItem(key);
  }, [key]);

  return {
    value: cache.value,
    setValue,
    lastRequestAt: cache.lastRequestAt,
    markRequested,
    isLoaded,
    isOnCooldown,
    nextAvailableAt,
    nextAvailableText,
    remainingMs,
    clear,
  };
}