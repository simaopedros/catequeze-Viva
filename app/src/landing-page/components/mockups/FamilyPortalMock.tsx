import { Bell, Calendar, CheckCircle2, FileUp, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FamilyPortalMock({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-overline sm:text-xs">
      <div>
        <p className="font-semibold text-sm">{t('mockup_family.title')}</p>
        <p className="text-muted-foreground">{t('mockup_family.greeting')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-sm border border-border/70 bg-white p-2">
          <p className="text-muted-foreground mb-0.5">Ana Silva</p>
          <p className="font-semibold">{t('mockup_family.first_eucharist')}</p>
          <p className="text-success flex items-center gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3" /> {t('mockup_family.attendance_pct')}
          </p>
        </div>
        <div className="rounded-sm border border-border/70 bg-white p-2">
          <p className="text-muted-foreground mb-0.5">Pedro Silva</p>
          <p className="font-semibold">{t('mockup_family.confirmation')}</p>
          <p className="text-warning flex items-center gap-1 mt-1">
            <XCircle className="h-3 w-3" /> {t('mockup_family.absence_recent')}
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#071A2D]/20 bg-muted/30 p-2 flex items-start gap-2">
        <Bell className="h-3.5 w-3.5 text-[#071A2D] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{t('mockup_family.notice_title')}</p>
          <p className="text-muted-foreground">{t('mockup_family.notice_text')}</p>
        </div>
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-2 space-y-2">
        <p className="font-semibold flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {t('mockup_family.next_meeting')}
        </p>
        <p>{t('mockup_family.next_meeting_detail')}</p>
        <button type="button" className="text-[#071A2D] font-medium underline underline-offset-2">
          {t('mockup_family.justify_absence')}
        </button>
      </div>

      <div className="rounded-sm border border-dashed border-border/70 bg-muted/20 p-2 flex items-center gap-2">
        <FileUp className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{t('mockup_family.send_certificate')}</p>
          <p className="text-muted-foreground">{t('mockup_family.pending_doc')}</p>
        </div>
      </div>
    </div>
  );
}
