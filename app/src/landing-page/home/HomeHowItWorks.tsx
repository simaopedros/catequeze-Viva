import { useEffect, useRef, useState, type ReactNode } from "react";
import * as m from "motion/react-m";
import { Check } from "lucide-react";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";
import { HomeMotion } from "./HomeMotion";
import { HomeSectionHeader } from "./HomeSectionHeader";
import { HOW_MOCKS } from "./HowMocks";
import { useInViewOnce } from "./homeMotionEnv";

type HowRow = {
  step: string;
  title: string;
  desc: string;
  bullets?: string[];
};

/** Must match the media query that shows `.home-how-pinned-col` in Main.css. */
const PINNED_QUERY = "(min-width: 1024px) and (min-height: 700px)";

/**
 * Layout is decided by CSS only; this flag just gates the pinned phone's
 * animations so they don't run while it's `display: none`.
 */
function usePinnedLayout() {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PINNED_QUERY);
    const update = () => setPinned(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return pinned;
}

export function HomeHowItWorks({ ns = "landing" }: { ns?: string }) {
  return (
    <HomeMotion>
      <HowContent ns={ns} />
    </HomeMotion>
  );
}

function HowContent({ ns }: { ns: string }) {
  const tr = useLandingText(ns);
  const rowsRaw = tr("how.rows", { returnObjects: true });
  const rows = Array.isArray(rowsRaw) ? (rowsRaw as HowRow[]).slice(0, HOW_MOCKS.length) : [];
  const pinned = usePinnedLayout();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [rows.length]);

  if (rows.length === 0) return null;

  return (
    <section id="como" className="relative scroll-mt-20 bg-white">
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-24">
        <HomeSectionHeader
          eyebrow={String(tr("how.eyebrow") || "").trim()}
          title={tr("how.title")}
          subtitle={String(tr("how.subtitle") || "").trim()}
        />

        <div className="home-how-grid mx-auto mt-12 max-w-2xl sm:mt-16">
          <ol className="space-y-14">
            {rows.map((row, index) => {
              const Mock = HOW_MOCKS[index];
              const isActive = !pinned || active === index;
              return (
                <li
                  key={row.title}
                  ref={(el) => {
                    stepRefs.current[index] = el;
                  }}
                  className="home-how-step flex flex-col justify-center"
                >
                  <div
                    className={cn(
                      "border-l-2 pl-5 transition-[opacity,border-color] duration-500 sm:pl-7",
                      isActive ? "border-brand-gold opacity-100" : "border-brand-ink/10 opacity-45",
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
                      {row.step}
                    </p>
                    <h3 className="font-brand-display mt-3 text-2xl font-medium tracking-tight text-brand-ink text-balance sm:text-3xl">
                      {row.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                      {row.desc}
                    </p>
                    {row.bullets && row.bullets.length > 0 ? (
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {row.bullets.map((item) => (
                          <li
                            key={item}
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand-ink/10 bg-[#FBF9F4] px-3 py-1 text-[12px] font-medium text-brand-ink/80"
                          >
                            <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {Mock ? <InlineMock Mock={Mock} ns={ns} /> : null}
                </li>
              );
            })}
          </ol>

          <div className="home-how-pinned-col" aria-hidden>
            <div className="home-how-pinned">
              <PhoneFrame>
                {HOW_MOCKS.map((Mock, index) => (
                  <m.div
                    key={index}
                    className="absolute inset-0 p-4"
                    initial={false}
                    animate={{
                      opacity: active === index ? 1 : 0,
                      y: active === index ? 0 : active > index ? -24 : 24,
                      scale: active === index ? 1 : 0.97,
                    }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Mock ns={ns} play={pinned && active === index} />
                  </m.div>
                ))}
              </PhoneFrame>
              <div className="mt-5 flex justify-center gap-2">
                {HOW_MOCKS.map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      active === index ? "w-6 bg-brand-gold" : "w-1.5 bg-brand-ink/15",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InlineMock({
  Mock,
  ns,
}: {
  Mock: (typeof HOW_MOCKS)[number];
  ns: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>("0px 0px -20% 0px");
  return (
    <div ref={ref} className="home-how-inline-mock mt-7" aria-hidden>
      <div className="mx-auto h-[400px] max-w-[340px] overflow-hidden rounded-[1.75rem] border border-brand-ink/10 bg-[#FBF9F4] p-4 shadow-[0_24px_60px_-34px_rgba(7,26,45,0.55)]">
        <Mock ns={ns} play={inView} />
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-[300px] rounded-[2.6rem] bg-brand-ink p-2.5 shadow-[0_40px_90px_-30px_rgba(7,26,45,0.65)]">
      <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-brand-ink" />
      <div className="relative aspect-[9/17] overflow-hidden rounded-[2.1rem] bg-[#FBF9F4]">
        <div className="absolute inset-x-0 top-0 h-7" />
        <div className="absolute inset-0 top-6">{children}</div>
      </div>
    </div>
  );
}
