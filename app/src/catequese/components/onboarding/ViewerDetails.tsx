import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Eye, Check } from "lucide-react";

interface ViewerDetailsProps {
  onComplete: () => void;
}

export function ViewerDetails({ onComplete }: ViewerDetailsProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 shrink-0 text-[#071A2D]" />
          <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
            {t("viewer.title")}
          </AppDisplayTitle>
        </div>
        <AppGoldRule />
      </div>
      <p className="text-sm text-muted-foreground">{t("viewer.desc")}</p>
      <div className="flex justify-end">
        <Button onClick={onComplete}>
          <Check className="mr-2 h-4 w-4" />
          {t("viewer.confirm")}
        </Button>
      </div>
    </div>
  );
}
