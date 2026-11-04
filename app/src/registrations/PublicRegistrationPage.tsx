import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from 'wasp/client/api';

type Campaign = { status: 'open' | 'upcoming' | 'closed'; title: string; parishName: string; publicContact: string | null; publicDescription?: string | null; opensAt?: string; closesAt?: string; timezone?: string; windows?: { id: string; weekday: number; startTime: string; endTime: string; label: string }[]; stages?: string[] };

export default function PublicRegistrationPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation('public');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/api/public/inscricoes/${encodeURIComponent(slug || '')}`).then(r => { if (active) setCampaign(r.data); }).catch(() => { if (active) setCampaign(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    const previous = meta.content;
    meta.content = 'noindex, nofollow';
    return () => { if (meta) meta.content = previous; };
  }, []);
  const date = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: campaign?.timezone }).format(new Date(value));
  return <main className="mx-auto max-w-2xl px-5 py-10 text-slate-900">
    {loading ? <p role="status">{t('registration.loading')}</p> : !campaign ? <h1 className="text-2xl font-bold">{t('registration.unavailable')}</h1> : <>
      <p>{campaign.parishName}</p><h1 className="mt-2 text-3xl font-bold">{campaign.title}</h1>
      <p className="mt-4 font-semibold">{t(`registration.${campaign.status}`)}</p>
      {campaign.publicDescription && campaign.status !== 'closed' && <p className="mt-4 whitespace-pre-wrap">{campaign.publicDescription}</p>}
      {campaign.publicContact && <p className="mt-4 whitespace-pre-wrap">{campaign.publicContact}</p>}
      {campaign.status !== 'closed' && <>
        {campaign.opensAt && campaign.closesAt && <p className="mt-4">{t('registration.period')}: {date(campaign.opensAt)} - {date(campaign.closesAt)} ({campaign.timezone})</p>}
        <section className="mt-6"><h2 className="text-xl font-semibold">{t('registration.windows')}</h2><ul className="list-disc pl-6">{campaign.windows?.map(w => <li key={w.id}>{w.label}: {w.startTime} - {w.endTime}</li>)}</ul></section>
        <section className="mt-6"><h2 className="text-xl font-semibold">{t('registration.stages')}</h2><ul className="list-disc pl-6">{campaign.stages?.map((s, i) => <li key={i}>{s}</li>)}</ul></section>
        <button disabled className="mt-6 rounded bg-slate-200 px-4 py-2 text-slate-700">{t('registration.soon')}</button><p className="mt-2">{t('registration.soonExplanation')}</p>
      </>}
    </>}
  </main>;
}
