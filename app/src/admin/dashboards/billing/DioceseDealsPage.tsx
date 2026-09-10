import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  useQuery,
  listDioceseDeals,
  listDioceses,
  upsertDioceseDeal,
  setDioceseDealStatus,
} from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { EmptyState } from "../../../client/components/EmptyState";
import { Handshake, Plus } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Textarea } from "../../../client/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";

type DealRow = {
  id: string;
  dioceseId: string;
  dioceseName: string;
  status: string | null;
  covering: boolean;
  parishesUsed: number;
  maxParishes: number | null;
  maxClasses: number | null;
  maxCatechists: number | null;
  maxCatechumens: number | null;
  internalNotes: string | null;
  externalReference: string | null;
  agreedPriceCents: number | null;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
};

type DealForm = {
  dioceseId: string;
  newDioceseName: string;
  maxParishes: string;
  maxClasses: string;
  maxCatechists: string;
  maxCatechumens: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  internalNotes: string;
  externalReference: string;
  agreedPriceReais: string;
  startsAt: string;
  endsAt: string;
};

const EMPTY_FORM: DealForm = {
  dioceseId: "",
  newDioceseName: "",
  maxParishes: "10",
  maxClasses: "",
  maxCatechists: "",
  maxCatechumens: "",
  status: "ACTIVE",
  internalNotes: "",
  agreedPriceReais: "",
  externalReference: "",
  startsAt: "",
  endsAt: "",
};

function toDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const DioceseDealsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const {
    data: deals = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery(listDioceseDeals, {});
  const { data: dioceses = [] } = useQuery(listDioceses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusTarget, setStatusTarget] = useState<{
    row: DealRow;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  } | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (deals as DealRow[]).filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!needle) return true;
      return [row.dioceseName, row.externalReference, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [deals, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (row: DealRow) => {
    setEditing(row);
    setForm({
      dioceseId: row.dioceseId,
      newDioceseName: "",
      maxParishes: String(row.maxParishes ?? 10),
      maxClasses: row.maxClasses != null ? String(row.maxClasses) : "",
      maxCatechists: row.maxCatechists != null ? String(row.maxCatechists) : "",
      maxCatechumens:
        row.maxCatechumens != null ? String(row.maxCatechumens) : "",
      status: (row.status as DealForm["status"]) || "ACTIVE",
      internalNotes: row.internalNotes ?? "",
      externalReference: row.externalReference ?? "",
      agreedPriceReais:
        row.agreedPriceCents != null
          ? (row.agreedPriceCents / 100).toFixed(2)
          : "",
      startsAt: toDateInput(row.startsAt),
      endsAt: toDateInput(row.endsAt),
    });
    setError("");
    setDialogOpen(true);
  };

  const optionalInt = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const maxParishes = Number.parseInt(form.maxParishes, 10);
      if (!Number.isFinite(maxParishes) || maxParishes < 1) {
        throw new Error(t("pages.deals.max_parishes_required"));
      }
      const reais = form.agreedPriceReais.trim();
      const agreedPriceCents = reais
        ? Math.round(Number.parseFloat(reais.replace(",", ".")) * 100)
        : null;
      await upsertDioceseDeal({
        ...(editing || form.dioceseId
          ? { dioceseId: editing?.dioceseId || form.dioceseId }
          : {
              createDiocese: {
                name: form.newDioceseName.trim(),
                country: "BR",
              },
            }),
        maxParishes,
        maxClasses: optionalInt(form.maxClasses),
        maxCatechists: optionalInt(form.maxCatechists),
        maxCatechumens: optionalInt(form.maxCatechumens),
        status: form.status,
        internalNotes: form.internalNotes.trim() || null,
        externalReference: form.externalReference.trim() || null,
        agreedPriceCents:
          agreedPriceCents != null && Number.isFinite(agreedPriceCents)
            ? agreedPriceCents
            : null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      });
      await refetch();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err?.message || t("pages.deals.action_error"));
    } finally {
      setBusy(false);
    }
  };

  const runStatus = async () => {
    if (!statusTarget) return;
    setBusy(true);
    try {
      await setDioceseDealStatus({
        dioceseId: statusTarget.row.dioceseId,
        status: statusTarget.status,
      });
      await refetch();
      setStatusTarget(null);
    } catch (err: any) {
      setError(err?.message || t("pages.deals.action_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.deals.title")}
          subtitle={t("pages.deals.subtitle")}
          actions={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              {t("pages.deals.new")}
            </Button>
          }
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : loadError && (deals as DealRow[]).length === 0 ? (
          <QueryErrorState error={loadError} onRetry={refetch} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="deal-search" className="sr-only">
                {t("pages.deals.search_placeholder")}
              </Label>
              <Input
                id="deal-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.deals.search_placeholder")}
                className="max-w-md"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
                aria-label={t("pages.deals.filter_status")}
              >
                <option value="">{t("pages.deals.filter_all")}</option>
                <option value="ACTIVE">{t("pages.deals.status_ACTIVE")}</option>
                <option value="SUSPENDED">
                  {t("pages.deals.status_SUSPENDED")}
                </option>
                <option value="INACTIVE">
                  {t("pages.deals.status_INACTIVE")}
                </option>
              </select>
            </div>

            {(filtered as DealRow[]).length === 0 ? (
              <EmptyState
                icon={Handshake}
                title={t("pages.deals.empty")}
                description={t("pages.deals.empty_desc")}
              />
            ) : (
              <div className="rounded-sm border border-border/70 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("pages.deals.col_diocese")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("pages.deals.col_status")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("pages.deals.col_parishes")}
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("pages.deals.col_actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-semibold tracking-tight text-[#071A2D]">
                          {row.dioceseName}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {t(`pages.deals.status_${row.status || "NONE"}`)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.parishesUsed}/
                          {row.maxParishes ?? t("pages.deals.unlimited")}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                          >
                            {t("pages.deals.edit")}
                          </Button>
                          {row.status !== "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatusTarget({ row, status: "ACTIVE" })
                              }
                            >
                              {t("pages.deals.activate")}
                            </Button>
                          )}
                          {row.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatusTarget({ row, status: "SUSPENDED" })
                              }
                            >
                              {t("pages.deals.suspend")}
                            </Button>
                          )}
                          {row.status !== "INACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatusTarget({ row, status: "INACTIVE" })
                              }
                            >
                              {t("pages.deals.deactivate")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("pages.deals.edit_title") : t("pages.deals.new_title")}
            </DialogTitle>
            <DialogDescription>{t("pages.deals.form_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("pages.deals.existing_diocese")}</Label>
                  <select
                    value={form.dioceseId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        dioceseId: e.target.value,
                        newDioceseName: e.target.value ? "" : prev.newDioceseName,
                      }))
                    }
                    className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("pages.deals.choose_diocese")}</option>
                    {(dioceses as any[]).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("pages.deals.new_diocese")}</Label>
                  <Input
                    value={form.newDioceseName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        newDioceseName: e.target.value,
                        dioceseId: e.target.value ? "" : prev.dioceseId,
                      }))
                    }
                    placeholder={t("pages.deals.new_diocese_placeholder")}
                    disabled={Boolean(form.dioceseId)}
                  />
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("pages.deals.max_parishes")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxParishes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxParishes: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.status")}</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as DealForm["status"],
                    }))
                  }
                  className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">{t("pages.deals.status_ACTIVE")}</option>
                  <option value="SUSPENDED">
                    {t("pages.deals.status_SUSPENDED")}
                  </option>
                  <option value="INACTIVE">
                    {t("pages.deals.status_INACTIVE")}
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.max_classes")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxClasses}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxClasses: e.target.value }))
                  }
                  placeholder={t("pages.deals.unlimited")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.max_catechists")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxCatechists}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxCatechists: e.target.value,
                    }))
                  }
                  placeholder={t("pages.deals.unlimited")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.max_catechumens")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxCatechumens}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxCatechumens: e.target.value,
                    }))
                  }
                  placeholder={t("pages.deals.unlimited")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.starts")}</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.ends")}</Label>
                <Input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.contract_ref")}</Label>
                <Input
                  value={form.externalReference}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      externalReference: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("pages.deals.agreed_price")}</Label>
                <Input
                  value={form.agreedPriceReais}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      agreedPriceReais: e.target.value,
                    }))
                  }
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pages.deals.notes")}</Label>
              <Textarea
                value={form.internalNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, internalNotes: e.target.value }))
                }
                placeholder={t("pages.deals.notes_placeholder")}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("pages.deals.cancel")}
            </Button>
            <Button
              onClick={save}
              disabled={
                busy ||
                (!editing && !form.dioceseId && !form.newDioceseName.trim())
              }
            >
              {busy ? t("pages.deals.saving") : t("pages.deals.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={t("pages.deals.confirm_status_title")}
        description={
          statusTarget
            ? t("pages.deals.confirm_status_desc", {
                name: statusTarget.row.dioceseName,
                status: t(`pages.deals.status_${statusTarget.status}`),
              })
            : ""
        }
        confirmLabel={t("pages.deals.confirm")}
        onConfirm={runStatus}
      />
    </DefaultLayout>
  );
};

export default DioceseDealsPage;
