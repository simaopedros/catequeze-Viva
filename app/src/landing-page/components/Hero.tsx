import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";
import { useTranslation } from "react-i18next";
import { ArrowRight, Feather } from "lucide-react";

export default function Hero() {
  const { t } = useTranslation('landing');

  return (
    <div className="relative w-full pt-14 overflow-hidden">
      <div className="absolute inset-0 bg-[#F7F4EE]/80" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#071A2D]/08 rounded-full blur-3xl pointer-events-none" />
      <div className="md:p-24 relative">
        <div className="max-w-8xl mx-auto px-6 lg:px-8">
          <div className="lg:mb-18 mx-auto max-w-3xl text-center">
            <h1
              className="text-balance text-5xl font-semibold tracking-tight text-[#071A2D] sm:text-6xl"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("hero.headline_line1")}{" "}
              <span className="text-[#D39A2B]">{t("hero.headline_line2")}</span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8">
              {t('hero.subheadline')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="outline" asChild>
                <WaspRouterLink to={routes.PricingPageRoute.to}>
                  {t('hero.cta_secondary')}
                </WaspRouterLink>
              </Button>
              <Button size="lg" variant="brand" asChild>
                <WaspRouterLink to={routes.SignupRoute.to}>
                  {t('hero.cta_primary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </WaspRouterLink>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <Feather className="inline h-3.5 w-3.5 mr-1" />
              {t('hero.trust_signals')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
