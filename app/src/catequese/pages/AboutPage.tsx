import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";

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
  const list = (key: string) => {
    const value = t(key, { returnObjects: true, defaultValue: [] });
    return Array.isArray(value) ? (value as string[]) : [];
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-20">
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-4xl text-brand-ink sm:text-4xl">
            {t("about.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-lg text-muted-foreground">{t("about.intro")}</p>
        </div>

        <section className="space-y-2">
          <AppDisplayTitle
            as="h2"
            className="text-2xl text-brand-ink sm:text-2xl"
          >
            {t("about.mission_title")}
          </AppDisplayTitle>
          <p className="text-muted-foreground">{t("about.mission_text")}</p>
        </section>

        <section className="space-y-2">
          <AppDisplayTitle
            as="h2"
            className="text-2xl text-brand-ink sm:text-2xl"
          >
            {t("about.offer_title")}
          </AppDisplayTitle>
          <ul className="space-y-3 text-muted-foreground">
            {OFFER_KEYS.map((key) => (
              <li key={key}>{t(`about.offers.${key}`)}</li>
            ))}
          </ul>
        </section>

        {(["audience", "principles"] as const).map((key) => (
          <section key={key} className="space-y-2">
            <AppDisplayTitle
              as="h2"
              className="text-2xl text-brand-ink sm:text-2xl"
            >
              {t(`about.${key}_title`)}
            </AppDisplayTitle>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              {list(`about.${key}`).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="space-y-3 rounded-sm border border-border/70 bg-muted/30 p-5">
          <AppDisplayTitle
            as="h2"
            className="text-2xl text-brand-ink sm:text-2xl"
          >
            {t("about.contact_title")}
          </AppDisplayTitle>
          <p className="text-muted-foreground">{t("about.contact_text")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="rounded-sm bg-brand-ink text-white hover:bg-brand-ink-soft"
            >
              <Link to="/contact">{t("about.contact_cta")}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-sm">
              <Link to="/help">{t("about.help_cta")}</Link>
            </Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
