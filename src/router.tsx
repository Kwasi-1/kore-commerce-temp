import { lazy, useEffect, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

const NotFound = lazy(() => import("@/pages/not-found"));
const HomePage = lazy(() => import("@/pages/home-page"));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export const AppRouter = () => {
  // Proactively refresh the access token on startup before any route renders.
  // Returns 'loading' while a refresh is in-flight, 'done' when ready.
  const tokenStatus = useTokenRefresh();

  // While silently refreshing, render nothing — this prevents the route guards
  // from reading an expired token and redirecting to /login prematurely.
  if (tokenStatus === 'loading') return null;

  return (
    <main>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </main>
  );
};

