import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { updateUserProfile } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { compressImageToDataUrl } from "../../client/lib/compressImage";
import { invalidateShellContext } from "../../client/hooks/shellQueryCache";

export function ProfileAvatarPicker({
  avatarUrl,
  initials,
}: {
  avatarUrl?: string | null;
  initials: string;
}) {
  const { t } = useTranslation("settings");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (next: string | null) => {
    setSaving(true);
    setError("");
    try {
      await updateUserProfile({ avatarUrl: next });
      setPreview(next);
      await invalidateShellContext();
    } catch (e: any) {
      setError(e?.message || t("avatar_error"));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await save(await compressImageToDataUrl(file));
    } catch {
      setError(t("avatar_error"));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/40 text-lg font-semibold text-brand-ink">
        {preview ? (
          <img src={preview} alt={t("avatar_alt")} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => fileRef.current?.click()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-4 w-4" aria-hidden />
            )}
            {preview ? t("avatar_change") : t("avatar_add")}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => void save(null)}
            >
              {t("avatar_remove")}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
      </div>
    </div>
  );
}
