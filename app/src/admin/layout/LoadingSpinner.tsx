import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const LoadingSpinner = () => {
  const { t } = useTranslation("common");
  return (
    <div role="status" className="flex items-center justify-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
};

export default LoadingSpinner;
