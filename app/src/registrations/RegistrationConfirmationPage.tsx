import PublicDocuments from './PublicDocuments';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from 'wasp/client/api';

export default function RegistrationConfirmationPage() {
  const { t } = useTranslation('public');
  const started = useRef(false);
  const [state, setState] = useState<{ status: 'loading' | 'invalid' | 'confirmed'; protocol?: string; uploadSession?: { token: string; expiresAt: string } }>({ status: 'loading' });
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    const previous = meta.content; meta.content = 'noindex, nofollow';
    return () => { if (meta) meta.content = previous; };
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    if (!token) { setState({ status: 'invalid' }); return; }
    api.post('/api/public/inscricoes/confirm', { token }).then(response => setState({ status: 'confirmed', protocol: response.data.protocol, uploadSession: response.data.uploadSession })).catch(() => setState({ status: 'invalid' }));
  }, []);
  return <main className="mx-auto max-w-2xl px-5 py-10 text-slate-900"><h1 className="text-2xl font-bold">{t('registration.confirmTitle')}</h1><p role="status" className="mt-4">{t(`registration.confirm${state.status}`)}</p>{state.protocol && <p>{t('registration.protocol')}: <strong>{state.protocol}</strong></p>}{state.uploadSession && <PublicDocuments token={state.uploadSession.token} />}</main>;
}
