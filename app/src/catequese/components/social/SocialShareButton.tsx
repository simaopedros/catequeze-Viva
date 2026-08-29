import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Link2, Share2 } from "lucide-react";
import { registerSocialShare } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { toast } from "../../../client/hooks/use-toast";

/** Canonical shareable URL — /c/:slug renders Open Graph tags for crawlers. */
export function buildShareUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/c/${slug}`;
}

export function SocialShareButton({
  postId,
  slug,
  body,
  shareCount,
}: {
  postId: string;
  slug: string;
  body: string;
  shareCount: number;
}) {
  const { t } = useTranslation("social");
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(slug);

  // Share counting is best-effort telemetry — never block the share on it.
  const countShare = () => {
    void registerSocialShare({ postId }).catch(() => undefined);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      countShare();
      toast({ title: t("share.copied") });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("share.copyLink"), description: url });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: t("title"), text: body.slice(0, 120), url });
      countShare();
    } catch {
      // User dismissed the share sheet.
    }
  };

  const openWhatsapp = () => {
    countShare();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${body.slice(0, 160)}\n${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    return (
      <Button variant="ghost" size="sm" onClick={nativeShare} className="gap-2">
        <Share2 className="h-4 w-4" aria-hidden />
        <span>{shareCount > 0 ? shareCount : t("share.action")}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" aria-hidden />
          <span>{shareCount > 0 ? shareCount : t("share.action")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
          )}
          {t("share.copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openWhatsapp}>{t("share.whatsapp")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
