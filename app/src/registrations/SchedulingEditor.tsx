import { useTranslation } from 'react-i18next';
import { availabilitySchema, type Availability } from '../shared/scheduling';

export const field = 'block min-h-11 w-full rounded border border-slate-500 p-2 focus-visible:outline-2';
export const button = 'min-h-11 rounded border border-slate-600 px-4 py-2 focus-visible:outline-2 disabled:opacity-50';
export function validateAvailability(value: Availability): Record<string, boolean> {
  const result = availabilitySchema.safeParse(value);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map(issue => [issue.path.slice(0, 2).join('.'), true]));
}
export default function SchedulingEditor({ value, onChange, errors }: { value: Availability; onChange: (value: Availability) => void; errors: Record<string, boolean> }) {
  const { t } = useTranslation('public');
  const updateWindow = (i: number, patch: object) => onChange({ ...value, windows: value.windows.map((w, n) => n === i ? { ...w, ...patch } : w) });
  const updateClosure = (i: number, patch: object) => onChange({ ...value, closures: value.closures.map((c, n) => n === i ? { ...c, ...patch } : c) });
  return <div className="space-y-4"><fieldset><legend className="font-bold">{t('scheduling.windows')}</legend>
    {value.windows.map((w, i) => <fieldset key={i} className="my-2 rounded border p-3"><legend>{t('scheduling.windowNumber', { number: i + 1 })}</legend>
      <label>{t('scheduling.day')}<select className={field} value={w.weekday} onChange={e => updateWindow(i, { weekday: Number(e.target.value) })}>{Array.from({ length: 7 }, (_, day) => <option key={day} value={day}>{t(`scheduling.days.${day}`)}</option>)}</select></label>
      <label>{t('scheduling.start')}<input className={field} type="time" min="05:00" max="23:59" value={w.startTime} aria-invalid={!!errors[`windows.${i}`]} onChange={e => updateWindow(i, { startTime: e.target.value })} /></label>
      <label>{t('scheduling.end')}<input className={field} type="time" min="05:00" max="23:59" value={w.endTime} aria-invalid={!!errors[`windows.${i}`]} onChange={e => updateWindow(i, { endTime: e.target.value })} /></label>
      {errors[`windows.${i}`] && <p role="alert">{t('scheduling.windowError')}</p>}<button type="button" className={button} onClick={() => onChange({ ...value, windows: value.windows.filter((_, n) => n !== i) })}>{t('scheduling.remove')}</button></fieldset>)}
    {errors.windows && <p role="alert">{t('scheduling.limitError')}</p>}<button type="button" className={button} onClick={() => onChange({ ...value, windows: [...value.windows, { weekday: 0, startTime: '08:00', endTime: '09:00' }] })}>{t('scheduling.addWindow')}</button></fieldset>
    <fieldset><legend className="font-bold">{t('scheduling.closures')}</legend>{value.closures.map((c, i) => <fieldset key={i} className="my-2 rounded border p-3"><legend>{t('scheduling.closureNumber', { number: i + 1 })}</legend>
      <label>{t('scheduling.from')}<input className={field} type="date" value={c.from} aria-invalid={!!errors[`closures.${i}`]} onChange={e => updateClosure(i, { from: e.target.value })} /></label>
      <label>{t('scheduling.to')}<input className={field} type="date" value={c.to} aria-invalid={!!errors[`closures.${i}`]} onChange={e => updateClosure(i, { to: e.target.value })} /></label>
      <label>{t('scheduling.reason')}<input className={field} maxLength={120} value={c.reason || ''} onChange={e => updateClosure(i, { reason: e.target.value })} /></label>
      {errors[`closures.${i}`] && <p role="alert">{t('scheduling.closureError')}</p>}<button type="button" className={button} onClick={() => onChange({ ...value, closures: value.closures.filter((_, n) => n !== i) })}>{t('scheduling.remove')}</button></fieldset>)}
      {errors.closures && <p role="alert">{t('scheduling.limitError')}</p>}<button type="button" className={button} onClick={() => onChange({ ...value, closures: [...value.closures, { from: '', to: '', reason: '' }] })}>{t('scheduling.addClosure')}</button></fieldset></div>;
}
