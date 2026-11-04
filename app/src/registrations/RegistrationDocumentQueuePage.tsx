import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { listRegistrationDocumentQueue } from 'wasp/client/operations';
import { button, DocumentRow } from './DocumentControls';

export default function RegistrationDocumentQueuePage() {
  const { campaignId = '' } = useParams(); const { t } = useTranslation('public'); const [status, setStatus] = useState('PENDING'); const [rows, setRows] = useState<any[]>([]); const [more, setMore] = useState(false); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false); const generation = useRef(0);
  const load = async (cursor?: string) => { const current = ++generation.current; setLoading(true); setMessage(''); try { const result = await listRegistrationDocumentQueue({ campaignId, status: status as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'QUARANTINE', take: 20, ...(cursor ? { cursor } : {}) }) as any[]; if (current !== generation.current) return; setRows(old => cursor ? [...old, ...result] : result); setMore(result.length === 20); } catch (error: any) { if (current !== generation.current) return; const code = error?.statusCode ?? error?.status ?? error?.response?.status; setMessage(code === 403 || code === 404 ? t('review.unavailable') : t('review.error')); setRows([]); setMore(false); } finally { if (current === generation.current) setLoading(false); } };
  useEffect(() => { void load(); return () => { generation.current++; }; }, [campaignId, status]);
  return <main className="mx-auto max-w-5xl space-y-4 p-5"><h1 className="text-2xl font-bold">{t('documents.queue')}</h1><label htmlFor="queue-status">{t('review.filterStatus')}</label><select id="queue-status" className="block min-h-11 rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}>{['PENDING', 'QUARANTINE', 'VERIFIED', 'REJECTED'].map(s => <option key={s} value={s}>{t(`documents.status.${s}`)}</option>)}</select><p aria-live="polite">{message}{loading && t('registration.loading')}</p><ul className="space-y-2">{rows.map(doc => <DocumentRow key={doc.id} doc={doc} onConflict={() => setMessage(t('documents.conflict'))} refresh={() => load()} />)}</ul>{more && <button className={button} disabled={loading} onClick={() => void load(rows[rows.length - 1].id)}>{t('review.loadMore')}</button>}</main>;
}
