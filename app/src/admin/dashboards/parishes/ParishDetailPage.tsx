import { type AuthUser } from "wasp/auth";
import { useQuery, getParishAdminDetail } from "wasp/client/operations";
import { useParams } from "react-router";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { Church, Building2, Users, GraduationCap, MapPin, BadgeCheck, CircleDot, AlertTriangle, History, ArrowLeft, Crown } from 'lucide-react';
import { NavLink } from "react-router";

const ParishDetailPage = ({ user }: { user: AuthUser }) => {
  const { id } = useParams<{ id: string }>();
  const { data: parish, isLoading } = useQuery(getParishAdminDetail, { id: id! });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <BadgeCheck className="h-3.5 w-3.5 text-[#071A2D]" />;
      case 'TRIAL': return <CircleDot className="h-3.5 w-3.5 text-[#071A2D]" />;
      case 'PAST_DUE': return <AlertTriangle className="h-3.5 w-3.5 text-[#8A6418]" />;
      case 'CANCELED': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
        </div>
      </DefaultLayout>
    );
  }

  if (!parish) {
    return (
      <DefaultLayout user={user}>
        <div className="text-center py-12 text-muted-foreground">Paróquia não encontrada.</div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NavLink to="/admin/parishes" className="hover:text-foreground">Paróquias</NavLink>
          <span>/</span>
          <span className="text-foreground font-medium">{parish.name}</span>
        </div>

        <AppPageHeader
          eyebrow="Admin · Paróquias"
          title={parish.name}
          subtitle={[
            !parish.active ? "Arquivada" : null,
            parish.city,
            parish.diocese?.name,
            parish.owner?.email,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <NavLink
              to={`/app`}
              className="inline-flex h-10 items-center gap-1 rounded-sm bg-[#071A2D] px-3 text-xs text-white hover:bg-[#0a2540]"
            >
              Abrir no App →
            </NavLink>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AppMetric label="Turmas" value={parish._count?.classes || 0} className="bg-white" />
          <AppMetric label="Catequizandos" value={parish._count?.catechumens || 0} className="bg-white" />
          <AppMetric label="Membros" value={parish._count?.memberships || 0} className="bg-white" />
          <AppMetric label="Comunidades" value={parish._count?.communities || 0} className="bg-white" />
          <AppMetric label="Campanhas" value={parish._count?.messageCampaigns || 0} className="bg-white" />
        </div>

        {/* Billing */}
        <div className="rounded-sm border border-border/70 bg-white p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <CircleDot className="h-4 w-4 text-[#071A2D]" />
            Licença
          </h2>
          {parish.billing ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="font-medium">{parish.billing.plan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium flex items-center gap-1">{statusIcon(parish.billing.status)}{parish.billing.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trial até</p>
                <p className="font-medium">{parish.billing.trialEndsAt ? new Date(parish.billing.trialEndsAt).toLocaleDateString('pt-BR') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Limites</p>
                <p className="font-medium">{parish.billing.maxClasses || 'default'} turmas / {parish.billing.maxCatechumens || 'default'} catequizandos</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem licença registada.</p>
          )}
        </div>

        {/* Members */}
        <div className="rounded-sm border border-border/70 bg-white p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[#071A2D]" />
            Membros ({parish.members?.length || 0})
          </h2>
          <div className="divide-y -mx-5">
            {(!parish.members || parish.members.length === 0) ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhum membro ativo.</div>
            ) : (
              parish.members.map((m: any) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.user.email}</p>
                    <p className="text-xs text-muted-foreground">{m.user.firstName ? `${m.user.firstName} ${m.user.lastName || ''}` : '—'}</p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{m.role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit */}
        <div className="rounded-sm border border-border/70 bg-white p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-[#071A2D]" />
            Actividade Recente
          </h2>
          <div className="divide-y -mx-5">
            {(!parish.recentAudit || parish.recentAudit.length === 0) ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhuma actividade registada.</div>
            ) : (
              parish.recentAudit.map((log: any) => (
                <div key={log.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground ml-2">{log.entityType}</span>
                    {log.metadata && (
                      <span className="text-muted-foreground ml-2">
                        {(() => { try { return JSON.parse(log.metadata).operation || ''; } catch { return ''; } })()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{log.user?.email || '—'}</span>
                    <span>{new Date(log.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ParishDetailPage;
