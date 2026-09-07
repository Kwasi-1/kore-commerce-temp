/**
 * useTokenRefresh
 *
 * Proactively refreshes the staff access token on app startup.
 *
 * Problem this solves:
 *   The axios interceptor in client.ts only refreshes tokens REACTIVELY — i.e.,
 *   after a protected API call returns a 401. If the user returns to the app
 *   after the token has expired, any auth-guard logic (which reads from the
 *   Zustand store, not from an API call) can redirect to /login BEFORE the
 *   interceptor ever gets a chance to silently refresh.
 *
 * Solution:
 *   On mount (before any routes render protected content), decode the stored
 *   token's `exp` claim. If it has already expired or will expire within the
 *   next 5 minutes, proactively call the /refresh endpoint and update the
 *   store. This is a "silent refresh" that keeps the user logged in.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
/** Refresh the token if it expires within this many seconds */
const REFRESH_BUFFER_SECONDS = 5 * 60; // 5 minutes

function getTokenExpirySeconds(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(atob(payloadB64));
    if (typeof payload.exp !== 'number') return null;
    return payload.exp;
  } catch {
    return null;
  }
}

/**
 * Returns:
 *  'loading'  — refresh in progress, do not render protected routes yet
 *  'done'     — refresh complete (or not needed), safe to render
 */
export function useTokenRefresh(): 'loading' | 'done' {
  const { token, refreshToken, setTokens, logout } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'done'>(() => {
    // If there's no token at all, nothing to do — skip loading state
    if (!token) return 'done';
    return 'loading';
  });

  useEffect(() => {
    if (!token) {
      setStatus('done');
      return;
    }

    const exp = getTokenExpirySeconds(token);
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Token is still valid with enough buffer — no refresh needed
    if (exp !== null && exp - nowSeconds > REFRESH_BUFFER_SECONDS) {
      setStatus('done');
      return;
    }

    // Token expired or expiring soon — try to refresh silently
    if (!refreshToken) {
      // No refresh token stored — force logout
      logout();
      setStatus('done');
      return;
    }

    (async () => {
      try {
        const response = await axios.post(
          `${API_BASE}/api/v1/auth/staff/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token, refresh_token: new_refresh_token } = response.data;

        if (!access_token) {
          throw new Error('No access token returned from refresh endpoint');
        }

        setTokens(access_token, new_refresh_token || refreshToken);
      } catch (err) {
        console.warn('[useTokenRefresh] Silent refresh failed — logging out:', err);
        logout();
      } finally {
        setStatus('done');
      }
    })();
  }, []); // Only run once on mount — intentionally empty deps

  return status;
}
