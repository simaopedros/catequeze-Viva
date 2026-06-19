import { useQuery, getUnreadNotificationCount } from 'wasp/client/operations';
import { useUserContext } from './useUserContext';

/**
 * Shared hook for unread notification count.
 * Centralizes the polling so TopBar and BottomNav share a single React Query observer
 * instead of duplicating requests every 15s.
 */
export function useUnreadNotificationCount() {
  const { userRole, isAdmin } = useUserContext();
  const { data } = useQuery(getUnreadNotificationCount, undefined, {
    enabled: !!userRole || isAdmin,
    refetchInterval: 30000,
  });
  return data?.count || 0;
}
