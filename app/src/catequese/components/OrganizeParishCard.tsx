import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { organizeAsParish } from "wasp/client/operations";
import { Church, Loader2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { BRAZILIAN_STATES } from "../../client/hooks/useIbgeCities";
import { invalidateShellContext } from "../../client/hooks/shellQueryCache";
import { setActiveWorkspaceId } from "../../client/hooks/workspaceStore";
import { toast } from "../../client/hooks/use-toast";

export function OrganizeParishCard({ workspaceId }: { workspaceId?: string }) {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [bringClasses, setBringClasses] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await organizeAsParish({
        name,
        city,
        state,
        bringClasses,
      });
      await invalidateShellContext();
      if (result?.id) {
        setActiveWorkspaceId(result.id);
      }
      toast({ title: t("migrate_success") });
      navigate("/app/billing?plan=unlimited");
    } catch (e: any) {
      toast({
        title: e?.message || t("migrate_error"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="organizar-paroquia"
      data-testid="organize-parish-card"
      className="rounded-sm border border-border/70 bg-white p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
          <Church className="h-5 w-5 text-brand-ink" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("migrate_to_parish_title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("migrate_to_parish_desc")}
          </p>
        </div>
      </div>

      {!open ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-sm"
          onClick={() => setOpen(true)}
        >
          {t("migrate_to_parish_cta")}
        </Button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="organize-parish-name">{t("migrate_parish_name")}</Label>
              <Input
                id="organize-parish-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organize-parish-city">{t("migrate_parish_city")}</Label>
              <Input
                id="organize-parish-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organize-parish-state">{t("migrate_parish_state")}</Label>
              <select
                id="organize-parish-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
              >
                {BRAZILIAN_STATES.map((s) => (
                  <option key={s.uf} value={s.uf}>
                    {s.uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={bringClasses}
              onChange={(e) => setBringClasses(e.target.checked)}
            />
            <span>
              <span className="font-medium text-brand-ink">
                {t("migrate_bring_classes")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("migrate_bring_classes_hint")}
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || name.trim().length < 3}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("migrate_to_parish_cta")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("cancel", { ns: "common" })}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
