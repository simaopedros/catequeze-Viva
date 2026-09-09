import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import { useQuery, getSocialPublishAccess } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import type { SocialShareDraft } from "../../../shared/socialShare";
import { SocialAccessNotice } from "./SocialAccessNotice";
import { ShareComposerDialog } from "./ShareComposerDialog";

export function ShareToCommunityButton({
  draft,
  label,
  variant = "outline",
  size = "sm",
  className,
}: {
  draft: SocialShareDraft;
  label?: string;
  variant?: "outline" | "ghost" | "secondary" | "default";
  size?: "sm" | "icon" | "default";
  className?: string;
}) {
  const { t } = useTranslation("social");
  const { data: user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: SOCIAL_FEATURES_ENABLED && Boolean(user) && open,
  });

  if (!SOCIAL_FEATURES_ENABLED) return null;

  const canPublish = Boolean(access?.canPublish);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={label || t("nativeShare.action")}
      >
        <Share2 className={size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5"} aria-hidden />
        {size !== "icon" ? label || t("nativeShare.action") : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("nativeShare.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {!user ? (
            <SocialAccessNotice reason="anonymous" />
          ) : !access ? (
            <p className="text-sm text-muted-foreground">{t("feed.loading")}</p>
          ) : canPublish ? (
            <ShareComposerDialog draft={draft} onPublished={() => setOpen(false)} />
          ) : (
            <SocialAccessNotice
              reason={(access.reason ?? "subscription") as "subscription" | "quota" | "banned"}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
