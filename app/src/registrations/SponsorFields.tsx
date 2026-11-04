import { useTranslation } from 'react-i18next';

export type Sponsor = { role: 'PADRINHO' | 'MADRINHA'; name: string; fromOtherParish: boolean; parishName?: string };
export default function SponsorFields({ value, onChange, prefix, errors }: { value?: Sponsor; onChange: (value: Sponsor | undefined) => void; prefix: string; errors: Record<string, string> }) {
  const { t } = useTranslation('public');
  const sponsor = value ?? { role: 'PADRINHO' as const, name: '', fromOtherParish: false };
  const update = (patch: Partial<Sponsor>) => { const next = { ...sponsor, ...patch }; onChange(!next.name && !next.fromOtherParish && next.role === 'PADRINHO' ? undefined : next); };
  const id = `${prefix}.sponsor`;
  return <details className="rounded border p-3"><summary className="min-h-11 cursor-pointer">{t('documents.sponsor')}</summary><p>{t('documents.sponsorHelp')}</p>
    <label htmlFor={`${id}.role`}>{t('documents.role')}</label><select id={`${id}.role`} className="block min-h-11 w-full rounded border p-2" value={sponsor.role} onChange={e => update({ role: e.target.value as Sponsor['role'] })}><option value="PADRINHO">{t('documents.godfather')}</option><option value="MADRINHA">{t('documents.godmother')}</option></select>
    <label htmlFor={`${id}.name`}>{t('documents.name')}</label><input id={`${id}.name`} className="block min-h-11 w-full rounded border p-2" value={sponsor.name} onChange={e => update({ name: e.target.value })} aria-invalid={!!errors[`${id}.name`]} />{errors[`${id}.name`] && <p role="alert">{errors[`${id}.name`]}</p>}
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sponsor.fromOtherParish} onChange={e => update({ fromOtherParish: e.target.checked, parishName: undefined })} />{t('documents.otherParish')}</label>
    {sponsor.fromOtherParish && <><label htmlFor={`${id}.parishName`}>{t('documents.parishName')}</label><input id={`${id}.parishName`} className="block min-h-11 w-full rounded border p-2" value={sponsor.parishName || ''} onChange={e => update({ parishName: e.target.value })} aria-invalid={!!errors[id] || !!errors[`${id}.parishName`]} />{(errors[id] || errors[`${id}.parishName`]) && <p role="alert">{t('documents.parishRequired')}</p>}</>}
  </details>;
}
