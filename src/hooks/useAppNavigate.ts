import { useTransition, useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { startTopProgress } from '@/components/shared/TopProgressBar';

/**
 * Drop-in replacement for useNavigate that wraps route transitions in React 18
 * startTransition and triggers the top progress bar.
 * Keeps the active page mounted during lazy-loaded chunk fetches.
 */
export function useAppNavigate() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const appNavigate = useCallback(
    (to: To | number, options?: NavigateOptions) => {
      // Trigger top loading bar progress for route transitions
      if (typeof to === 'string' || (typeof to === 'object' && to !== null)) {
        startTopProgress();
      }

      startTransition(() => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      });
    },
    [navigate, startTransition]
  );

  return appNavigate;
}
