import { useState, useMemo } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { BarChart3, Users, Calendar, TrendingUp, Download, Trophy, AlertTriangle, FileText, PieChart, Activity } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, getReportsOverview } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

export default function ReportsPage() {
  const { activeParishId } = useActiveParish();
  const { data, isLoading: loading } = useQuery(getReportsOverview);
  const [tab, setTab] = useState<'presenca'|'ranking'|'grafico'>('presenca');
  const [period, setPeriod] = useState('all');

  const classReports = useMemo(() => {
    if (!data?.classReports) return [];
    let result = data.classReports;
    if (activeParishId) result = result.filter((r:any) => r.parishId === activeParishId);
    // Filter by period
    if (period !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
      else if (period === 'quarter') cutoff.setMonth(now.getMonth() - 3);
      result = result.filter((r:any) => {
        const lastMeeting = r.lastMeetingDate ? new Date(r.lastMeetingDate) : null;
        return lastMeeting && lastMeeting >= cutoff;
      });
    }
    return result;
  }, [data, activeParishId, period]);

  const handleExportCSV = () => {
    if(!classReports.length)return;
    const rows=[['Turma','Inscritos','Encontros','Presentes','Ausentes','Presença %']];
    classReports.forEach((r:any)=>rows.push([r.name,r.totalEnrolled,r.totalMeetings,r.presentCount,r.absentCount,r.attendanceRate+'%']));
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='relatorio.csv';a.click();
  };

  // Chart data for Recharts
  const chartData = useMemo(() => classReports.map((r: any) => ({
    name: r.name?.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
    Presença: r.attendanceRate,
    Ausência: 100 - r.attendanceRate,
    fullName: r.name,
    presentCount: r.presentCount,
    absentCount: r.absentCount,
    enrolled: r.totalEnrolled,
  })), [classReports]);

  const pieData = useMemo(() => {
    const total = classReports.reduce((s: number, r: any) => s + r.presentCount + r.absentCount, 0) || 1;
    const present = classReports.reduce((s: number, r: any) => s + r.presentCount, 0);
    const absent = classReports.reduce((s: number, r: any) => s + r.absentCount, 0);
    return [
      { name: 'Presentes', value: present, color: '#22c55e' },
      { name: 'Ausentes', value: absent, color: '#ef4444' },
    ];
  }, [classReports]);

  // Calculate dropout risk (classes with < 50% attendance)
  const riskClasses = useMemo(()=>{
    if(!classReports.length)return[];
    return classReports.filter((r:any)=>r.attendanceRate<50&&r.totalMeetings>2);
  },[classReports]);

  // Max bar value for chart
  const maxBar = useMemo(()=>{
    if(!classReports.length)return 100;
    return Math.max(...classReports.map((r:any)=>r.attendanceRate),100);
  },[classReports]);

  if(loading)return(
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded"/>
        <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-xl bg-muted"/>)}</div>
        <div className="h-64 rounded-xl bg-muted"/>
      </div>
    </AppShell>
  );

  return(
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <div className="flex gap-2 mt-2">
              {[{id:'presenca',l:'Presença'},{id:'ranking',l:'🏆 Ranking'},{id:'grafico',l:'📊 Gráfico'}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id as any)} className={`rounded-full px-4 py-1.5 text-xs font-medium ${tab===t.id?'bg-primary text-primary-foreground':'bg-muted'}`}>{t.l}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="mr-1 h-3 w-3"/>CSV</Button>
            <Button size="sm" variant="outline" disabled title="Exportação PDF em breve"><FileText className="mr-1 h-3 w-3"/>PDF</Button>
          </div>
        </div>

        {/* Period filter */}
        <div className="flex gap-1">
          {[{v:'all',l:'Todo período'},{v:'month',l:'Último mês'},{v:'quarter',l:'Último trimestre'}].map(p=>(
            <button key={p.v} onClick={()=>setPeriod(p.v)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${period===p.v?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{p.l}</button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          {[{l:'Total inscritos',v:data?.totalEnrolled??0,i:Users,c:'text-blue-600 bg-blue-50'},{l:'Total encontros',v:data?.totalMeetings??0,i:Calendar,c:'text-green-600 bg-green-50'},{l:'Presença média',v:(data?.avgAttendance??0)+'%',i:TrendingUp,c:'text-amber-600 bg-amber-50'}].map(k=>(
            <div key={k.l} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${k.c}`}><k.i className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground uppercase">{k.l}</p><p className="text-2xl font-bold">{k.v}</p></div></div>
            </div>
          ))}
        </div>

        {tab==='presenca'&&(
          <>
            {/* Risk alert */}
            {riskClasses.length>0&&(
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 p-4">
                <h3 className="font-semibold text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4"/>Risco de evasão</h3>
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">Turmas com presença abaixo de 50% nos últimos encontros:</p>
                <div className="flex flex-wrap gap-2">
                  {riskClasses.map((r:any)=>(
                    <Badge key={r.id} variant="destructive" className="text-[11px]">{r.name}: {r.attendanceRate}%</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card">
              <div className="p-4 border-b font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4"/>Presença por turma</div>
              {!classReports.length?<div className="p-8 text-center text-muted-foreground">Nenhuma turma.</div>:
                <div className="divide-y">{classReports.map((r:any)=>(     
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1"><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.totalEnrolled} inscritos · {r.totalMeetings} encontros</p></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold w-10 text-right">{r.attendanceRate}%</span>
                      <div className="w-28 bg-muted rounded-full h-2.5"><div className={`h-2.5 rounded-full ${r.attendanceRate>=70?'bg-green-500':r.attendanceRate>=40?'bg-amber-500':'bg-red-500'}`} style={{width:r.attendanceRate+'%'}}/></div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{r.presentCount}P / {r.absentCount}A</span>
                    </div>
                  </div>
                ))}</div>}
            </div>
          </>
        )}

        {tab==='ranking'&&(
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b font-medium flex items-center gap-2 bg-amber-50/50"><Trophy className="h-4 w-4 text-amber-600"/>Ranking de Frequência</div>
            {!classReports.length?<div className="p-8 text-center text-muted-foreground">Nenhum dado.</div>:
              <div className="divide-y">
                {[...classReports].sort((a:any,b:any)=>b.attendanceRate-a.attendanceRate).map((r:any,i:number)=>(
                  <div key={r.id} className={`p-4 flex items-center justify-between ${i===0?'bg-amber-50/30':i===1?'bg-gray-50/50':i===2?'bg-orange-50/30':''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold w-8 text-center ${i===0?'text-amber-500':i===1?'text-gray-400':i===2?'text-orange-400':'text-muted-foreground'}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span>
                      <div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.totalEnrolled} inscritos</p></div>    
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{r.attendanceRate}%</span>
                      <div className="w-24 bg-muted rounded-full h-2.5"><div className={`h-2.5 rounded-full ${r.attendanceRate>=80?'bg-amber-500':r.attendanceRate>=60?'bg-green-500':'bg-red-500'}`} style={{width:r.attendanceRate+'%'}}/></div>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {tab==='grafico'&&(
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4"/>Presença por Turma (%)</h3>
              {!classReports.length ? <p className="text-center text-muted-foreground py-8">Sem dados.</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'Presença']}
                      labelFormatter={(label: any) => {
                        const item = chartData.find((d: any) => d.name === label);
                        return item?.fullName || label;
                      }}
                    />
                    <Bar dataKey="Presença" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ausência" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie Chart */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><PieChart className="h-4 w-4"/>Distribuição Geral de Presença</h3>
              {pieData[0].value + pieData[1].value === 0 ? <p className="text-center text-muted-foreground py-8">Sem dados.</p> : (
                <ResponsiveContainer width="100%" height={280}>
                  <RPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value, 'registros']} />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
