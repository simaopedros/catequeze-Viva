import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { Button } from "../../../client/components/ui/button";

export interface CoordinatorScopeMember {
  id: string;
  role: string;
  community?: { id: string; name: string } | null;
  classes?: { id: string; name: string; role: string }[];
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

interface CoordinatorScopeDialogProps {
  member: CoordinatorScopeMember | null;
  communities: { id: string; name: string; classes?: unknown }[];
  classes: { id: string; name: string; community?: { id: string; name: string } | null }[];
  onOpenChange: (open: boolean) => void;
  onSave: (args: { communityId: string | null; classIds: string[] }) => Promise<void>;
}

/**
 * Vice-coordination scope editor: binds a COMMUNITY_COORDINATOR to a
 * community and/or an explicit set of classes. Classes already covered by the
 * chosen community are shown as included and cannot be unchecked.
 */
export function CoordinatorScopeDialog({
  member,
  communities,
  classes,
  onOpenChange,
  onSave,
}: CoordinatorScopeDialogProps) {
  const { t } = useTranslation("common");
  const [communityId, setCommunityId] = useState<string>("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!member) return;
    setCommunityId(member.community?.id || "");
    setClassIds(
      (member.classes || [])
        .filter((c) => c.role === "COORDINATOR")
        .map((c) => c.id),
    );
    setError("");
  }, [member]);

  const open = Boolean(member);
  const displayName =
    [member?.user?.firstName, member?.user?.lastName].filter(Boolean).join(" ") ||
    member?.user?.email ||
    "";

  const toggleClass = (id: string) => {
    setClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({
        communityId: communityId || null,
        // Classes covered by the community need no explicit link
        classIds: classIds.filter((id) => {
          const cls = classes.find((c) => c.id === id);
          return !(communityId && cls?.community?.id === communityId);
        }),
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || t("error"));
    } finally {
      setSaving(false);
    }
  };

  const isFullParish = !communityId && classIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("team.scope.title")}</DialogTitle>
          <DialogDescription>
            {t("team.scope.description", { name: displayName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("team.scope.community_label")}
            </label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="h-11 min-h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
              disabled={saving}
            >
              <option value="">{t("team.scope.no_community")}</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("team.scope.classes_label")}
            </label>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("team.scope.no_classes")}
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-sm border border-border/70 p-2">
                {classes.map((cls) => {
                  const coveredByCommunity =
                    !!communityId && cls.community?.id === communityId;
                  const checked = coveredByCommunity || classIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        disabled={saving || coveredByCommunity}
                        onChange={() => toggleClass(cls.id)}
                      />
                      <span className="flex-1 truncate">{cls.name}</span>
                      {cls.community?.name && (
                        <span className="truncate text-xs text-muted-foreground">
                          {cls.community.name}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {isFullParish
              ? t("team.scope.full_parish_hint")
              : t("team.scope.scoped_hint")}
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
