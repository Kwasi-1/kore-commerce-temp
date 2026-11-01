import { useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { isNavigationBlocked } from '@/utils/navigationGuard';

/**
 * useNavigate that first asks the current page (utils/navigationGuard), so app-shell navigation
 * (sidebar, header, notifications) can be held up by unsaved changes. Going back (-1) isn't asked.
 */
export function useGuardedNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to);
      const path = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
      if (isNavigationBlocked(path)) return;
      navigate(to, options);
    },
    [navigate],
  );
}
