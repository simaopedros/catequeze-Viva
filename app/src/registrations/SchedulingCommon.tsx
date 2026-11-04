import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listCatecheticalYears, useQuery } from 'wasp/client/operations';
import { field } from './SchedulingEditor';
export function useSchedulingYear(parishId: string) {
  const { data } = useQuery(listCatecheticalYears);
  const years = ((data || []) as any[]).filter(y => y.parishId === parishId);
  const [yearId, setYearId] = useState('');
  useEffect(() => { setYearId(''); }, [parishId]);
  const selected = years.some(y => y.id === yearId) ? yearId : (years.find(y => y.active)?.id || years[0]?.id || '');
  return { years, yearId: selected, setYearId };
}
export function YearSelect({ years, yearId, setYearId }: { years: any[]; yearId: string; setYearId: (id: string) => void }) {
  const { t } = useTranslation('public');
  return <label>{t('scheduling.year')}<select className={field} value={yearId} onChange={e => setYearId(e.target.value)}><option value="">{t('scheduling.selectYear')}</option>{years.map(y => <option key={y.id} value={y.id}>{y.name || y.year}</option>)}</select></label>;
}
export const statusCode = (error: any) => error?.statusCode ?? error?.status ?? error?.response?.status;
