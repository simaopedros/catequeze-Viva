import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Loader2, Save } from "lucide-react";
import {
  useQuery,
  getMySocialProfile,
  updateSocialProfile,
  listMySocialBlocks,
  toggleSocialBlock,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Textarea } from "../../../client/components/ui/textarea";
import { AppEyebrow, AppPanel } from "../../../client/components/brand/AppChrome";
import { toast } from "../../../client/hooks/use-toast";
import { uploadProfileAvatar } from "../../../client/utils/profileAvatarUpload";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import {
  HANDLE_MAX,
  BIO_MAX,
  normalizeHandle,
  profilePath,
} from "../../../shared/socialProfile";
import { ScrollFade } from "../../../client/components/ui/scroll-fade";

export function SocialProfileSettings() {
  const { t } = useTranslation("settings");
  const { t: ts } = useTranslation("social");
  const { data: profile, refetch } = useQuery(getMySocialProfile);
  const { data: blocks, refetch: refetchBlocks } = useQuery(listMySocialBlocks);
  const fileInput = useRef<HTMLInputElement>(null);

  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatarUrl);
    if (dirtyRef.current) return;
    setHandle(profile.handle || "");
    setBio(profile.bio || "");
    setWebsiteUrl(profile.websiteUrl || "");
  }, [profile?.handle, profile?.bio, profile?.websiteUrl, profile?.avatarUrl]);

  if (!SOCIAL_FEATURES_ENABLED) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateSocialProfile({ handle, bio, websiteUrl });
      dirtyRef.current = false;
      await refetch();
      toast({ title: t("saved") });
    } catch (error: any) {
      toast({ title: error?.message || t("save_profile_error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    const handle = profile?.handle;
    if (!handle) {
      toast({ title: t("social_handle_required"), variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}${profilePath(handle)}`;
    await navigator.clipboard.writeText(url);
    toast({ title: ts("profile.linkCopied") });
  };

  const onAvatar = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadProfileAvatar(file);
      setAvatarUrl(url);
      await refetch();
      toast({ title: t("social_avatar_updated") });
    } catch (error: any) {
      toast({ title: error?.message || t("social_avatar_error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppPanel className="space-y-4">
      <AppEyebrow>{t("social_profile")}</AppEyebrow>
      <p className="text-sm text-muted-foreground">{t("social_profile_desc")}</p>

      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
          >
            {(profile?.displayName || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onAvatar(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
            {t("social_change_avatar")}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="social-handle">
          {t("social_handle")}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">@</span>
          <Input
            id="social-handle"
            value={handle}
            onChange={(event) => {
              dirtyRef.current = true;
              setHandle(normalizeHandle(event.target.value).slice(0, HANDLE_MAX));
            }}
            maxLength={HANDLE_MAX}
            className="h-10 rounded-sm"
            autoComplete="username"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="social-bio">
          {t("social_bio")}
        </label>
        <Textarea
          id="social-bio"
          value={bio}
          onChange={(event) => {
            dirtyRef.current = true;
            setBio(event.target.value);
          }}
          maxLength={BIO_MAX}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="social-website">
          {t("social_website")}
        </label>
        <Input
          id="social-website"
          value={websiteUrl}
          onChange={(event) => {
            dirtyRef.current = true;
            setWebsiteUrl(event.target.value);
          }}
          placeholder="https://"
          className="h-10 rounded-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
          {saving ? t("saving") : t("social_save")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copyLink} className="gap-1">
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {t("social_copy_link")}
        </Button>
      </div>

      {(blocks?.items?.length ?? 0) > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("social_blocked")}
          </p>
          <ScrollFade maxHeight="12rem">
            <ul className="space-y-2">
              {blocks!.items.map((item: any) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {item.displayName}
                    {item.handle ? ` (@${item.handle})` : ""}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await toggleSocialBlock({ userId: item.id });
                      await refetchBlocks();
                    }}
                  >
                    {t("social_unblock")}
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollFade>
        </div>
      )}
    </AppPanel>
  );
}
