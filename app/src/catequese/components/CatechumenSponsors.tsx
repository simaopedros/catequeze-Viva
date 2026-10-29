import { useState } from "react";
import { useTranslation } from "react-i18next";
import { saveCatechumenSponsor } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { toast } from "../../client/hooks/use-toast";
function SponsorForm({
  role,
  sponsor,
  catechumenProfileId,
  workspaceId,
  canEdit,
}: any) {
  const { t } = useTranslation("common");
  const [name, setName] = useState(sponsor?.name ?? "");
  const [other, setOther] = useState(sponsor?.fromOtherParish ?? false);
  const [parishName, setParishName] = useState(sponsor?.parishName ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-2 rounded border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await saveCatechumenSponsor({
            catechumenProfileId,
            workspaceId,
            role,
            name,
            fromOtherParish: other,
            parishName: parishName || null,
          });
          toast({ title: t("documentRules.saved") });
        } catch (error: any) {
          toast({
            title: t("error"),
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm">
        {t(`documentRules.roles.${role}`)}
        <Input
          required
          maxLength={150}
          disabled={!canEdit}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={other}
          onChange={(e) => setOther(e.target.checked)}
        />
        {t("documentRules.otherParish")}
      </label>
      {other && (
        <label className="block text-sm">
          {t("documentRules.parishName")}
          <Input
            maxLength={150}
            disabled={!canEdit}
            value={parishName}
            onChange={(e) => setParishName(e.target.value)}
          />
        </label>
      )}
      {canEdit && (
        <Button disabled={busy || !name.trim()} type="submit">
          {t("save")}
        </Button>
      )}
    </form>
  );
}
export function CatechumenSponsors({ profile, workspaceId, canEdit }: any) {
  const { t } = useTranslation("common");
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("documentRules.sponsors")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {["PADRINHO", "MADRINHA"].map((role) => (
          <SponsorForm
            key={`${profile.id}-${role}-${
              profile.sponsors?.find((s: any) => s.role === role)?.updatedAt ??
              ""
            }`}
            role={role}
            sponsor={profile.sponsors?.find((s: any) => s.role === role)}
            catechumenProfileId={profile.id}
            workspaceId={workspaceId}
            canEdit={canEdit}
          />
        ))}
      </div>
    </section>
  );
}
