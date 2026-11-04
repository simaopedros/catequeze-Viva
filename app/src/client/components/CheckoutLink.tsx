import { Link, type LinkProps } from 'react-router';
import { useCheckoutConfiguration } from '../hooks/useCheckoutConfiguration';

/** Sales links share the same public checkout policy as BillingPage. */
export function CheckoutLink({ to, ...props }: LinkProps) {
  const { checkoutUrl } = useCheckoutConfiguration();
  const target = typeof to === 'string' ? to : '';
  const [path, search] = target.split('?');
  const params = new URLSearchParams(search);
  const isSale = path === '/signup' || (path === '/app/billing' && params.has('plan'));
  const url = isSale ? checkoutUrl(params.get('plan') || 'single', params.get('interval') || 'monthly') : null;
  if (url) return <a {...props} href={url} target="_blank" rel="noopener noreferrer" />;
  return <Link {...props} to={to} />;
}
