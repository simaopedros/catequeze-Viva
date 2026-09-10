import { HandHeart, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export function RhemaMock({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  return (
    <div className="flex h-full items-stretch bg-brand-ink text-white">
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
        <div className="absolute bottom-4 left-4 right-16 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-brand-gold">
            {t("mockup_rhema.handle", { defaultValue: "@catequista_ana" })}
          </p>
          <p className="text-sm leading-relaxed">
            {t("mockup_rhema.caption", {
              defaultValue: "Encontro de hoje: o Pai-Nosso. Amém!",
            })}
          </p>
        </div>
      </div>
      <div className="flex w-14 flex-col items-center justify-end gap-4 py-6">
        <Play className="h-5 w-5" aria-hidden />
        <HandHeart className="h-5 w-5" aria-hidden />
        <span className="text-[10px]">
          {t("mockup_rhema.amen", { defaultValue: "Amém" })}
        </span>
      </div>
    </div>
  );
}
