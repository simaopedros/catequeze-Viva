import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRegistrationCampaignShare, useQuery } from 'wasp/client/operations';
import { useActiveParish } from '../client/hooks/useActiveParish';

export default function RegistrationShareNavigation() {
  const { activeParishId } = useActiveParish();
  const { t } = useTranslation('public');
  const { data } = useQuery(getRegistrationCampaignShare, { parishId: activeParishId || '' }, { enabled: !!activeParishId, retry: false });
  if (!data) return null;
  return <nav aria-label={t('registration.heading')} className="p-4"><Link className="underline focus-visible:outline-2" to="/app/inscricoes">{t('registration.heading')}</Link></nav>;
}
