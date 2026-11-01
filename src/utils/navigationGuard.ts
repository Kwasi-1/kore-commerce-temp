/**
 * One page at a time can hold up in-app navigation (e.g. unsaved settings). The sidebar, bottom
 * nav, header buttons and useAppNavigate ask here first; the page shows its own prompt and
 * navigates itself once the person decides. Links (<a>) are caught by the page directly.
 */
type Guard = (to: string) => boolean;

let guard: Guard | null = null;

/** Set while the page has something to protect; returns a cleanup that removes it */
export function setNavigationGuard(next: Guard) {
  guard = next;
  return () => {
    if (guard === next) guard = null;
  };
}

/** True when the page took over (don't navigate) */
export function isNavigationBlocked(to: string) {
  if (!guard || to === window.location.pathname + window.location.search) return false;
  return guard(to);
}
