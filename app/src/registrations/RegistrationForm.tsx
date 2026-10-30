import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from 'wasp/client/api';
import { registrationSubmissionSchema } from '../shared/registrationSubmission';

type Person = { firstName: string; lastName: string; birthDate: string; offeringId: string; windows: string[] };
type Campaign = { windows?: { id: string; label: string; startTime: string; endTime: string }[]; stages?: { offeringId: string; name: string; audience: 'MINOR' | 'ADULT' | 'BOTH' }[] };
type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
const emptyPerson = (): Person => ({ firstName: '', lastName: '', birthDate: '', offeringId: '', windows: [] });
const siteKey = (import.meta.env.REACT_APP_TURNSTILE_SITE_KEY as string | undefined)?.trim();

export default function RegistrationForm({ slug, campaign }: { slug: string; campaign: Campaign }) {
  const { t } = useTranslation('public');
  const [mode, setMode] = useState<'FAMILY' | 'ADULT'>('FAMILY');
  const [people, setPeople] = useState<Person[]>([emptyPerson()]);
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [contactEmail, setEmail] = useState('');
  const [contactPhone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formToken, setFormToken] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ protocol: string; emailConfirmationRequired: boolean } | null>(null);
  const [resendMessage, setResendMessage] = useState('');
  const [resending, setResending] = useState(false);
  const sendingRef = useRef(false);
  const attempt = useRef<{ content: string; key: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const path = `/api/public/inscricoes/${encodeURIComponent(slug)}`;

  useEffect(() => {
    let active = true;
    api.get(`${path}/form-token`).then(r => { if (active) setFormToken(r.data.formToken); }).catch(() => { if (active) setMessage(t('registration.formUnavailable')); });
    return () => { active = false; };
  }, [path, t]);
  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    const render = () => {
      if (active && captchaRef.current && window.turnstile && widget.current === null) widget.current = window.turnstile.render(captchaRef.current, { sitekey: siteKey, callback: (token: string) => setCaptchaToken(token), 'expired-callback': () => setCaptchaToken(''), 'error-callback': () => setCaptchaToken('') });
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-registration-turnstile]');
    if (!script) { script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.dataset.registrationTurnstile = 'true'; document.head.appendChild(script); }
    script.addEventListener('load', render);
    render();
    return () => { active = false; script?.removeEventListener('load', render); if (widget.current !== null) { window.turnstile?.remove(widget.current); widget.current = null; } };
  }, []);
  const updatePerson = (index: number, patch: Partial<Person>) => setPeople(current => current.map((person, i) => i === index ? { ...person, ...patch } : person));
  const fieldError = (key: string) => errors[key] ? <span id={`${key}-error`} className="block text-red-700">{errors[key]}</span> : null;
  const attrs = (key: string) => ({ id: key, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `${key}-error` : undefined, className: 'block w-full rounded border border-slate-500 p-2' });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingRef.current) return;
    const content = mode === 'FAMILY' ? { mode, contactName, relationship, contactEmail, contactPhone, consent, applicants: people } : { mode, contactEmail, contactPhone, consent, applicant: people[0] };
    const fingerprint = JSON.stringify(content);
    if (!attempt.current || attempt.current.content !== fingerprint) attempt.current = { content: fingerprint, key: crypto.randomUUID() };
    const body = { ...content, requestKey: attempt.current.key, formToken, captchaToken, honeypot };
    const parsed = registrationSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (key === 'formToken' || key === 'captchaToken' || key === 'requestKey' || key === 'honeypot') continue;
        next[key] = t('registration.fieldError');
      }
      setErrors(next);
      if (!formToken || !captchaToken || !siteKey) setMessage(t('registration.formUnavailable'));
      const first = Object.keys(next)[0];
      if (first) setTimeout(() => formRef.current?.querySelector<HTMLElement>(`[id="${first}"]`)?.focus(), 0);
      return;
    }
    setErrors({}); setMessage(''); sendingRef.current = true; setSending(true);
    try { const response = await api.post(`${path}/submissions`, body); setResult(response.data); }
    catch (error: any) {
      const status = error?.response?.status;
      setMessage(status === 429 || status === 503 ? t('registration.tryLater') : status === 400 ? t('registration.invalid') : t('registration.sendError'));
      setCaptchaToken(''); if (widget.current !== null) window.turnstile?.reset(widget.current);
    } finally { sendingRef.current = false; setSending(false); }
  };
  const resend = async () => {
    if (resending || !result) return;
    setResending(true);
    try { await api.post(`${path}/resend-confirmation`, { protocol: result.protocol, email: contactEmail }); setResendMessage(t('registration.resendAccepted')); }
    catch (error: any) { setResendMessage(error?.response?.status === 429 || error?.response?.status === 503 ? t('registration.tryLater') : t('registration.resendAccepted')); }
    finally { setResending(false); }
  };
  if (result) return <section className="mt-6 space-y-3" role="status"><h2 className="text-xl font-bold">{t('registration.success')}</h2><p>{t('registration.protocol')}: <strong>{result.protocol}</strong></p><button type="button" onClick={() => void navigator.clipboard.writeText(result.protocol)} className="rounded border px-4 py-2">{t('registration.copyProtocol')}</button>{result.emailConfirmationRequired && <><p>{t('registration.confirmEmail')}</p><button type="button" disabled={resending} onClick={resend} className="rounded border px-4 py-2">{t('registration.resend')}</button><p>{resendMessage}</p></>}</section>;
  const stages = campaign.stages?.filter(stage => stage.audience === 'BOTH' || stage.audience === (mode === 'FAMILY' ? 'MINOR' : 'ADULT')) || [];
  return <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-5">
    <fieldset><legend className="font-semibold">{t('registration.chooseMode')}</legend>{(['FAMILY', 'ADULT'] as const).map(value => <label key={value} className="mr-4 inline-flex gap-2"><input type="radio" name="mode" checked={mode === value} onChange={() => { setMode(value); setPeople([emptyPerson()]); setErrors({}); }} />{t(`registration.mode${value}`)}</label>)}</fieldset>
    {mode === 'FAMILY' && <><div><label htmlFor="contactName">{t('registration.contactName')}</label><input {...attrs('contactName')} value={contactName} onChange={e => setContactName(e.target.value)} />{fieldError('contactName')}</div><div><label htmlFor="relationship">{t('registration.relationship')}</label><input {...attrs('relationship')} value={relationship} onChange={e => setRelationship(e.target.value)} />{fieldError('relationship')}</div></>}
    <p>{t('registration.contactHelp')}</p><div><label htmlFor="contactEmail">{t('registration.email')}</label><input {...attrs('contactEmail')} type="email" autoComplete="email" value={contactEmail} onChange={e => setEmail(e.target.value)} />{fieldError('contactEmail')}</div><div><label htmlFor="contactPhone">{t('registration.phone')}</label><input {...attrs('contactPhone')} type="tel" autoComplete="tel" value={contactPhone} onChange={e => setPhone(e.target.value)} />{fieldError('contactPhone')}</div>
    {people.map((person, index) => { const prefix = mode === 'FAMILY' ? `applicants.${index}` : 'applicant'; return <fieldset key={index} className="space-y-3 rounded border p-4"><legend className="font-semibold">{mode === 'FAMILY' ? t('registration.personNumber', { number: index + 1 }) : t('registration.yourDetails')}</legend>
      {(['firstName', 'lastName', 'birthDate'] as const).map(field => { const key = `${prefix}.${field}`; return <div key={key}><label htmlFor={key}>{t(`registration.${field}`)}</label><input {...attrs(key)} type={field === 'birthDate' ? 'date' : 'text'} value={person[field]} onChange={e => updatePerson(index, { [field]: e.target.value })} />{fieldError(key)}</div>; })}
      <div><label htmlFor={`${prefix}.offeringId`}>{t('registration.desiredStage')}</label><select {...attrs(`${prefix}.offeringId`)} value={person.offeringId} onChange={e => updatePerson(index, { offeringId: e.target.value })}><option value="">{t('registration.selectStage')}</option>{stages.map(stage => <option key={stage.offeringId} value={stage.offeringId}>{stage.name}</option>)}</select>{fieldError(`${prefix}.offeringId`)}</div>
      <fieldset><legend>{t('registration.preferenceHelp')}</legend>{campaign.windows?.map((window, windowIndex) => { const rank = person.windows.indexOf(window.id); return <label key={window.id} className="flex gap-2 py-1"><input id={windowIndex === 0 ? `${prefix}.windows` : undefined} type="checkbox" checked={rank !== -1} aria-invalid={!!errors[`${prefix}.windows`]} aria-describedby={errors[`${prefix}.windows`] ? `${prefix}.windows-error` : undefined} onChange={e => updatePerson(index, { windows: e.target.checked ? [...person.windows, window.id] : person.windows.filter(id => id !== window.id) })} />{window.label}: {window.startTime} - {window.endTime}{rank !== -1 && ` (${rank + 1})`}</label>; })}{fieldError(`${prefix}.windows`)}</fieldset>
      {mode === 'FAMILY' && people.length > 1 && <button type="button" className="rounded border px-3 py-2" onClick={() => setPeople(current => current.filter((_, i) => i !== index))}>{t('registration.removePerson', { number: index + 1 })}</button>}
    </fieldset>; })}
    {mode === 'FAMILY' && people.length < 10 && <button type="button" className="rounded border px-4 py-2" onClick={() => setPeople(current => [...current, emptyPerson()])}>{t('registration.addPerson')}</button>}
    <div><label className="flex gap-2"><input id="consent" type="checkbox" checked={consent} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'consent-error' : undefined} onChange={e => setConsent(e.target.checked)} />{t(mode === 'FAMILY' ? 'registration.consentFamily' : 'registration.consentAdult')}</label><small>{t('registration.consentVersion')}</small>{fieldError('consent')}</div>
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}><input tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></div>
    {siteKey ? <div ref={captchaRef} /> : <p role="alert">{t('registration.formUnavailable')}</p>}
    {message && <p role="alert">{message}</p>}<button type="submit" disabled={sending || !siteKey || !formToken} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{t(sending ? 'registration.sending' : 'registration.submit')}</button>
  </form>;
}
