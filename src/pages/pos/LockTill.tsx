import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Locks the till: signs the current person out and shows "Who's working?" (the login screen).
 * Replaces the old separate lock screen; kept at /pos/locked for anything that still links here.
 */
export default function LockTill() {
  const navigate = useNavigate();
  useEffect(() => {
    // logout() keeps the shop's data on a registered till (see authStore)
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  }, [navigate]);
  return null;
}
