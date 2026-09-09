import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../../client/hooks/usePageTitle";

export function SocialHero({ subtitle }: { subtitle?: string }) {
  const { t } = useTranslation("social");
  usePageTitle(t("title"));

  return (
    <section
      data-testid="community-hero"
      className="relative flex min-h-[184px] items-center overflow-hidden rounded-[14px] px-6 py-8 text-white shadow-[0_3px_16px_rgba(18,46,76,0.07)] sm:px-9 sm:py-9"
      style={{
        background:
          "linear-gradient(90deg, rgba(7,26,45,0.98) 0%, rgba(7,26,45,0.88) 45%, rgba(7,26,45,0.35) 100%), radial-gradient(circle at 75% 45%, #bd8b58 0%, #705034 18%, #203246 47%, #071d36 72%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 top-4 font-brand-display text-[7rem] leading-none text-white/15 sm:right-16 sm:top-6 sm:text-[7.5rem]"
      >
        ✝
      </span>
      <div className="relative z-10 max-w-xl">
        <p className="mb-2 text-[12px] font-extrabold tracking-[0.09em] text-brand-gold">
          {t("hero.eyebrow")}
        </p>
        <h1 className="text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[1.8rem]">
          {t("hero.title")}
        </h1>
        <p className="mt-2.5 max-w-[490px] text-sm leading-relaxed text-white/85">
          {subtitle ?? t("hero.description")}
        </p>
      </div>
    </section>
  );
}
