import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useQuery,
  getInstitutionalOverview,
  getInstitutionalTrends,
  getInstitutionalAlerts,
  getClassComparison,
  listCommunities,
} from 'wasp/client/operations';
import { useActiveWorkspace } from '../../../client/hooks/useActiveWorkspace';
import { useUserContext } from '../../../client/hooks/useUserContext';
import { SkeletonPage } from '../../../client/components/Skeletons';
import {
  Users, BookOpen, TrendingUp, Cross, FileText, ShieldCheck,
  MessageSquare, Building2, AlertTriangle, ChevronDown,
  Activity, Clock, CheckCircle, XCircle, BarChart3,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiBlock {
  label: string;
  value: number;
  delta: number | null;
  deltaLabel: string | null;
  format?: 'number' | 'percent' | 'currency' | 'days' | 'text';
  displayValue?: string;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ kpi, icon: Icon, colorClass }: { kpi: KpiBlock; icon: any; colorClass: string }) {
  const formatted = useMemo(() => {
    if (kpi.displayValue) return kpi.displayValue;
    if (kpi.format === 'text') return kpi.deltaLabel || '—';
    if (kpi.format === 'percent') return `${kpi.value}%`;
    if (kpi.format === 'days') return `${kpi.value} dias`;
    if (kpi.format === 'currency') return `R$ ${kpi.value.toFixed(2)}`;
    return kpi.value.toLocaleString('pt-BR');
  }, [kpi]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{kpi.label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold">{formatted}</p>
            {kpi.delta !== null && kpi.delta !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${
                kpi.delta > 0 ? 'text-success' : kpi.delta < 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {kpi.delta > 0 ? <ArrowUp className="h-3 w-3" /> : kpi.delta < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {kpi.deltaLabel || `${kpi.delta}%`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Domain Section ──────────────────────────────────────────────────────────

function DomainSection({ title, icon: Icon, kpis, colorClass }: {
  title: string;
  icon: any;
  kpis: KpiBlock[];
  colorClass: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} icon={Activity} colorClass={colorClass} />
        ))}
      </div>
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts?: any[] }) {
  const { t } = useTranslation('dashboard');

  if (!alerts?.length) return null;

  const severityColors: Record<string, string> = {
    critical: 'border-destructive/40 bg-destructive/5 text-destructive',
    high: 'border-orange-500/40 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300',
    medium: 'border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300',
    low: 'border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
  };

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((a: any, i: number) => (
        <div key={i} className={`rounded-lg border p-3 flex items-center gap-3 ${severityColors[a.severity] || severityColors.medium}`}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm">{a.message}</span>
            {a.count > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-background/50">{a.count}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InstitutionalDashboard() {
  const { t } = useTranslation('dashboard');
  const { workspaceId, workspaceType, workspacePlan } = useActiveWorkspace();
  const { communityId: userCommunityId } = useUserContext();

  const [scope, setScope] = useState<'diocese' | 'parish' | 'community'>(
    workspaceType === 'DIOCESE' ? 'diocese' : 'parish'
  );
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('quarter');
  const [selectedCommunityId, setSelectedCommunityId] = useState('');

  const parishIdForCommunities = workspaceType === 'PARISH' ? workspaceId : '';

  const { data: communities = [], isLoading: loadingCommunities } = useQuery(
    listCommunities,
    { parishId: parishIdForCommunities },
    { enabled: !!parishIdForCommunities },
  );

  const defaultCommunityId = useMemo(() => {
    if (communities.length === 0) return '';
    if (userCommunityId && communities.some((c: any) => c.id === userCommunityId)) {
      return userCommunityId;
    }
    return communities[0]?.id || '';
  }, [communities, userCommunityId]);

  useEffect(() => {
    if (scope !== 'community') return;
    if (!defaultCommunityId) {
      setSelectedCommunityId('');
      return;
    }
    setSelectedCommunityId((current) =>
      current && communities.some((c: any) => c.id === current) ? current : defaultCommunityId,
    );
  }, [scope, defaultCommunityId, communities]);

  const handleScopeChange = (nextScope: 'diocese' | 'parish' | 'community') => {
    setScope(nextScope);
    if (nextScope === 'community' && defaultCommunityId) {
      setSelectedCommunityId(defaultCommunityId);
    }
  };

  const queryScopeId = scope === 'community' ? selectedCommunityId : workspaceId;
  const queriesEnabled = !!queryScopeId && (scope !== 'community' || !!selectedCommunityId);

  const { data: overview, isLoading: loadingOverview, error: overviewError } = useQuery(
    getInstitutionalOverview,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const { data: trends, isLoading: loadingTrends, error: trendsError } = useQuery(
    getInstitutionalTrends,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const { data: alerts, isLoading: loadingAlerts, error: alertsError } = useQuery(
    getInstitutionalAlerts,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const { data: comparison } = useQuery(
    getClassComparison,
    { parishId: scope === 'parish' ? queryScopeId : parishIdForCommunities || '' },
    { enabled: scope === 'parish' && !!queryScopeId },
  );

  // ── Chart data ── (must be before any conditional return for hook ordering)

  const trendChartData = useMemo(() => {
    if (!trends?.enrollments?.labels) return [];
    return trends.enrollments.labels.map((label: string, i: number) => ({
      name: label,
      Matriculados: trends.enrollments.datasets[0]?.data[i] || 0,
      Evasões: trends.enrollments.datasets[1]?.data[i] || 0,
      Presença: trends.attendance?.datasets[0]?.data[i] || 0,
      Marcos: trends.sacramental?.datasets[0]?.data[i] || 0,
    }));
  }, [trends]);

  const funnelData = useMemo(() => {
    if (!overview?.sacraments) return [];
    return [
      { name: 'Jornadas ativas', value: overview.sacraments[0]?.value || 0, fill: '#8b5cf6' },
      { name: 'Marcos concluídos', value: overview.sacraments[1]?.value || 0, fill: '#a78bfa' },
      { name: 'Pendentes', value: overview.sacraments[2]?.value || 0, fill: '#c4b5fd' },
    ];
  }, [overview]);

  const scopeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (workspaceType === 'DIOCESE') options.push({ value: 'diocese', label: 'Diocese' });
    options.push({ value: 'parish', label: 'Paróquia' });
    if (workspaceType === 'PARISH') options.push({ value: 'community', label: 'Comunidade' });
    return options;
  }, [workspaceType]);

  const periodOptions = [
    { value: 'month', label: 'Mês' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Ano' },
    { value: 'all', label: 'Todo período' },
  ];

  if (scope === 'community' && loadingCommunities) {
    return <SkeletonPage />;
  }

  if (scope === 'community' && !loadingCommunities && communities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Nenhuma comunidade encontrada para este escopo.
      </div>
    );
  }

  if (scope === 'community' && !selectedCommunityId) {
    return <SkeletonPage />;
  }

  if (queriesEnabled && loadingOverview && !overview) {
    return <SkeletonPage />;
  }

  if (overviewError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
        Não foi possível carregar o painel: {overviewError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel de Gestão Pastoral</h1>
          <p className="text-muted-foreground text-sm">
            {overview?.periodLabel || ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scope Selector */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            {scopeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleScopeChange(opt.value as 'diocese' | 'parish' | 'community')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  scope === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="h-9 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {scope === 'community' && communities.length > 0 && (
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground max-w-[200px]"
            >
              {communities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} />

      {/* KPI Grid by Domain */}
      {overview && (
        <div className="space-y-6">
          <DomainSection
            title="Pessoas"
            icon={Users}
            kpis={overview.people}
            colorClass="text-primary bg-primary/10"
          />
          <DomainSection
            title="Turmas"
            icon={BookOpen}
            kpis={overview.classes}
            colorClass="text-success bg-success/10"
          />
          <DomainSection
            title="Frequência"
            icon={TrendingUp}
            kpis={overview.attendance}
            colorClass="text-warning bg-warning/10"
          />
          <DomainSection
            title="Sacramentos"
            icon={Cross}
            kpis={overview.sacraments}
            colorClass="text-secondary-foreground bg-secondary"
          />
          <DomainSection
            title="Conteúdo"
            icon={FileText}
            kpis={overview.content}
            colorClass="text-indigo-500 bg-indigo-500/10"
          />
          <DomainSection
            title="Conformidade"
            icon={ShieldCheck}
            kpis={overview.compliance}
            colorClass="text-red-500 bg-red-500/10"
          />
          <DomainSection
            title="Comunicação"
            icon={MessageSquare}
            kpis={overview.communication}
            colorClass="text-cyan-500 bg-cyan-500/10"
          />
          {overview.license && overview.license.length > 0 && (
            <DomainSection
              title="Licença"
              icon={Building2}
              kpis={overview.license}
              colorClass="text-emerald-500 bg-emerald-500/10"
            />
          )}
        </div>
      )}

      {/* Charts */}
      {trendChartData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Enrollment & Dropout Trend */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Matrículas vs Evasão
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip />
                <Line type="monotone" dataKey="Matriculados" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Evasões" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Trend */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Presença ao longo do tempo
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} className="text-muted-foreground" />
                <Tooltip />
                <Line type="monotone" dataKey="Presença" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sacramental Funnel */}
          {funnelData.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <Cross className="h-4 w-4" />
                Funil Sacramental
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={funnelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {funnelData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sacramental Milestones Trend */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Marcos Sacramentais Concluídos
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip />
                <Bar dataKey="Marcos" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Class Comparison Table (only for parish scope) */}
      {comparison && comparison.length > 0 && scope === 'parish' && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Comparativo de Turmas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                  <th className="pb-2 pr-3">Turma</th>
                  <th className="pb-2 pr-3">Etapa</th>
                  <th className="pb-2 pr-3 text-center">Inscritos</th>
                  <th className="pb-2 pr-3 text-center">Encontros</th>
                  <th className="pb-2 pr-3 text-center">Presença</th>
                  <th className="pb-2 text-center">Risco</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{c.stage}</td>
                    <td className="py-2 pr-3 text-center">{c.enrolled}</td>
                    <td className="py-2 pr-3 text-center">{c.totalMeetings}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`font-bold ${c.attendanceRate >= 75 ? 'text-success' : c.attendanceRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.riskLevel === 'BAIXO' ? 'bg-success/10 text-success' :
                        c.riskLevel === 'MÉDIO' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {c.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
