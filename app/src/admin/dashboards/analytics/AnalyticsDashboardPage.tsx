import { type AuthUser } from "wasp/auth";
import { useQuery, getDashboardStats, listParishes, getPaginatedUsers } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { Users, Church, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { data: stats, isLoading: loadingStats } = useQuery(getDashboardStats, {});
  const { data: parishes = [] } = useQuery(listParishes);
  const { data: usersData } = useQuery(getPaginatedUsers, { skipPages: 0, filter: {} });

  const totalUsers = usersData?.users?.length || 0;
  const totalParishes = parishes.length;
  const totalClasses = stats?.activeClasses || 0;
  const totalCatechumens = stats?.activeCatechumens || 0;

  const cards = [
    { label: 'Paróquias', value: totalParishes, icon: Church, color: 'text-blue-600 bg-blue-50' },
    { label: 'Utilizadores', value: totalUsers, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Turmas Ativas', value: totalClasses, icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
    { label: 'Catequizandos', value: totalCatechumens, icon: GraduationCap, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral da plataforma Catequese Viva.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loadingStats && card.label !== 'Paróquias' && card.label !== 'Utilizadores' ? '—' : card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Parishes list */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b font-medium flex items-center gap-2">
            <Church className="h-4 w-4 text-primary" />
            Paróquias
          </div>
          <div className="divide-y">
            {parishes.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma paróquia cadastrada.</div>
            ) : (
              parishes.map((p: any) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.city || '—'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{p._count?.memberships || 0} membros</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Utilizadores Recentes
          </div>
          <div className="divide-y">
            {(!usersData?.users || usersData.users.length === 0) ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum utilizador.</div>
            ) : (
              usersData.users.slice(0, 10).map((u: any) => (
                <div key={u.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{u.email}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {u.firstName ? `${u.firstName} ${u.lastName || ''}` : '—'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {u.isAdmin ? 'Admin' : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
