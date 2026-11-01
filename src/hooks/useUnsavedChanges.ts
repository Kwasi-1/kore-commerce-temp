import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigationGuard } from '@/utils/navigationGuard';

/**
 * Protects a page's unsaved edits while `isDirty`: closing or reloading the tab gets the browser's
 * warning, and in-app navigation (links, sidebar, header, notifications) is held as `pendingLeave`
 * for the page to ask about (components/shared/UnsavedChanges). Going back isn't caught.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const navigate = useNavigate();
  // Where the person tried to go
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);

  // Closing or reloading the tab
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers only warn when this is set to a non-empty value (they show their own text)
      e.returnValue = 'You have unsaved changes';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Sidebar, header, bottom nav and notifications navigate in code: they ask the guard first
  useEffect(() => {
    if (!isDirty) return;
    return setNavigationGuard((to) => {
      setPendingLeave(to);
      return true;
    });
  }, [isDirty]);

  // Links (<a>): caught before the router sees the click
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingLeave(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isDirty]);

  return {
    pendingLeave,
    /** Stay on the page */
    stay: () => setPendingLeave(null),
    /** Go where they were heading (after saving or discarding) */
    leave: () => {
      const to = pendingLeave;
      setPendingLeave(null);
      if (to) navigate(to);
    },
  };
}

export type UnsavedChangesGuard = ReturnType<typeof useUnsavedChanges>;
