import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LifeBuoy } from "lucide-react";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";

type HelpItem = { q: string; a: string };
type HelpGroup = { title: string; items: HelpItem[] };

export default function HelpPage() {
  const { t } = useTranslation("public");
  const raw = t("help.groups", { returnObjects: true, defaultValue: [] });
  const groups = Array.isArray(raw) ? (raw as HelpGroup[]) : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-20">
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-4xl text-brand-ink sm:text-4xl">
            {t("help.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-lg text-muted-foreground">{t("help.intro")}</p>
        </div>

        {groups.map((group) => (
          <section key={group.title} className="space-y-3">
            <AppDisplayTitle
              as="h2"
              className="text-2xl text-brand-ink sm:text-2xl"
            >
              {group.title}
            </AppDisplayTitle>
            <div className="divide-y divide-border/70 rounded-sm border border-border/70 bg-white">
              {group.items.map((item) => (
                <details key={item.q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium text-brand-ink marker:hidden">
                    <span className="mr-2 inline-block transition-transform group-open:rotate-90">
                      ›
                    </span>
                    {item.q}
                  </summary>
                  <p className="mt-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-3 rounded-sm border border-border/70 bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" />
            <div>
              <p className="font-semibold text-brand-ink">
                {t("help.contact_title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("help.contact_text")}
              </p>
            </div>
          </div>
          <Button
            asChild
            className="rounded-sm bg-brand-ink text-white hover:bg-brand-ink-soft"
          >
            <Link to="/contact">{t("help.contact_cta")}</Link>
          </Button>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
