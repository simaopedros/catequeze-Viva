import { useLandingText } from "../hooks/useLandingText";

/**
 * Emotional beat: more heart in the meeting, less weight in the week.
 */
export function PresenceSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const line2 = String(tr("presence.title_line2") || "").trim();
  const subtitle = String(tr("presence.subtitle") || "").trim();

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-5xl sm:leading-[1.12] text-balance">
            {tr("presence.title_line1")}
            {line2 ? (
              <>
                <br />
                {line2}
              </>
            ) : null}
          </h2>
          <div
            className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-brand-gold to-transparent"
            aria-hidden
          />
          {subtitle ? (
            <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
