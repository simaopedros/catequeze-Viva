import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { exportRegistrationApplications } from 'wasp/client/operations';

const fields = ['applicationId', 'firstName', 'lastName', 'birthDate', 'status', 'offeringId', 'submittedAt'] as const;
type Field = typeof fields[number];
export default function RegistrationExportPage() {
  const { campaignId = '' } = useParams(); const { t } = useTranslation('public');
  const [selected, setSelected] = useState<Field[]>(['applicationId', 'status']);
  const [purpose, setPurpose] = useState<'REGISTRATION_MANAGEMENT' | 'INSTITUTIONAL_REPORT'>('REGISTRATION_MANAGEMENT');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected.length || busy) return; setBusy(true); setMessage('');
    try {
      const result = await exportRegistrationApplications({ campaignId, fields: selected, purpose });
      const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'inscricoes.csv'; link.click(); URL.revokeObjectURL(url);
      setMessage(t('export.success', { count: result.count }));
    } catch { setMessage(t('export.error')); } finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-2xl space-y-4 p-5 text-slate-900">
    <h1 className="text-2xl font-bold">{t('export.title')}</h1>
    <Link className="inline-flex min-h-11 items-center underline" to={`/app/inscricoes/${encodeURIComponent(campaignId)}/conferencia`}>{t('export.back')}</Link>
    <p>{t('export.description')}</p><form onSubmit={submit} className="space-y-4">
      <fieldset><legend className="font-bold">{t('export.fields')}</legend>{fields.map(field => <label key={field} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selected.includes(field)} onChange={event => setSelected(current => event.target.checked ? [...current, field] : current.filter(value => value !== field))} />{t(`export.field.${field}`)}</label>)}</fieldset>
      <label htmlFor="export-purpose">{t('export.purpose')}</label><select id="export-purpose" className="block min-h-11 w-full rounded border p-2" value={purpose} onChange={event => setPurpose(event.target.value as typeof purpose)}><option value="REGISTRATION_MANAGEMENT">{t('export.management')}</option><option value="INSTITUTIONAL_REPORT">{t('export.report')}</option></select>
      <button className="min-h-11 rounded border px-4 py-2 disabled:opacity-50" disabled={busy || !selected.length}>{t('export.download')}</button>
    </form><p role="status">{message}</p>
  </main>;
}
