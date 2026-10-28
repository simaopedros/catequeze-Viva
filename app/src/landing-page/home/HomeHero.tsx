import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, CalendarCheck, Check, HeartHandshake, UsersRound } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { landingCopy, useLandingText } from "../hooks/useLandingText";
import { BrowserFrame } from "../components/BrowserFrame";
import { ProductHeroShot } from "../components/ProductHeroShot";
import { usePauseOffscreen } from "./homeMotionEnv";
import { SeedSprout, WheatStalk } from "./SeedSprout";

type HeroCard = { label: string; value: string };

const CARD_ICONS = [UsersRound, CalendarCheck, HeartHandshake];

const CARD_POSITIONS = [
  "left-2 top-[18%] sm:-left-6 lg:-left-16",
  "right-2 top-[44%] sm:-right-6 lg:-right-14",
  "left-6 bottom-[-6%] sm:left-[8%] lg:-left-6",
];

const WORD_STAGGER_MS = 45;

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function splitTrust(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const sep = raw.includes("•") ? "•" : raw.includes("·") ? "·" : null;
  if (!sep) return [];
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Home-only hero. CSS-only motion so the LCP image and the headline paint
 * immediately: they animate transform/clip, never from opacity 0.
 */
export function HomeHero({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const [searchParams] = useSearchParams();
  const { ref: loopRef, paused } = usePauseOffscreen<HTMLElement>();

  const campaign =
    searchParams.get("utm_campaign") || searchParams.get("campaign") || undefined;
  const signupParams = new URLSearchParams();
  if (campaign) signupParams.set("campaign", campaign);
  for (const key of ["plan", "interval"]) {
    const value = searchParams.get(key);
    if (value) signupParams.set(key, value);
  }
  const signupHref = `/signup${signupParams.size ? `?${signupParams.toString()}` : ""}`;

  const line1 = String(tr("hero.headline_line1") || "").trim();
  const line2 = String(tr("hero.headline_line2") || "").trim();
  const words1 = line1.split(/\s+/).filter(Boolean);
  const words2 = line2.split(/\s+/).filter(Boolean);
  const badge = String(tr("hero.badge") || "").trim();
  const secondary = String(tr("hero.cta_secondary") || "").trim();
  const secondaryHref = String(tr("hero.cta_secondary_href") || "/#como").trim();
  const trustParts = splitTrust(tr("hero.trust_signals"));
  const cardsRaw = tr("home.hero.cards", { returnObjects: true });
  const cards = Array.isArray(cardsRaw) ? (cardsRaw as HeroCard[]).slice(0, 3) : [];
  const imageAlt = landingCopy(
    tr,
    "hero.image_alt",
    "Painel do Catechis com turmas, presença e próximas ações",
  );

  const textStart = (words1.length + words2.length) * WORD_STAGGER_MS + 180;

  return (
    <section
      ref={loopRef}
      data-landing-hero
      data-paused={paused ? "" : undefined}
      className="relative isolate overflow-x-clip bg-[linear-gradient(180deg,#FBF6EC_0%,#FDFBF6_46%,#FFFFFF_100%)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 home-grain opacity-[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(211,154,43,0.22),rgba(211,154,43,0.06)_55%,transparent)]"
      />
      <WheatStalk
        className="pointer-events-none absolute bottom-0 left-[max(0px,calc(50%-41rem))] -z-10 hidden h-[26rem] w-auto opacity-40 xl:block"
        delay={200}
      />
      <WheatStalk
        flip
        className="pointer-events-none absolute bottom-0 right-[max(0px,calc(50%-41rem))] -z-10 hidden h-[22rem] w-auto opacity-30 xl:block"
        delay={450}
      />

      <div className="mx-auto max-w-[70rem] px-5 pb-20 pt-10 sm:pb-24 sm:pt-14 lg:pt-16">
        <div className="mx-auto flex max-w-[800px] flex-col items-center space-y-5 text-center">
          <SeedSprout className="h-14 w-14 sm:h-16 sm:w-16" />

          {badge ? (
            <p
              className="home-fade-up text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted"
              style={delay(120)}
            >
              {badge}
            </p>
          ) : null}

          <h1 className="font-brand-display text-[2.75rem] font-medium leading-[0.98] tracking-tight text-brand-ink text-balance sm:text-6xl lg:text-[4.75rem]">
            {words1.map((word, i) => (
              <span key={`a-${i}`}>
                <span className="home-word">
                  <span className="home-word-inner" style={delay(i * WORD_STAGGER_MS)}>
                    {word}
                  </span>
                </span>{" "}
              </span>
            ))}
            {words2.length > 0 ? <br /> : null}
            {words2.map((word, i) => {
              const last = i === words2.length - 1;
              return (
                <span key={`b-${i}`}>
                  <span className="home-word">
                    <span
                      className={cn(
                        "home-word-inner",
                        last && "bg-[linear-gradient(transparent_62%,rgba(211,154,43,0.28)_62%)]",
                      )}
                      style={delay((words1.length + i) * WORD_STAGGER_MS)}
                    >
                      {word}
                    </span>
                  </span>
                  {last ? null : " "}
                </span>
              );
            })}
          </h1>

          <p
            className="home-fade-up mx-auto max-w-[42rem] text-[15px] leading-relaxed text-muted-foreground sm:text-lg"
            style={delay(textStart)}
          >
            {tr("hero.subheadline")}
          </p>

          <div
            className="home-fade-up flex w-full flex-col items-center gap-3 pt-1 sm:w-auto"
            style={delay(textStart + 120)}
          >
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
              <Button
                size="xl"
                asChild
                className="home-shimmer home-loop h-auto min-h-12 w-full rounded-md px-6 text-center leading-snug whitespace-normal shadow-[0_10px_30px_-12px_rgba(7,26,45,0.55)] sm:w-auto sm:min-w-[220px] sm:px-8"
              >
                <Link
                  to={signupHref}
                  onClick={() =>
                    trackMarketingEvent("primary_cta_clicked", {
                      landing: ns,
                      placement: "hero",
                      destination: signupHref,
                      campaign: campaign || null,
                    })
                  }
                >
                  {tr("hero.cta_primary")}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
              {secondary ? (
                <Button
                  size="xl"
                  variant="outline"
                  asChild
                  className="h-auto min-h-12 w-full rounded-md border-brand-ink/15 bg-white/70 px-6 text-center leading-snug whitespace-normal shadow-none sm:w-auto sm:min-w-[220px] sm:px-8"
                >
                  <a href={secondaryHref}>{secondary}</a>
                </Button>
              ) : null}
            </div>

            {trustParts.length > 0 ? (
              <ul className="flex flex-wrap justify-center gap-2 pt-1">
                {trustParts.map((part) => (
                  <li
                    key={part}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/25 bg-white/80 px-3 py-1 text-[11px] font-medium text-brand-ink/75"
                  >
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                    {part}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto mt-12 w-full max-w-[900px] sm:mt-14">
          <div
            aria-hidden
            className="home-glow home-loop pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgba(211,154,43,0.28),transparent)]"
          />
          <div className="home-tilt-in" style={delay(240)}>
            <BrowserFrame
              url="catechis.app/app"
              aspect="natural"
              className="rounded-[14px] shadow-[0_30px_80px_-20px_rgba(9,32,53,0.32)]"
            >
              <ProductHeroShot alt={imageAlt} />
            </BrowserFrame>
          </div>

          {cards.map((card, i) => {
            const Icon = CARD_ICONS[i] ?? Check;
            return (
              <div
                key={card.label}
                aria-hidden
                className={cn("absolute z-10", CARD_POSITIONS[i])}
              >
                <div className="home-fade-up" style={delay(1000 + i * 260)}>
                  <div
                    className="home-float home-loop flex items-center gap-2.5 rounded-xl border border-brand-ink/8 bg-white/95 px-3 py-2 shadow-[0_14px_34px_-14px_rgba(7,26,45,0.45)] sm:px-3.5 sm:py-2.5"
                    style={{ animationDelay: `${-i * 1.1}s` }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-muted sm:h-8 sm:w-8">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="text-left leading-tight">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {card.label}
                      </span>
                      <span className="block text-[12px] font-semibold text-brand-ink sm:text-[13px]">
                        {card.value}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
