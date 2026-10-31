import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { button } from './SchedulingEditor';

type Props = {
  excess: number;
  busy: boolean;
  onConfirm: () => void;
};

/** Explicit approval is required for each publication, including any excess capacity. */
export default function PublicationConfirmation({ excess, busy, onConfirm }: Props) {
  const { t } = useTranslation('classes');
  const [approved, setApproved] = useState(false);
  return <section aria-labelledby="publication-heading" className="space-y-3 rounded border p-4">
    <h2 id="publication-heading" className="text-xl font-bold">{t('publication.title')}</h2>
    <p>{t('publication.description')}</p>
    {excess > 0 && <p role="alert">{t('publication.excess', { count: excess })}</p>}
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />
      {t('publication.approval')}
    </label>
    <button type="button" className={button} disabled={busy || !approved} onClick={onConfirm}>{t('publication.confirm')}</button>
  </section>;
}
