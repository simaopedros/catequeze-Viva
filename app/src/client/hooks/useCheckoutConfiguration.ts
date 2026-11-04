import { useAuth } from 'wasp/client/auth';
import { useQuery, getPlanCatalog } from 'wasp/client/operations';
import { hotmartCheckoutUrl, type CheckoutConfiguration } from '../../shared/hotmartCheckout';

export function useCheckoutConfiguration() {
  const { data: user } = useAuth();
  const query = useQuery(getPlanCatalog);
  const config = query.data?.[0]?.checkoutConfiguration as CheckoutConfiguration | undefined;
  return {
    config,
    isLoading: query.isLoading,
    checkoutUrl: (plan: string, interval = 'monthly') => hotmartCheckoutUrl(config, plan, interval, user),
  };
}
