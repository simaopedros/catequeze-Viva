import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';

export default function ActivitiesPage() {
  const { t } = useTranslation('activities');
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/app/content-library?activities=1', { replace: true });
  }, [navigate]);

  return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('redirect')}</p>
      </div>
  );
}
