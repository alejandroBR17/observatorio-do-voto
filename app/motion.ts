'use client';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scrollBehavior(): ScrollBehavior {
  return reducedMotion() ? 'auto' : 'smooth';
}
// Keep exiting surfaces mounted until their CSS animation finishes.
export function usePresence(open: boolean, duration = 260) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), reducedMotion() ? 0 : duration);
    return () => clearTimeout(timer);
  }, [open, duration]);
  return open || mounted;
}
export function transitionPage(update: () => void) {
  // Commit one page at a time. Its keyed entrance animates only the new content;
  // fixed navigation stays live instead of being captured in document snapshots.
  flushSync(update);
}
