import { type AuthUser } from "wasp/auth";
import { useQuery, listParishesAdmin } from "wasp/client/operations";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import {
  Church,
  MapPin,
  Users,
  Building2,
  BadgeCheck,
  AlertTriangle,
  CircleDot,
} from "lucide-react";

const ParishesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dioceseFilter = searchParams.get("dioceseId") || "";
  const {
    data: allParishes = [],
    isLoading,
    error,
    refetch,
  } = useQuery(listParishesAdmin);
  const parishes = dioceseFilter
    ? allParishes.filter(
        (p: any) =>
          p.dioceseId === dioceseFilter || p.diocese?.id === dioceseFilter,
      )
    : allParishes;
  const filterName =
    parishes.find((p: any) => p.diocese?.id === dioceseFilter)?.diocese?.name ||
    allParishes.find((p: any) => p.diocese?.id === dioceseFilter)?.diocese
      ?.name;

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
          eyebrow={t("pages.admin")}
          title={t("pages.parishes.title")}
          subtitle={
            dioceseFilter && filterName
              ? t("pages.parishes.filtered_by", { name: filterName })
              : t("pages.parishes.subtitle")
          }
          actions={
            dioceseFilter ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-[#071A2D]"
                onClick={() => setSearchParams({})}
              >
                {t("pages.parishes.clear_filter")}
              </button>
            ) : null
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : error && parishes.length === 0 ? (
          <QueryErrorState error={error} onRetry={refetch} />
        ) : parishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <Church className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              {t("pages.parishes.empty_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("pages.parishes.empty_desc")}
            </p>
          </div>
        ) : (
          <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("pages.parishes.col_name")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    {t("pages.parishes.col_diocese")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:table-cell">
                    {t("pages.parishes.col_city")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    {t("pages.parishes.col_plan")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    {t("pages.parishes.col_owner")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                    {t("pages.parishes.col_members")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {parishes.map((p: any) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer focus-within:bg-muted/30"
                    onClick={() => navigate(`/admin/parishes/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Church className="h-4 w-4 text-[#071A2D] shrink-0" />
                        <div>
                          <NavLink
                            to={`/admin/parishes/${p.id}`}
                            className="font-semibold tracking-tight text-[#071A2D] hover:underline"
                            aria-label={t("pages.parishes.open_row", {
                              name: p.name,
                            })}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.name}
                          </NavLink>
                          {!p.active && (
                            <span className="ml-2 rounded-sm bg-[#D39A2B]/15 px-1.5 py-0.5 text-xs text-[#8A6418]">
                              {t("pages.parishes.archived")}
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
                          <span className="text-xs font-semibold tracking-tight text-[#071A2D]">
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
              label={t("pages.parishes.total")}
              value={parishes.length}
              className="bg-white"
            />
            <AppMetric
              label={t("pages.parishes.active")}
              value={parishes.filter((p: any) => p.active).length}
              className="bg-white"
            />
            <AppMetric
              label={t("pages.parishes.total_members")}
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
