import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { getRegistrationCampaignShare, useQuery } from 'wasp/client/operations';
import { useActiveParish } from '../client/hooks/useActiveParish';
import './share.css';

type Share = { id: string; title: string; parishName: string; status: string; opensAt: Date; closesAt: Date; timezone: string; url: string | null };
export function ShareCard({ campaign }: { campaign: Share }) {
  const { t, i18n } = useTranslation('public');
  const ref = useRef<HTMLDivElement>(null);
  const date = (value: Date) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: campaign.timezone }).format(new Date(value));
  const download = () => { const canvas = ref.current?.querySelector('canvas'); if (!canvas) return; const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'qr-inscricoes.png'; a.click(); };
  return <article className="registration-share-card rounded border p-5" ref={ref}>
    <p>{campaign.parishName}</p><h2 className="text-xl font-bold">{campaign.title}</h2>
    <p>{t('registration.period')}: {date(campaign.opensAt)} - {date(campaign.closesAt)} ({campaign.timezone})</p>
    {campaign.url ? <><QRCodeCanvas value={campaign.url} size={200} aria-label={t('registration.qrAlt')} /><p className="break-all">{campaign.url}</p>
      <div className="registration-share-actions flex gap-3"><button onClick={() => navigator.clipboard.writeText(campaign.url!)}>{t('registration.copy')}</button><button onClick={download}>{t('registration.download')}</button><button onClick={() => window.print()}>{t('registration.print')}</button></div></> : <p>{t('registration.draft')}</p>}
  </article>;
}
export default function RegistrationSharePage() {
  const { t } = useTranslation('public'); const { activeParishId } = useActiveParish();
  const { data, isLoading, error } = useQuery(getRegistrationCampaignShare, { parishId: activeParishId || '' }, { enabled: !!activeParishId, retry: false });
  return <main className="mx-auto max-w-3xl space-y-6 p-5"><h1 className="text-2xl font-bold">{t('registration.heading')}</h1>{isLoading ? <p>{t('registration.loading')}</p> : error ? <p>{t('registration.unavailable')}</p> : (data as Share[] | undefined)?.map(c => <ShareCard key={c.id} campaign={c} />)}</main>;
}
