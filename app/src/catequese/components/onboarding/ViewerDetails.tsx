import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { Eye, Check } from 'lucide-react';

interface ViewerDetailsProps {
  onComplete: () => void;
}

export function ViewerDetails({ onComplete }: ViewerDetailsProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />{t('viewer.title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('viewer.desc')}
      </p>
      <div className="flex justify-end">
        <Button onClick={onComplete}>
          <Check className="mr-2 h-4 w-4" />{t('viewer.confirm')}
        </Button>
      </div>
    </div>
  );
}
