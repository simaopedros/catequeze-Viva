import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import { useQuery, getSocialPublishAccess, getSocialTopics } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import type { SocialShareDraft } from "../../../shared/socialShare";
import { SocialAccessNotice } from "./SocialAccessNotice";
import { ShareComposerDialog } from "./ShareComposerDialog";
import { SocialComposer } from "./SocialComposer";

export function ShareToCommunityButton({
  draft,
  body,
  topic,
  source: _unusedSource,
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
  const text = (body || "").trim();
  const usesDialog = Boolean(draft) || Boolean(text);
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: SOCIAL_FEATURES_ENABLED && Boolean(user) && open && usesDialog,
  });
  const { data: topics } = useQuery(getSocialTopics, undefined, {
    enabled: SOCIAL_FEATURES_ENABLED && open && Boolean(text) && !draft,
  });

  if (!SOCIAL_FEATURES_ENABLED) return null;
  if (!draft && !text) return null;

  const canPublish = Boolean(access?.canPublish);
  const actionLabel = label || (draft ? t("nativeShare.action") : t("share.toCommunity"));

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={actionLabel}
        data-testid="share-to-community"
      >
        <Share2
          className={size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5"}
          aria-hidden
        />
        {size !== "icon" ? actionLabel : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("nativeShare.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {draft
                ? t("nativeShare.dialogDescription")
                : t("nativeShare.textDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {!user ? (
            <SocialAccessNotice reason="anonymous" preview={text || undefined} />
          ) : !access ? (
            <p className="text-sm text-muted-foreground">{t("feed.loading")}</p>
          ) : canPublish && draft ? (
            <ShareComposerDialog draft={draft} onPublished={() => setOpen(false)} />
          ) : canPublish && access.limits ? (
            <SocialComposer
              topics={topics ?? []}
              limits={access.limits}
              quotaLeft={access.quotaLeft ?? null}
              initialBody={text}
              initialTopic={topic}
              onPublished={() => setOpen(false)}
            />
          ) : (
            <SocialAccessNotice
              reason={
                (access.reason ?? "subscription") as
                  | "subscription"
                  | "quota"
                  | "banned"
              }
              preview={text || undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
