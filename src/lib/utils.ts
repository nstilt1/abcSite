import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debug(value: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.log(value);
  }
}