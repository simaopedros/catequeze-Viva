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

        <div className="grid grid-cols-7 border-t-2 bg-muted/20 px-4 py-3 md:px-6">
          <div className="col-span-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("email")}
          </div>
          <div className="col-span-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("name")}
          </div>
          <div className="col-span-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("admin")}
          </div>
          <div className="col-span-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("created_at")}
          </div>
          <div className="col-span-1 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("columns.actions")}
          </div>
        </div>

        {isLoading && <LoadingSpinner />}
        {data?.users?.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("user_not_found")}
          </div>
        )}
        {data?.users?.map((user: any) => (
          <div
            key={user.id}
            className="py-3 grid grid-cols-7 gap-4 px-4 md:px-6 border-t"
          >
            <div className="font-brand-display col-span-2 flex items-center truncate text-sm font-semibold tracking-tight text-[#071A2D]">
              {user.email || "—"}
            </div>
            <div className="col-span-2 flex items-center text-sm text-muted-foreground truncate">
              {user.firstName
                ? `${user.firstName} ${user.lastName || ""}`
                : "—"}
            </div>
            <div className="col-span-1 flex items-center">
              <AdminSwitch {...user} />
            </div>
            <div className="col-span-1 flex items-center text-xs text-muted-foreground">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                : "—"}
            </div>
            <div className="col-span-1 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate(`/admin/users/${user.id}`)}
              >
                {t("details")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersTable;
