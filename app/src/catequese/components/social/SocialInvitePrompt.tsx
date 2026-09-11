import { useTranslation } from "react-i18next";
import { Link2, Share2, UserPlus, X } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { toast } from "../../../client/hooks/use-toast";
import { useSocialInvitePrompt } from "../../../client/hooks/useSocialInvitePrompt";
import { cn } from "../../../client/utils";
import { buildSocialInviteWhatsappHref } from "../../../shared/socialInvitePrompt";

export function SocialInvitePrompt({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("social");
  const { visible, inviteUrl, dismiss } = useSocialInvitePrompt();

  if (!visible) return null;

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: t("invitePrompt.copied") });
      dismiss();
    } catch {
      toast({
        title: t("invitePrompt.copyLink"),
        description: inviteUrl,
      });
    }
  };

  const openWhatsapp = () => {
    window.open(
      buildSocialInviteWhatsappHref(t("invitePrompt.message"), inviteUrl),
      "_blank",
      "noopener,noreferrer",
    );
    dismiss();
  };

  const nativeShare = async () => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: t("title"),
        text: t("invitePrompt.message"),
        url: inviteUrl,
      });
      dismiss();
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <div
      data-testid="social-invite-prompt"
      role="status"
      className={cn(
        "relative rounded-sm border border-brand-gold/30 bg-brand-gold/[0.06] p-3 pr-11",
        compact ? "mb-4" : "sm:p-3.5 sm:pr-12",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 h-9 w-9 text-muted-foreground"
        onClick={dismiss}
        aria-label={t("invitePrompt.dismiss")}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-white">
            <UserPlus className="h-4 w-4 text-brand-ink" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {t("invitePrompt.title")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("invitePrompt.description")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => void copyLink()}
          >
            <Link2 className="h-4 w-4" aria-hidden />
            {t("invitePrompt.copyLink")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={openWhatsapp}
          >
            {t("invitePrompt.whatsapp")}
          </Button>
          {canNativeShare ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => void nativeShare()}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {t("invitePrompt.share")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
