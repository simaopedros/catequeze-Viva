import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreditsPill } from "../CreditsPill";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";

interface AiHubLayoutProps {
  title: string;
  subtitle?: string;
  creditsLeft?: number | null;
  monthlyAllowance?: number | null;
  children: ReactNode;
}

export function AiHubLayout({
  title,
  subtitle,
  creditsLeft,
  monthlyAllowance,
  children,
}: AiHubLayoutProps) {
  const { t } = useTranslation("ai");

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="shrink-0 border-b border-border/70 bg-white px-3 py-4 lg:px-4">
        <AppPageHeader
          className="border-0 pb-0"
          eyebrow={t("hub.eyebrow", { defaultValue: "Encontros" })}
          title={title}
          subtitle={subtitle}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-sm"
                asChild
              >
                <Link to="/app/ai-hub">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  {t("planner.back_to_hub")}
                </Link>
              </Button>
              {creditsLeft !== null && creditsLeft !== undefined && (
                <CreditsPill
                  creditsLeft={creditsLeft}
                  monthlyAllowance={monthlyAllowance ?? undefined}
                  onClick={() => {
                    window.location.href = "/app/billing";
                  }}
                />
              )}
            </div>
          }
        />
      </div>
      <div className="flex-1 bg-muted/30">{children}</div>
    </div>
  );
}
