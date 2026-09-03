import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import {
  getPaginatedUsers,
  updateIsUserAdminById,
  useQuery,
} from "wasp/client/operations";
import { type User } from "wasp/entities";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import useDebounce from "../../../client/hooks/useDebounce";
import LoadingSpinner from "../../layout/LoadingSpinner";
import { useNavigate } from "react-router";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

function AdminSwitch({ id, isAdmin }: Pick<User, "id" | "isAdmin">) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;
  return (
    <Switch
      checked={isAdmin}
      onCheckedChange={(value) => updateIsUserAdminById({ id, isAdmin: value })}
      disabled={isCurrentUser}
    />
  );
}

const UsersTable = () => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [isAdminFilter, setIsAdminFilter] = useState<boolean | undefined>(
    undefined,
  );
  const debouncedEmailFilter = useDebounce(emailFilter, 300);
  const skipPages = currentPage - 1;
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(getPaginatedUsers, {
    skipPages,
    filter: {
      ...(debouncedEmailFilter && { emailContains: debouncedEmailFilter }),
      ...(isAdminFilter !== undefined && { isAdmin: isAdminFilter }),
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedEmailFilter, isAdminFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border/70 bg-white rounded-sm border">
        <div className="bg-muted/40 flex w-full items-center gap-4 p-4">
          <Label
            htmlFor="email-filter"
            className="text-muted-foreground text-sm"
          >
            {t("email")}:
          </Label>
          <Input
            type="text"
            id="email-filter"
            placeholder={t("search_placeholder")}
            className="w-64"
            onChange={(e) => setEmailFilter(e.currentTarget.value || undefined)}
          />
          <Label className="text-muted-foreground text-sm ml-4">
            {t("admin")}:
          </Label>
          <select
            className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
            onChange={(e) => {
              const v = e.target.value;
              setIsAdminFilter(v === "both" ? undefined : v === "true");
            }}
            defaultValue="both"
          >
            <option value="both">{t("all_filter")}</option>
            <option value="true">{t("yes_filter")}</option>
            <option value="false">{t("no_filter")}</option>
          </select>
          {data?.totalPages && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("page")}</span>
              <Input
                type="number"
                min={1}
                value={currentPage}
                max={data.totalPages}
                onChange={(e) => {
                  const v = parseInt(e.currentTarget.value);
                  if (data.totalPages && v <= data.totalPages && v > 0)
                    setCurrentPage(v);
                }}
                className="w-16 h-8"
              />
              <span>/ {data.totalPages}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-t-2 bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("email")}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("name")}
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                {t("pages.users.col_plan")}
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground xl:table-cell">
                {t("pages.users.col_workspaces")}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("admin")}
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:table-cell">
                {t("created_at")}
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
        {isLoading && (
          <tr>
            <td colSpan={7} className="p-6">
              <LoadingSpinner />
            </td>
          </tr>
        )}
        {data?.users?.length === 0 && (
          <tr>
            <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
              {t("user_not_found")}
            </td>
          </tr>
        )}
        {data?.users?.map((user: any) => (
          <tr key={user.id} className="border-t">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2 truncate text-sm font-semibold tracking-tight text-[#071A2D]">
                <span className="truncate">{user.email || "—"}</span>
                {user.suspendedAt && (
                  <span className="shrink-0 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                    {t("pages.user.suspended")}
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground truncate">
              {user.firstName
                ? `${user.firstName} ${user.lastName || ""}`
                : "—"}
            </td>
            <td className="hidden px-4 py-3 text-xs text-[#071A2D] lg:table-cell">
              {user.subscriptionPlan || "—"}
              {user.subscriptionStatus ? (
                <span className="ml-1 text-muted-foreground">
                  · {user.subscriptionStatus}
                </span>
              ) : null}
            </td>
            <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
              {(user.workspaces || []).length === 0
                ? t("pages.users.no_workspaces")
                : (user.workspaces as any[])
                    .slice(0, 3)
                    .map(
                      (w) =>
                        `${w.name} (${w.role}${w.type ? ` · ${w.type}` : ""})`,
                    )
                    .join(", ")}
            </td>
            <td className="px-4 py-3">
              <AdminSwitch {...user} />
            </td>
            <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
              {user.createdAt ? formatDate(user.createdAt, currentLocale) : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate(`/admin/users/${user.id}`)}
              >
                {t("details")}
              </Button>
            </td>
          </tr>
        ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default UsersTable;
