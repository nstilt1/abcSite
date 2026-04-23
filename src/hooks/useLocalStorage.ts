"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

type UseLocalStorageReturn<T> = [T, Dispatch<SetStateAction<T>>, boolean];

export default function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const readValue = (): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error("useLocalStorage read error:", error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setStoredValue(readValue());
    setIsLoaded(true);
  }, [key]);

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      setStoredValue((currentValue) => {
        const valueToStore =
          value instanceof Function ? value(currentValue) : value;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }

        return valueToStore;
      });
    } catch (error) {
      console.error("useLocalStorage write error:", error);
    }
  };

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== key) return;

      try {
        setStoredValue(event.newValue ? (JSON.parse(event.newValue) as T) : initialValue);
      } catch (error) {
        console.error("useLocalStorage sync error:", error);
        setStoredValue(initialValue);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  return [isLoaded ? storedValue : initialValue, setValue, isLoaded];
}