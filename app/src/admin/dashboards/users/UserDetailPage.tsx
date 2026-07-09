import { type AuthUser } from "wasp/auth";
import { useQuery, getUserAdminDetail } from "wasp/client/operations";
import { useParams } from "react-router";
import DefaultLayout from "../../layout/DefaultLayout";
import { Users, Shield, CreditCard, History, BarChart3, Building2 } from 'lucide-react';
import { NavLink } from "react-router";

const UserDetailPage = ({ user }: { user: AuthUser }) => {
  const { id } = useParams<{ id: string }>();
  const { data: u, isLoading } = useQuery(getUserAdminDetail, { id: id! });

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DefaultLayout>
    );
  }

  if (!u) {
    return (
      <DefaultLayout user={user}>
        <div className="text-center py-12 text-muted-foreground">Utilizador não encontrado.</div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NavLink to="/admin/users" className="hover:text-foreground">Utilizadores</NavLink>
          <span>/</span>
          <span className="text-foreground font-medium">{u.email}</span>
        </div>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.email}</h1>
            {u.isAdmin && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Admin</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{u.email}</p>
        </div>

        {/* Profile + Billing */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              Perfil
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Username</p><p>{u.username || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Telefone</p><p>{u.phone || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Locale</p><p>{u.locale}</p></div>
              <div><p className="text-xs text-muted-foreground">Criado em</p><p>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</p></div>
            </div>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-5">
            <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-primary" />
              Billing
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Plano</p><p className="font-medium">{u.subscriptionPlan || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{u.subscriptionStatus || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Créditos IA</p><p className="font-medium">{u.credits}</p></div>
              <div><p className="text-xs text-muted-foreground">Stripe ID</p><p className="text-xs">{u.paymentProcessorUserId || '—'}</p></div>
            </div>
          </div>
        </div>

        {/* Memberships */}
        <div className="rounded-sm border border-border/70 bg-white p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-primary" />
            Paróquias ({u.memberships?.length || 0})
          </h2>
          <div className="divide-y -mx-5">
            {(!u.memberships || u.memberships.length === 0) ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhuma paróquia.</div>
            ) : (
              u.memberships.map((m: any) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{m.parish.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.community?.name ? `Comunidade: ${m.community.name} · ` : ''}
                      {m.role} · {m.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    desde {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div className="rounded-sm border border-border/70 bg-white p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            Histórico de Acções
          </h2>
          <div className="divide-y -mx-5">
            {(!u.auditLog || u.auditLog.length === 0) ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhuma acção registada.</div>
            ) : (
              u.auditLog.map((log: any) => (
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
                  <span className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Usage */}
        {u.aiUsage && u.aiUsage.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              Uso de IA (30d)
            </h2>
            <div className="divide-y -mx-5">
              {u.aiUsage.map((d: any) => (
                <div key={d.id} className="px-5 py-2 flex items-center justify-between text-xs">
                  <span>{new Date(d.date).toLocaleDateString('pt-BR')}</span>
                  <span className="font-medium">{d.creditsUsed} créditos</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default UserDetailPage;
