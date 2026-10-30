import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from 'wasp/client/api';
import PublicDocuments from './PublicDocuments';

type Session = { protocol: string; applicants: { applicationId: string; firstName: string; status: string; documentWarningCount: number }[]; uploadSession: { token: string; expiresAt: string } | null };

export default function RegistrationFollowUpPage() {
  const { t } = useTranslation('public');
  const started = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const metas = [['robots', 'noindex, nofollow'], ['referrer', 'no-referrer']].map(([name, content]) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const created = !meta;
      if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.appendChild(meta); }
      const previous = meta.content; meta.content = content;
      return () => { if (created) meta!.remove(); else meta!.content = previous; };
    });
    return () => metas.forEach(cleanup => cleanup());
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (!token) return;
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    setLoading(true);
    api.post('/api/public/inscricoes/acompanhar/session', { token }).then(response => setSession(response.data)).catch(() => setMessage(t('followUp.invalid'))).finally(() => setLoading(false));
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!protocol.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage(t('followUp.validation')); return; }
    setLoading(true); setMessage('');
    try { await api.post('/api/public/inscricoes/acompanhar/link', { protocol: protocol.trim(), email: email.trim() }); setSent(true); }
    catch (error: any) { const code = error?.response?.status ?? error?.statusCode; if (code === 429 || code === 503) setMessage(t('followUp.tryLater')); else setSent(true); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto max-w-2xl space-y-4 px-5 py-10 text-slate-900"><h1 className="text-2xl font-bold">{t('followUp.title')}</h1><p aria-live="polite">{message}</p>
    {session ? <><p>{t('registration.protocol')}: <strong>{session.protocol}</strong></p><ul className="space-y-4">{session.applicants.map(person => <li key={person.applicationId}><h2 className="font-bold">{person.firstName.trim().split(/\s+/)[0]}</h2><p>{t(`followUp.status.${person.status}`)}</p>{person.documentWarningCount > 0 && <p>{t('followUp.documentsWarning')}</p>}{person.status === 'NEEDS_CORRECTION' && <p>{t('followUp.correction')}</p>}</li>)}</ul>{session.uploadSession ? <PublicDocuments token={session.uploadSession.token} /> : <p>{t('followUp.contactForDocuments')}</p>}</> : sent ? <p role="status">{t('followUp.sent')}</p> : <form onSubmit={submit} noValidate className="space-y-4"><div><label htmlFor="follow-protocol">{t('registration.protocol')}</label><input id="follow-protocol" maxLength={64} className="block min-h-11 w-full rounded border p-2" value={protocol} onChange={e => setProtocol(e.target.value)} /></div><div><label htmlFor="follow-email">{t('registration.email')}</label><input id="follow-email" type="email" maxLength={254} className="block min-h-11 w-full rounded border p-2" value={email} onChange={e => setEmail(e.target.value)} /></div><button className="min-h-11 rounded border px-4 py-2" disabled={loading}>{t(loading ? 'registration.sending' : 'followUp.send')}</button></form>}
  </main>;
}
