import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Global mobile top progress bar.
 * Runs flush across the very top of the viewport (fixed top-0 left-0 right-0 z-[99999]).
 * Features:
 *  - 250ms debounce delay: Zero micro-flashes on fast mobile transitions
 *  - Unified shimmer animation: Matches the desktop sidebar loading bar design
 *  - Minimum display hysteresis: Prevents single-frame blinking
 *  - Supports programmatic triggers via startTopProgress() and doneTopProgress()
 */
export default function TopProgressBar() {
  const location = useLocation();
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = () => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleStart = () => {
    clearAllTimers();
    // Only reveal if the transition takes longer than 250ms
    delayTimerRef.current = setTimeout(() => {
      shownAtRef.current = Date.now();
      setShowLoadingBar(true);
    }, 250);
  };

  const handleDone = () => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    if (shownAtRef.current !== null) {
      // Guarantee at least 250ms of visibility so it fades out smoothly
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, 250 - elapsed);
      hideTimerRef.current = setTimeout(() => {
        setShowLoadingBar(false);
        shownAtRef.current = null;
      }, remaining);
    } else {
      setShowLoadingBar(false);
    }
  };

  // Listen to route changes to settle progress
  useEffect(() => {
    handleDone();
  }, [location.pathname, location.search]);

  // Programmatic event listeners
  useEffect(() => {
    window.addEventListener('top-progress:start', handleStart);
    window.addEventListener('top-progress:done', handleDone);

    return () => {
      clearAllTimers();
      window.removeEventListener('top-progress:start', handleStart);
      window.removeEventListener('top-progress:done', handleDone);
    };
  }, []);

  return (
    <div
      className={clsx(
        "md:hidden fixed top-0 left-0 right-0 h-[2px] bg-primary z-[99999] pointer-events-none transition-opacity duration-300",
        showLoadingBar ? "opacity-100" : "opacity-0"
      )}
      style={{ animation: showLoadingBar ? 'shimmer 1.2s infinite' : 'none' }}
    />
  );
}

export function startTopProgress() {
  window.dispatchEvent(new CustomEvent('top-progress:start'));
}

export function doneTopProgress() {
  window.dispatchEvent(new CustomEvent('top-progress:done'));
}

