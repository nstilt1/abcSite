"use client";

import { useRef } from "react";

type LongPressHandlers = {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
};

export default function useLongPress(
  callback: () => void,
  ms = 600
): LongPressHandlers {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    timeout.current = setTimeout(() => {
      callback();
    }, ms);
  };

  const stop = () => {
    if (!timeout.current) return;
    clearTimeout(timeout.current);
    timeout.current = null;
  };

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
  };
}