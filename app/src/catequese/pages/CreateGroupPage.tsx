import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { createPastoralGroup } from "wasp/client/operations";
import { Save } from "lucide-react";
import { AppPageHeader, AppPanel } from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import { Label } from "../../client/components/ui/label";
import { handlePlanLimitError } from "../lib/planLimitToast";
import { toast } from "../../client/hooks/use-toast";
import { PASTORAL_GROUP_KINDS, PASTORAL_GROUP_VISIBILITIES } from "../../shared/pastoralGroups";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";

export default function CreateGroupPage() {
  const { t } = useTranslation("groups");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { workspaceId, isPersonal } = useActiveWorkspace();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("YOUTH");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [customKindLabel, setCustomKindLabel] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createPastoralGroup({
        name,
        kind,
        visibility,
        description,
        city,
        state,
        customKindLabel,
        workspaceId: isPersonal || !workspaceId ? undefined : workspaceId,
      });
      toast({ title: t("created") });
      navigate(`/app/grupos/${created.id}`);
    } catch (err: any) {
      if (!handlePlanLimitError(err)) {
        toast({
          title: tc("error"),
          description: err?.message || t("create_error"),
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("create_title")}
        subtitle={t("create_subtitle")}
        secondaryActions={[
          {
            label: tc("back"),
            onClick: () => navigate("/app/grupos"),
          },
        ]}
      />

      <AppPanel>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t("field_name")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("field_kind")}</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {PASTORAL_GROUP_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`kinds.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("field_visibility")}</Label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {PASTORAL_GROUP_VISIBILITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`visibility.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {kind === "CUSTOM" && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-kind">{t("field_custom_kind")}</Label>
              <Input
                id="custom-kind"
                value={customKindLabel}
                onChange={(e) => setCustomKindLabel(e.target.value)}
                required
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-city">{t("field_city")}</Label>
              <Input id="group-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-state">{t("field_state")}</Label>
              <Input
                id="group-state"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-desc">{t("field_description")}</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? tc("saving") : t("create")}
            </Button>
          </div>
        </form>
      </AppPanel>
    </div>
  );
}
