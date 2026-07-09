import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";

const OFFER_KEYS = [
  "classes",
  "attendance",
  "sacraments",
  "content",
  "communication",
  "reports",
] as const;

export default function AboutPage() {
  const { t } = useTranslation("public");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-20">
        <div className="space-y-3">
          <h1
            className="text-4xl font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("about.title")}
          </h1>
          <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
          <p className="text-lg text-muted-foreground">{t("about.intro")}</p>
        </div>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#071A2D]">
            {t("about.mission_title")}
          </h2>
          <p className="text-muted-foreground">{t("about.mission_text")}</p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#071A2D]">
            {t("about.offer_title")}
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {OFFER_KEYS.map((key) => (
              <li key={key}>{t(`about.offers.${key}`)}</li>
            ))}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
