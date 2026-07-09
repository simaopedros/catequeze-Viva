import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CalendarDays, Plus, Check } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Badge } from "../../client/components/ui/badge";
import { EmptyState } from "../../client/components/EmptyState";
import {
  useQuery,
  listCatecheticalYears,
  createCatecheticalYear,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";

interface CatecheticalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parishId: string;
  parish?: { name: string };
}

export default function CatecheticalYearsPage() {
  const { t } = useTranslation("catecheticalYears");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const { data: years = [], isLoading: loading } = useQuery(
    listCatecheticalYears,
  );
  const [error, setError] = useState("");

  const filteredYears = activeParishId
    ? years.filter((y: any) => y.parishId === activeParishId)
    : years;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    setError("");
    try {
      await createCatecheticalYear({ name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || t("create_error"));
    }
    setSaving(false);
  };

  const isActive = (year: CatecheticalYear) => {
    const now = new Date();
    const end = new Date(year.endDate);
    return end >= now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#071A2D]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("eyebrow", { defaultValue: "Pastoral" })}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button
            size="sm"
            className="h-10 rounded-sm shadow-none"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("new_year")}
          </Button>
        }
      />

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <AppPanel className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("form_title")}
            </h3>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">{t("name")} *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder={t("name_placeholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("start")} *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("end")} *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !name || !startDate || !endDate}
            >
              <Check className="mr-1 h-4 w-4" />
              {saving ? t("creating") : tc("create")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm"
              onClick={() => setShowForm(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {filteredYears.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("empty_title")}
          description={t("empty_desc")}
        >
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t("create_btn")}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredYears.map((year: any) => (
            <AppPanel
              key={year.id}
              className="transition-colors hover:border-[#071A2D]/30"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                    <CalendarDays className="h-5 w-5 text-[#071A2D]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#071A2D]">
                      {year.name}
                    </h3>
                    {year.parish?.name && (
                      <p className="text-xs text-muted-foreground">
                        {year.parish.name}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={isActive(year) ? "default" : "secondary"}
                  className="rounded-sm"
                >
                  {isActive(year) ? t("status_active") : t("status_concluded")}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("start_label", {
                    date: formatDate(year.startDate, currentLocale),
                  })}
                </p>
                <p>
                  {t("end_label", {
                    date: formatDate(year.endDate, currentLocale),
                  })}
                </p>
              </div>
            </AppPanel>
          ))}
        </div>
      )}
    </div>
  );
}
