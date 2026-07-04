import { useQuery, getUnreadNotificationCount } from 'wasp/client/operations';
import { useUserContext } from './useUserContext';
import { usePageVisibility } from './usePageVisibility';

/**
 * Shared hook for unread notification count.
 * Centralizes the polling so TopBar and BottomNav share a single React Query observer
 * instead of duplicating requests every 15s.
 */
export function useUnreadNotificationCount() {
  const { userRole, isAdmin } = useUserContext();
  const isVisible = usePageVisibility();
  const { data } = useQuery(getUnreadNotificationCount, undefined, {
    enabled: (!!userRole || isAdmin) && isVisible,
    refetchInterval: isVisible ? 120000 : false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  return data?.count || 0;
}

