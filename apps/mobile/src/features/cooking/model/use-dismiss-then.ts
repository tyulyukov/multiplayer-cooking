import { router } from "expo-router";
import { useEffect, useRef } from "react";

// One sheet at a time: close this sheet and run `next` once it has gone. Native stack keeps
// a dismissed sheet mounted until its dismiss animation ends, so the unmount is the signal.
export const useDismissThen = () => {
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pending.current?.();
    };
  }, []);

  return (next: () => void) => {
    pending.current = next;
    router.back();
  };
};
