import { type AuthUser } from "wasp/auth";
import { useQuery, listParishes } from "wasp/client/operations";
import { NavLink } from "react-router";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import {
  Church,
  MapPin,
  Users,
  Crown,
  Building2,
  BadgeCheck,
  AlertTriangle,
  CircleDot,
  ChevronRight,
} from "lucide-react";

const ParishesPage = ({ user }: { user: AuthUser }) => {
  const { data: parishes = [], isLoading } = useQuery(listParishes);

  const statusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <BadgeCheck className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "TRIAL":
        return <CircleDot className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "PAST_DUE":
        return <AlertTriangle className="h-3.5 w-3.5 text-[#8A6418]" />;
      case "CANCELED":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow="Admin"
          title="Paróquias"
          subtitle="Gerir todas as paróquias da plataforma."
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : parishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <Church className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              Nenhuma paróquia
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              As paróquias aparecerão aqui quando forem criadas.
            </p>
          </div>
        ) : (
          <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Nome
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    Diocese
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:table-cell">
                    Cidade
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    Plano
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    Owner
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    Membros
                  </th>
                </tr>
              </thead>
              <tbody>
                {parishes.map((p: any) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/admin/parishes/${p.id}`)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Church className="h-4 w-4 text-[#071A2D] shrink-0" />
                        <div>
                          <span
                            className="font-semibold tracking-tight text-[#071A2D] hover:underline"
                            style={{ fontFamily: "var(--font-brand-display)" }}
                          >
                            {p.name}
                          </span>
                          {!p.active && (
                            <span className="ml-2 rounded-sm bg-[#D39A2B]/15 px-1.5 py-0.5 text-xs text-[#8A6418]">
                              Arquivada
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {p.diocese?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.city || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {p.billing?.plan ? (
                        <span className="flex items-center gap-1">
                          {statusIcon(p.billing.status)}
                          <span
                            className="text-xs font-semibold tracking-tight text-[#071A2D]"
                            style={{ fontFamily: "var(--font-brand-display)" }}
                          >
                            {p.billing.plan}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {p.owner?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {p._count?.memberships || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary cards */}
        {parishes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AppMetric
              label="Total de paróquias"
              value={parishes.length}
              className="bg-white"
            />
            <AppMetric
              label="Paróquias ativas"
              value={parishes.filter((p: any) => p.active).length}
              className="bg-white"
            />
            <AppMetric
              label="Total de membros"
              value={parishes.reduce(
                (sum: number, p: any) => sum + (p._count?.memberships || 0),
                0,
              )}
              className="bg-white"
            />
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default ParishesPage;
