import { Link } from 'react-router';
import { DocumentRow, StaffUpload } from './DocumentControls';
import SponsorFields, { type Sponsor } from './SponsorFields';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { listRegistrationApplications, getRegistrationApplication, reviewRegistrationApplication, createAssistedRegistration, getRegistrationReviewOptions } from 'wasp/client/operations';
import { assistedRegistrationSchema } from '../shared/registrationSubmission';

type Person = { sponsor?: Sponsor; firstName: string; lastName: string; birthDate: string; offeringId: string; windows: string[]; communityId?: string };
type Options = { windows: { id: string; label: string; startTime: string; endTime: string }[]; offerings: { id: string; name: string; audience: string }[]; communities: { id: string; name: string }[]; requiredCommunityId: string | null; status: string };
const emptyPerson = (communityId?: string): Person => ({ firstName: '', lastName: '', birthDate: '', offeringId: '', windows: [], ...(communityId ? { communityId } : {}) });
const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_CORRECTION', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN', 'REJECTED'];
const button = 'min-h-11 rounded border border-slate-600 px-4 py-2 disabled:opacity-50';
const input = 'block min-h-11 w-full rounded border border-slate-500 p-2';
const statusCode = (error: any) => error?.statusCode ?? error?.status ?? error?.response?.status;

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('public');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab' && ref.current) {
        const elements = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'));
        if (!elements.length) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === elements[0] || document.activeElement === ref.current)) { event.preventDefault(); elements[elements.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) { event.preventDefault(); elements[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="max-h-full w-full max-w-2xl overflow-auto rounded bg-white p-5 text-slate-900"><div className="flex justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" className={button} onClick={close} aria-label={t('review.close')}>×</button></div>{children}</div></div>;
}

export default function RegistrationReviewPage() {
  const { campaignId = '' } = useParams(); const { t } = useTranslation('public');
  const [rows, setRows] = useState<any[]>([]); const [status, setStatus] = useState(''); const [needsReview, setNeedsReview] = useState(false);
  const [more, setMore] = useState(false); const [loading, setLoading] = useState(false); const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null); const [detail, setDetail] = useState<any>(null); const [detailMessage, setDetailMessage] = useState(''); const [note, setNote] = useState(''); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const [assisted, setAssisted] = useState(false); const [options, setOptions] = useState<Options | null>(null);
  const generation = useRef(0);
  const load = async (cursor?: string) => {
    const current = ++generation.current; setLoading(true); setMessage('');
    try { const result = await listRegistrationApplications({ campaignId, ...(status ? { status } : {}), ...(needsReview ? { needsReview: true } : {}), ...(cursor ? { cursor } : {}), take: 20 }) as any[];
      if (current !== generation.current) return; setRows(old => cursor ? [...old, ...result] : result); setMore(result.length === 20);
    } catch (error) { if (current === generation.current) { setRows([]); setMore(false); setMessage(statusCode(error) === 403 || statusCode(error) === 404 ? t('review.unavailable') : t('review.error')); } }
    finally { if (current === generation.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { generation.current++; }; }, [campaignId, status, needsReview]);
  const openDetail = async (id: string) => { setSelected(id); setDetail(null); setNote(''); setConfirm(false); setDetailMessage(''); try { const item = await getRegistrationApplication({ id }); setDetail(item); } catch (error) { setDetailMessage(statusCode(error) === 403 || statusCode(error) === 404 ? t('review.unavailable') : t('review.error')); } };
  const decide = async (decision: string) => {
    if (!detail || busy) return; setBusy(true); setDetailMessage('');
    try { await reviewRegistrationApplication({ id: detail.id, revision: detail.revision, decision, note }); const item = await getRegistrationApplication({ id: detail.id }); setDetail(item); setNote(''); setConfirm(false); setDetailMessage(t('review.saved')); void load(); }
    catch (error) { if (statusCode(error) === 409) { try { setDetail(await getRegistrationApplication({ id: detail.id })); setDetailMessage(t('review.conflict')); void load(); } catch { setDetail(null); setDetailMessage(t('review.unavailable')); } setConfirm(false); } else setDetailMessage(statusCode(error) === 403 || statusCode(error) === 404 ? t('review.unavailable') : t('review.error')); }
    finally { setBusy(false); }
  };
  const openAssisted = async () => { setAssisted(true); setOptions(null); setDetailMessage(''); try { setOptions(await getRegistrationReviewOptions({ campaignId }) as Options); } catch (error) { setDetailMessage(statusCode(error) === 403 || statusCode(error) === 404 ? t('review.unavailable') : t('review.error')); } };
  return <main className="mx-auto max-w-5xl space-y-5 p-5 text-slate-900"><h1 className="text-2xl font-bold">{t('review.heading')}</h1>
    <Link className="inline-flex min-h-11 items-center underline" to={`/app/inscricoes/${encodeURIComponent(campaignId)}/documentos`}>{t('documents.queue')}</Link><div className="flex flex-wrap items-end gap-4"><label>{t('review.filterStatus')}<select className={input} value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('review.all')}</option>{statuses.map(s => <option key={s} value={s}>{t(`review.status.${s}`)}</option>)}</select></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={needsReview} onChange={e => setNeedsReview(e.target.checked)} />{t('review.needsReview')}</label><button className={button} onClick={openAssisted}>{t('review.assisted')}</button></div>
    <p aria-live="polite">{message}</p>{loading && <p>{t('registration.loading')}</p>}
    {!loading && !message && !rows.length && <p>{t('review.empty')}</p>}
    <ul className="space-y-3">{rows.map(row => <li key={row.id} className="rounded border p-4"><button className="min-h-11 text-left font-bold underline" onClick={() => void openDetail(row.id)}>{row.name}</button><p>{t('registration.protocol')}: {row.protocol}</p>{row.documentWarnings > 0 && <p>{t('documents.warningCount', { count: row.documentWarnings })}</p>}<p>{t('review.age')}: {row.ageAtCutoff} | {t('review.offering')}: {row.offeringName}</p><p>{t('review.windows')}: {[...row.preferredWindows].sort((a: any, b: any) => a.rank - b.rank).map((w: any) => `${w.rank}. ${w.label}`).join(', ')}</p><p>{t(`review.status.${row.status}`)} | {t(`review.source.${row.source}`)} {row.needsReview && <strong> | {t('review.needsReview')}</strong>} {row.contactVerified && <strong> | {t('review.contactVerified')}</strong>}</p></li>)}</ul>
    {more && <button className={button} disabled={loading} onClick={() => void load(rows[rows.length - 1].id)}>{t('review.loadMore')}</button>}
    {selected && <Modal title={t('review.detail')} close={() => setSelected(null)}><p aria-live="polite">{detailMessage}</p>{detail && <div className="space-y-3"><h3 className="font-bold">{detail.name} ({detail.protocol})</h3><p>{t('registration.birthDate')}: {String(detail.birthDate).slice(0, 10)} | {t('review.age')}: {detail.ageAtCutoff}</p><p>{t('review.offering')}: {detail.offeringName} | {t(`review.status.${detail.status}`)}</p><p>{t('review.windows')}: {[...detail.preferredWindows].sort((a: any, b: any) => a.rank - b.rank).map((w: any) => `${w.rank}. ${w.label}`).join(', ')}</p><p>{t('registration.contactName')}: {detail.contactName || t('review.notProvided')}</p><p>{t('registration.email')}: {detail.contactEmail || t('review.notProvided')}</p><p>{t('registration.phone')}: {detail.contactPhone || t('review.notProvided')}</p><h3 className="font-bold">{t('review.consents')}</h3><ul>{detail.consents.map((c: any, i: number) => <li key={i}>{c.kind}: {t(c.granted ? 'review.yes' : 'review.no')} | {c.textVersion} | {c.actorName} {c.actorRelationship} | {String(c.createdAt).slice(0, 10)}</li>)}</ul><h3 className="font-bold">{t('documents.heading')}</h3><p>{t('documents.warning')}</p><ul>{detail.documentChecklist?.checklist?.map((item: any) => <li key={item.type}>{t(`documents.type.${item.type}`)}: {t(`documents.state.${item.state}`)}</li>)}</ul><ul className="space-y-2">{detail.documents?.map((doc: any) => <DocumentRow key={doc.id} doc={doc} onConflict={() => setDetailMessage(t('documents.conflict'))} refresh={async () => { setDetail(await getRegistrationApplication({ id: detail.id })); void load(); }} />)}</ul><StaffUpload applicationId={detail.id} refresh={async () => { setDetail(await getRegistrationApplication({ id: detail.id })); void load(); }} /><h3 className="font-bold">{t('review.duplicates')}</h3><p>{t('review.suggestionWarning')}</p><ul>{detail.duplicateSuggestions.map((d: any) => <li key={d.id}>{d.name} {d.birthDate && `(${String(d.birthDate).slice(0, 10)})`} {d.householdName} : {t(`review.reason.${d.reason}`)}</li>)}</ul>
      <label htmlFor="review-note">{t('review.note')}</label><textarea id="review-note" className={input} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /><p>{note.length}/500</p><div className="flex flex-wrap gap-2">{detail.status === 'SUBMITTED' && <button className={button} disabled={busy} onClick={() => void decide('START_REVIEW')}>{t('review.start')}</button>}{detail.status === 'UNDER_REVIEW' && <button className={button} disabled={busy} onClick={() => void decide('REQUEST_CORRECTION')}>{t('review.correction')}</button>}{detail.status === 'NEEDS_CORRECTION' && <button className={button} disabled={busy} onClick={() => void decide('REOPEN')}>{t('review.reopen')}</button>}{['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(detail.status) && <button className={button} disabled={busy} onClick={() => setConfirm(true)}>{t('review.reject')}</button>}</div>{confirm && <div role="group" aria-label={t('review.confirmReject')}><p>{t('review.confirmReject')}</p><button className={button} disabled={busy} onClick={() => void decide('REJECT')}>{t('review.confirm')}</button> <button className={button} onClick={() => setConfirm(false)}>{t('review.cancel')}</button></div>}</div>}</Modal>}
    {assisted && <Modal title={t('review.assisted')} close={() => setAssisted(false)}><p aria-live="polite">{detailMessage}</p>{options && <AssistedForm campaignId={campaignId} options={options} onSuccess={() => void load()} />}</Modal>}
  </main>;
}

function AssistedForm({ campaignId, options, onSuccess }: { campaignId: string; options: Options; onSuccess: () => void }) {
  const { t } = useTranslation('public'); const [mode, setMode] = useState<'FAMILY' | 'ADULT'>('FAMILY');
  const [people, setPeople] = useState<Person[]>([emptyPerson(options.requiredCommunityId || undefined)]); const [contactName, setContactName] = useState(''); const [relationship, setRelationship] = useState(''); const [contactEmail, setEmail] = useState(''); const [contactPhone, setPhone] = useState(''); const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState(''); const [protocol, setProtocol] = useState(''); const [sending, setSending] = useState(false); const sendingRef = useRef(false); const attempt = useRef<{ content: string; key: string } | null>(null); const formRef = useRef<HTMLFormElement>(null);
  const update = (index: number, patch: Partial<Person>) => setPeople(old => old.map((p, i) => i === index ? { ...p, ...patch } : p));
  const attrs = (id: string) => ({ id, className: input, 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-error` : undefined });
  const error = (id: string) => errors[id] && <span id={`${id}-error`} className="text-red-700">{errors[id]}</span>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (sendingRef.current) return;
    const content = mode === 'FAMILY' ? { mode, contactName, relationship, contactEmail, contactPhone, consentConfirmedByStaff: consent, applicants: people } : { mode, contactEmail, contactPhone, consentConfirmedByStaff: consent, applicant: people[0] };
    const fingerprint = JSON.stringify(content); if (!attempt.current || attempt.current.content !== fingerprint) attempt.current = { content: fingerprint, key: crypto.randomUUID() };
    const data = { ...content, requestKey: attempt.current.key }; const parsed = assistedRegistrationSchema.safeParse(data);
    if (!parsed.success) { const next: Record<string, string> = {}; parsed.error.issues.forEach(issue => { const path = issue.path.join('.'); next[path.endsWith('.sponsor') ? `${path}.parishName` : path] = t('registration.fieldError'); }); setErrors(next); setMessage(t('review.invalid')); const first = Object.keys(next)[0]; setTimeout(() => formRef.current?.querySelector<HTMLElement>(`[id="${first}"]`)?.focus(), 0); return; }
    setErrors({}); setMessage(''); sendingRef.current = true; setSending(true);
    try { const result = await createAssistedRegistration({ campaignId, data }); setProtocol(result.protocol); onSuccess(); }
    catch (err) { setMessage(statusCode(err) === 403 || statusCode(err) === 404 ? t('review.unavailable') : t('review.sendError')); }
    finally { sendingRef.current = false; setSending(false); }
  };
  if (protocol) return <div role="status"><p>{t('registration.success')}</p><p>{t('registration.protocol')}: <strong>{protocol}</strong></p></div>;
  return <form ref={formRef} onSubmit={submit} noValidate className="space-y-4"><p>{t('review.noEmail')}</p>{options.status !== 'OPEN' && <p>{t('review.closed')}</p>}
    <fieldset><legend>{t('registration.chooseMode')}</legend>{(['FAMILY', 'ADULT'] as const).map(value => <label key={value} className="mr-4 inline-flex min-h-11 items-center gap-2"><input type="radio" name="assisted-mode" checked={mode === value} onChange={() => { setMode(value); setPeople([emptyPerson(options.requiredCommunityId || undefined)]); setErrors({}); }} />{t(`registration.mode${value}`)}</label>)}</fieldset>
    {mode === 'FAMILY' && <>{(['contactName', 'relationship'] as const).map(field => <div key={field}><label htmlFor={field}>{t(`registration.${field}`)}</label><input {...attrs(field)} value={field === 'contactName' ? contactName : relationship} onChange={e => field === 'contactName' ? setContactName(e.target.value) : setRelationship(e.target.value)} />{error(field)}</div>)}</>}
    {(['contactEmail', 'contactPhone'] as const).map(field => <div key={field}><label htmlFor={field}>{t(field === 'contactEmail' ? 'registration.email' : 'registration.phone')} ({t('review.optional')})</label><input {...attrs(field)} type={field === 'contactEmail' ? 'email' : 'tel'} value={field === 'contactEmail' ? contactEmail : contactPhone} onChange={e => field === 'contactEmail' ? setEmail(e.target.value) : setPhone(e.target.value)} />{error(field)}</div>)}
    {people.map((person, index) => { const prefix = mode === 'FAMILY' ? `applicants.${index}` : 'applicant'; return <fieldset key={index} className="space-y-3 rounded border p-4"><legend>{mode === 'FAMILY' ? t('registration.personNumber', { number: index + 1 }) : t('registration.yourDetails')}</legend>
      {(['firstName', 'lastName', 'birthDate'] as const).map(field => { const id = `${prefix}.${field}`; return <div key={field}><label htmlFor={id}>{t(`registration.${field}`)}</label><input {...attrs(id)} type={field === 'birthDate' ? 'date' : 'text'} value={person[field]} onChange={e => update(index, { [field]: e.target.value })} />{error(id)}</div>; })}
      <label htmlFor={`${prefix}.offeringId`}>{t('registration.desiredStage')}</label><select {...attrs(`${prefix}.offeringId`)} value={person.offeringId} onChange={e => update(index, { offeringId: e.target.value })}><option value="">{t('registration.selectStage')}</option>{options.offerings.filter(o => o.audience === 'BOTH' || o.audience === (mode === 'FAMILY' ? 'MINOR' : 'ADULT')).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>{error(`${prefix}.offeringId`)}
      {options.communities.length > 0 && <><label htmlFor={`${prefix}.communityId`}>{t('review.community')}</label><select {...attrs(`${prefix}.communityId`)} value={person.communityId || ''} disabled={!!options.requiredCommunityId} onChange={e => update(index, { communityId: e.target.value || undefined })}><option value="">{t('review.optional')}</option>{options.communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></>}
      <fieldset><legend>{t('registration.preferenceHelp')}</legend>{options.windows.map((w, i) => { const rank = person.windows.indexOf(w.id); return <label key={w.id} className="flex min-h-11 items-center gap-2"><input id={i === 0 ? `${prefix}.windows` : undefined} type="checkbox" checked={rank >= 0} onChange={e => update(index, { windows: e.target.checked ? [...person.windows, w.id] : person.windows.filter(id => id !== w.id) })} />{w.label} {w.startTime} - {w.endTime} {rank >= 0 && `(${rank + 1})`}</label>; })}{error(`${prefix}.windows`)}</fieldset>
      <SponsorFields prefix={prefix} value={person.sponsor} errors={errors} onChange={sponsor => { if (sponsor) update(index, { sponsor }); else setPeople(old => old.map((p, i) => { if (i !== index) return p; const { sponsor: _sponsor, ...rest } = p; return rest; })); }} />
      {mode === 'FAMILY' && people.length > 1 && <button type="button" className={button} onClick={() => setPeople(old => old.filter((_, i) => i !== index))}>{t('registration.removePerson', { number: index + 1 })}</button>}</fieldset>; })}
    {mode === 'FAMILY' && people.length < 10 && <button type="button" className={button} onClick={() => setPeople(old => [...old, emptyPerson(options.requiredCommunityId || undefined)])}>{t('registration.addPerson')}</button>}
    <label className="flex min-h-11 items-center gap-2"><input id="consentConfirmedByStaff" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{t('review.consent')}</label>{error('consentConfirmedByStaff')}<p aria-live="polite">{message}</p><button type="submit" className={button} disabled={sending || options.status !== 'OPEN'}>{t(sending ? 'registration.sending' : 'registration.submit')}</button>
  </form>;
}
