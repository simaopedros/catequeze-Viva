import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRegistrationOperationalReport, previewRegistrationRetention, useQuery } from 'wasp/client/operations';

export default function RegistrationOperationsPage() {
  const { campaignId = '' } = useParams();
  const { t } = useTranslation('public');
  const report = useQuery(getRegistrationOperationalReport, { campaignId }, { enabled: !!campaignId, retry: false });
  const retention = useQuery(previewRegistrationRetention, { campaignId }, { enabled: !!campaignId, retry: false });
  return <main className="mx-auto max-w-2xl space-y-6 p-5 text-slate-900">
    <h1 className="text-2xl font-bold">{t('operations.title')}</h1>
    <Link className="inline-flex min-h-11 items-center underline" to={`/app/inscricoes/${encodeURIComponent(campaignId)}/conferencia`}>{t('export.back')}</Link>
    <section aria-labelledby="report-title" className="space-y-2">
      <h2 id="report-title" className="text-xl font-bold">{t('operations.report')}</h2>
      <p>{t('operations.reportDescription')}</p>
      {report.isLoading && <p role="status">{t('operations.loading')}</p>}
      {report.error && <p role="alert">{t('operations.error')}</p>}
      {report.data && (report.data.counts.length ? <ul>{report.data.counts.map(({ status, count }: { status: string; count: number }) => <li key={status}>{t(`operations.status.${status}`, { defaultValue: status })}: {count}</li>)}</ul> : <p>{t('operations.empty')}</p>)}
      <Link className="inline-flex min-h-11 items-center underline" to={`/app/inscricoes/${encodeURIComponent(campaignId)}/exportar`}>{t('operations.export')}</Link>
    </section>
    <section aria-labelledby="retention-title" className="space-y-2">
      <h2 id="retention-title" className="text-xl font-bold">{t('operations.retention')}</h2>
      <p>{t('operations.simulation')}</p>
      {retention.isLoading && <p role="status">{t('operations.loading')}</p>}
      {retention.error && <p role="alert">{t('operations.error')}</p>}
      {retention.data && <dl><dt>{t('operations.expiredTokens')}</dt><dd>{retention.data.expiredTokens}</dd><dt>{t('operations.submissions')}</dt><dd>{retention.data.submissions}</dd><dt>{t('operations.protected')}</dt><dd>{retention.data.protectedSubmissions}</dd></dl>}
    </section>
  </main>;
}
