import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRegistrationCampaignShare, listRooms, getCatechistAvailability, useQuery } from 'wasp/client/operations';
import { useActiveParish } from '../client/hooks/useActiveParish';
import { useSchedulingYear } from './SchedulingCommon';
export default function RegistrationShareNavigation() {
  const { activeParishId } = useActiveParish(); const parishId = activeParishId || ''; const { t } = useTranslation('public'); const year = useSchedulingYear(parishId);
  const share = useQuery(getRegistrationCampaignShare, { parishId }, { enabled: !!parishId, retry: false });
  const rooms = useQuery(listRooms, { parishId }, { enabled: !!parishId, retry: false });
  const availability = useQuery(getCatechistAvailability, { parishId, yearId: year.yearId }, { enabled: !!parishId && !!year.yearId, retry: false });
  if (!share.data && !rooms.data && !availability.data) return null;
  return <nav aria-label={t('registration.heading')} className="flex flex-wrap gap-4 p-4">{share.data && <Link className="inline-flex min-h-11 items-center underline focus-visible:outline-2" to="/app/inscricoes">{t('registration.heading')}</Link>}{rooms.data && <Link className="inline-flex min-h-11 items-center underline focus-visible:outline-2" to="/app/salas">{t('scheduling.roomsTitle')}</Link>}{availability.data && <Link className="inline-flex min-h-11 items-center underline focus-visible:outline-2" to="/app/disponibilidade">{t('scheduling.availabilityTitle')}</Link>}</nav>;
}
