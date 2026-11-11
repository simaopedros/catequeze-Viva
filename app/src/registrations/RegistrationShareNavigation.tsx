import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRegistrationCampaignShare, listRooms, getCatechistAvailability, useQuery } from 'wasp/client/operations';
import { Button } from '../client/components/ui/button';
import { useActiveParish } from '../client/hooks/useActiveParish';
import { useSchedulingYear } from './SchedulingCommon';

export default function RegistrationShareNavigation() {
  const { activeParishId } = useActiveParish();
  const parishId = activeParishId || '';
  const { t } = useTranslation('public');
  const year = useSchedulingYear(parishId);
  const share = useQuery(getRegistrationCampaignShare, { parishId }, { enabled: !!parishId, retry: false });
  const rooms = useQuery(listRooms, { parishId }, { enabled: !!parishId, retry: false });
  const availability = useQuery(getCatechistAvailability, { parishId, yearId: year.yearId }, { enabled: !!parishId && !!year.yearId, retry: false });
  const hasCampaigns = Array.isArray(share.data) && share.data.length > 0;

  if (!hasCampaigns && !rooms.data && !availability.data) return null;

  return (
    <nav aria-label={t('registration.heading')} className="flex flex-wrap gap-2 px-4 pt-4">
      {hasCampaigns && (
        <Button variant="outline" size="sm" className="min-h-11" asChild>
          <Link to="/app/inscricoes">{t('registration.heading')}</Link>
        </Button>
      )}
      {rooms.data && (
        <Button variant="outline" size="sm" className="min-h-11" asChild>
          <Link to="/app/salas">{t('scheduling.roomsTitle')}</Link>
        </Button>
      )}
      {availability.data && (
        <Button variant="outline" size="sm" className="min-h-11" asChild>
          <Link to="/app/disponibilidade">{t('scheduling.availabilityTitle')}</Link>
        </Button>
      )}
    </nav>
  );
}
