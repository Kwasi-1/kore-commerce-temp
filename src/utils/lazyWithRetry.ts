import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy() with automatic retry handling for dynamic chunk imports.
 * When a deployment update changes asset hashes on Vercel/Render, older
 * cached app sessions attempting to load old JS chunks get a MIME type (HTML) error.
 * This helper catches that failure, performs a single window reload to pull fresh assets,
 * preventing blank screens completely.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      sessionStorage.getItem('page_chunk_reload') || 'false'
    );

    try {
      const component = await componentImport();
      sessionStorage.setItem('page_chunk_reload', 'false');
      return component;
    } catch (error: any) {
      console.warn('Dynamic import failed (possibly due to new deployment).', error);
      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem('page_chunk_reload', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}
