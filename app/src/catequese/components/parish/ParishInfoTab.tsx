import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import CityStateSelect from "../../../client/components/CityStateSelect";

const PLAN_KEYS: Record<string, string> = {
  CATECHIST_FREE: "plan_free",
  SINGLE: "plan_single",
  UNLIMITED: "plan_unlimited",
};

const STATUS_KEYS: Record<string, { key: string; color: string }> = {
  ACTIVE: { key: "active", color: "bg-[#071A2D]/08 text-[#071A2D]" },
  TRIAL: { key: "trial", color: "bg-[#D39A2B]/15 text-[#8A6418]" },
  PAST_DUE: {
    key: "past_due",
    color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  CANCELED: {
    key: "canceled",
    color: "bg-muted text-muted-foreground",
  },
};

interface ParishInfoTabProps {
  parish: any;
  editing: boolean;
  editName: string;
  setEditName: (v: string) => void;
  editCity: string;
  setEditCity: (v: string) => void;
  editState: string;
  setEditState: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
}

export function ParishInfoTab({
  parish,
  editing,
  editName,
  setEditName,
  editCity,
  setEditCity,
  editState,
  setEditState,
  saving,
  onSave,
  onCancel,
  onStartEdit,
}: ParishInfoTabProps) {
  const { t: tp } = useTranslation("parishes");
  const billing = parish?.billing;

  const planLabel = (plan: string) => {
    const key = PLAN_KEYS[plan];
    return key ? tp(key) : plan;
  };

  const statusInfo = useMemo(() => {
    if (!billing?.status) return null;
    return (
      STATUS_KEYS[billing.status] || {
        key: billing.status,
        color: "bg-muted text-muted-foreground",
      }
    );
  }, [billing?.status]);

  if (editing) {
    return (
      <div className="space-y-4 rounded-sm border border-border/70 bg-white p-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {tp("edit_parish_title")}
          </p>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {tp("name")}
            </label>
            <input
              aria-label={tp("name")}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 rounded-sm border border-input bg-background px-3 text-sm mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              {tp("city_state")}
            </label>
            <div className="mt-1">
              <CityStateSelect
                city={editCity}
                state={editState}
                onCityChange={setEditCity}
                onStateChange={setEditState}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || !editName.trim()}
          >
            {saving ? tp("saving") : tp("save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {tp("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-sm border border-border/70 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {tp("parish_data")}
          </p>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-sm"
          onClick={onStartEdit}
        >
          {tp("edit")}
        </Button>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">{tp("name")}:</span>{" "}
          {parish?.name}
        </div>
        <div>
          <span className="text-muted-foreground">{tp("city")}:</span>{" "}
          {parish?.city || "\u2014"}
        </div>
        <div>
          <span className="text-muted-foreground">{tp("state")}:</span>{" "}
          {parish?.state || "\u2014"}
        </div>
        <div>
          <span className="text-muted-foreground">{tp("status")}:</span>{" "}
          <span
            className={
              "inline-flex items-center rounded-sm border border-border/70 px-2 py-0.5 text-xs font-medium " +
              (parish?.active !== false
                ? "bg-[#071A2D]/08 text-[#071A2D]"
                : "bg-muted text-muted-foreground")
            }
          >
            {parish?.active !== false ? tp("active") : tp("inactive")}
          </span>
        </div>
        {parish?.diocese && (
          <div>
            <span className="text-muted-foreground">{tp("diocese")}:</span>{" "}
            {parish.diocese.name}
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{tp("locale_label")}:</span>{" "}
          {parish?.locale || "pt-BR"}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{tp("timezone_label")}:</span>{" "}
          {parish?.timezone || "America/Sao_Paulo"}
        </div>
      </div>
      <div className="flex gap-6 pt-2 text-sm">
        <div className="flex items-center gap-1.5">
          <strong>{parish?._count?.memberships || 0}</strong> {tp("members")}
        </div>
        <div className="flex items-center gap-1.5">
          <strong>{parish?._count?.classes || 0}</strong> {tp("classes")}
        </div>
        <div className="flex items-center gap-1.5">
          <strong>{parish?._count?.communities || 0}</strong>{" "}
          {tp("communities")}
        </div>
      </div>
      {billing && (
        <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground border-t">
          {tp("plan_label")}: <strong>{planLabel(billing.plan)}</strong>
          {statusInfo && (
            <span
              className={
                "inline-flex items-center rounded-sm border border-border/70 px-2 py-0.5 text-overline font-medium " +
                statusInfo.color
              }
            >
              {STATUS_KEYS[billing.status]
                ? tp(statusInfo.key)
                : billing.status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
