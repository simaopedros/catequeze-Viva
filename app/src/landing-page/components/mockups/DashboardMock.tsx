import { AlertCircle, BookOpen, Calendar, Clock, Cross, Gift, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardMock({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-overline sm:text-xs">
      <div>
        <p className="font-bold text-sm">{t('mockup_dashboard.title')}</p>
        <p className="text-muted-foreground">{t('mockup_dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { l: t('mockup_dashboard.catechumens'), v: '142', i: Users, c: 'text-primary bg-primary/10' },
          { l: t('mockup_dashboard.active_classes'), v: '8', i: BookOpen, c: 'text-success bg-success/10' },
          { l: t('mockup_dashboard.avg_attendance'), v: '87%', i: TrendingUp, c: 'text-warning bg-warning/10' },
          { l: t('mockup_dashboard.sacraments'), v: '12', i: Cross, c: 'text-secondary-foreground bg-secondary' },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border bg-card p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-1 ${k.c}`}>
                <k.i className="h-3 w-3" />
              </div>
              <div>
                <p className="text-overline text-muted-foreground uppercase">{k.l}</p>
                <p className="font-bold text-sm">{k.v}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
          <p className="font-semibold text-primary flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" /> {t('mockup_dashboard.today')}
          </p>
          <p className="font-medium">{t('mockup_dashboard.today_class')}</p>
          <p className="text-muted-foreground">{t('mockup_dashboard.today_detail')}</p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3" /> {t('mockup_dashboard.upcoming')}
          </p>
          <p className="font-medium">{t('mockup_dashboard.upcoming_class')}</p>
          <p className="text-muted-foreground">{t('mockup_dashboard.upcoming_detail')}</p>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 flex items-start gap-2">
        <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">{t('mockup_dashboard.alerts_title')}</p>
          <p className="text-muted-foreground">{t('mockup_dashboard.alerts_subtitle')}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
          <Gift className="h-3 w-3 text-pink-500" /> {t('mockup_dashboard.birthdays')}
        </p>
        <p>{t('mockup_dashboard.birthdays_list')}</p>
      </div>
    </div>
  );
}
