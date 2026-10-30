import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCatechistAvailability, listCatechistAvailability, setCatechistAvailability, useQuery } from 'wasp/client/operations';
import { useActiveParish } from '../client/hooks/useActiveParish';
import { emptyAvailability, type Availability } from '../shared/scheduling';
import SchedulingEditor, { button, validateAvailability } from './SchedulingEditor';
import { statusCode, useSchedulingYear, YearSelect } from './SchedulingCommon';
export default function CatechistAvailabilityPage() {
  const { t } = useTranslation('public'); const { activeParishId } = useActiveParish(); const parishId = activeParishId || '';
  const year = useSchedulingYear(parishId); const [userId, setUserId] = useState<string | undefined>();
  const args = { parishId, yearId: year.yearId, ...(userId ? { userId } : {}) };
  const enabled = !!parishId && !!year.yearId;
  const current = useQuery(getCatechistAvailability, args, { enabled, retry: false });
  const team = useQuery(listCatechistAvailability, { parishId, yearId: year.yearId }, { enabled, retry: false });
  const [value, setValue] = useState<Availability>(emptyAvailability()); const [revision, setRevision] = useState(0); const [errors, setErrors] = useState<Record<string, boolean>>({}); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setUserId(undefined); }, [parishId, year.yearId]);
  useEffect(() => { if (current.data) { setValue(current.data.availability as Availability); setRevision(current.data.revision); setErrors({}); setMessage(''); } }, [current.data]);
  const save = async () => { const invalid = validateAvailability(value); setErrors(invalid); if (Object.keys(invalid).length) { setMessage(t('scheduling.invalid')); return; } setBusy(true); setMessage(''); try { const result = await setCatechistAvailability({ ...args, revision, availability: value }); setRevision(result.revision); setMessage(t('scheduling.saved')); void team.refetch(); } catch (error) { setMessage(t(statusCode(error) === 409 ? 'scheduling.availabilityConflict' : 'scheduling.error')); } finally { setBusy(false); } };
  return <main className="mx-auto max-w-4xl space-y-5 p-5"><h1 className="text-2xl font-bold">{t('scheduling.availabilityTitle')}</h1><YearSelect {...year} />
    {team.data && <section><h2 className="text-xl font-bold">{t('scheduling.team')}</h2><button className={button} onClick={() => setUserId(undefined)}>{t('scheduling.mine')}</button><ul>{team.data.map((person: any) => <li key={person.userId}><button className={button} onClick={() => setUserId(person.userId)}>{person.name}: {t(person.declared ? 'scheduling.declared' : 'scheduling.notDeclared')}, {t('scheduling.windowCount', { count: person.windows.length })}</button></li>)}</ul></section>}
    <p aria-live="polite">{message}</p>{current.error && <p>{t('scheduling.unavailable')}</p>}{current.data && <section><h2 className="text-xl font-bold">{userId ? team.data?.find((p: any) => p.userId === userId)?.name : t('scheduling.mine')}</h2>{value.windows.length === 0 && <p>{t('scheduling.emptyAvailability')}</p>}<SchedulingEditor value={value} onChange={setValue} errors={errors} /><button className={button} disabled={busy} onClick={() => void save()}>{t('scheduling.save')}</button></section>}</main>;
}
