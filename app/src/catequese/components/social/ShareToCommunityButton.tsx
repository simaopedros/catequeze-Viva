import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import { useQuery, getSocialPublishAccess } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import {
  buildCommunitySharePath,
  type SocialShareDraft,
} from "../../../shared/socialShare";
import { SocialAccessNotice } from "./SocialAccessNotice";
import { ShareComposerDialog } from "./ShareComposerDialog";

export function ShareToCommunityButton({
  draft,
  body,
  topic,
  source,
  label,
  variant = "outline",
  size = "sm",
  className,
}: {
  draft?: SocialShareDraft;
  body?: string;
  topic?: string;
  source?: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary" | "default";
  size?: "sm" | "icon" | "default" | "lg";
  className?: string;
}) {
  const { t } = useTranslation("social");
  const { data: user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: SOCIAL_FEATURES_ENABLED && Boolean(user) && open && Boolean(draft),
  });

  if (!SOCIAL_FEATURES_ENABLED) return null;

  if (draft) {
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
          data-testid="share-to-community"
        >
          <Share2
            className={size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5"}
            aria-hidden
          />
          {size !== "icon" ? label || t("nativeShare.action") : null}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("nativeShare.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("nativeShare.dialogDescription")}</DialogDescription>
            </DialogHeader>
            {!user ? (
              <SocialAccessNotice reason="anonymous" />
            ) : !access ? (
              <p className="text-sm text-muted-foreground">{t("feed.loading")}</p>
            ) : canPublish ? (
              <ShareComposerDialog draft={draft} onPublished={() => setOpen(false)} />
            ) : (
              <SocialAccessNotice
                reason={
                  (access.reason ?? "subscription") as
                    | "subscription"
                    | "quota"
                    | "banned"
                }
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const text = (body || "").trim();
  if (!text) return null;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      data-testid="share-to-community"
    >
      <Link to={buildCommunitySharePath({ body: text, topic, source })}>
        <Share2
          className={size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5"}
          aria-hidden
        />
        {size !== "icon" ? label || t("share.toCommunity") : null}
      </Link>
    </Button>
  );
}
