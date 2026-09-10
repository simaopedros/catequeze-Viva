import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Eye, X } from "lucide-react";
import { Button } from "../client/components/ui/button";
import {
  getImpersonationRestore,
  isImpersonating,
  stopImpersonation,
} from "./impersonation";

export function ImpersonationBanner() {
  const { t } = useTranslation("admin");
  const impersonating = isImpersonating();

  useEffect(() => {
    if (!impersonating) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "3rem";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [impersonating]);

  if (!impersonating) return null;
  const restore = getImpersonationRestore();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 bg-brand-gold-muted px-4 py-2 text-sm text-white"
      role="status"
    >
      <Eye className="h-4 w-4 shrink-0" />
      <span>{t("impersonation.banner", { email: restore?.email || "—" })}</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 rounded-sm bg-white text-brand-gold-muted hover:bg-white/90"
        onClick={() => {
          stopImpersonation();
          window.location.href = "/admin/users";
        }}
      >
        <X className="mr-1 h-3.5 w-3.5" />
        {t("impersonation.exit")}
      </Button>
    </div>
  );
}
