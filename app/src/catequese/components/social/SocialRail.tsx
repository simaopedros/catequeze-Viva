import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, Flame, Sparkles, Users } from "lucide-react";
import { useQuery, getSocialCommunityPulse } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { SocialSearch } from "./SocialSearch";
import { SocialAvatar } from "./SocialAvatar";

export function SocialRail({
  onSelectTopic,
  calendarTo = "/app/calendario",
  membersTo = "/comunidade",
  promoTo = "/pricing",
}: {
  onSelectTopic?: (slug: string) => void;
  calendarTo?: string;
  membersTo?: string;
  promoTo?: string;
}) {
  const { t } = useTranslation("social");
  const { data } = useQuery(getSocialCommunityPulse);
  const members = data?.members ?? [];
  const memberCount = data?.memberCount ?? 0;
  const topics = (data?.topics ?? [])
    .slice()
    .sort(
      (a: { postCount: number }, b: { postCount: number }) =>
        b.postCount - a.postCount,
    )
    .slice(0, 5);

  return (
    <aside className="space-y-3" data-testid="community-rail">
      <div className="rounded-2xl border border-border bg-white p-3 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
        <SocialSearch />
      </div>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
        <div className="mb-1 flex items-center gap-2 font-extrabold text-brand-ink">
          <Users className="h-5 w-5" aria-hidden />
          {t("rail.members")}
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          {t("rail.membersCount", { count: memberCount })}
        </p>
        {members.length > 0 ? (
          <div className="mb-3 flex items-center">
            {members.map((member: any, index: number) => (
              <div
                key={member.id}
                className={index === 0 ? "" : "-ml-1.5"}
                title={member.displayName}
              >
                {member.socialHandle ? (
                  <Link to={`/comunidade/u/${member.socialHandle}`}>
                    <SocialAvatar
                      name={member.displayName}
                      url={member.avatarUrl}
                      size="sm"
                      className="border-2 border-white"
                    />
                  </Link>
                ) : (
                  <SocialAvatar
                    name={member.displayName}
                    url={member.avatarUrl}
                    size="sm"
                    className="border-2 border-white"
                  />
                )}
              </div>
            ))}
            {memberCount > members.length ? (
              <div className="-ml-1.5 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-muted text-[10px] font-extrabold text-muted-foreground">
                +{Math.min(memberCount - members.length, 999)}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">
            {t("rail.membersEmpty")}
          </p>
        )}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 w-full text-[11px] font-bold"
        >
          <Link to={membersTo}>{t("rail.seeMembers")}</Link>
        </Button>
      </section>

      <section className="rounded-2xl border border-[#f6dfb7] bg-gradient-to-br from-[#fff8eb] to-[#fffdf8] p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
        <div className="mb-2.5 grid h-8 w-8 place-items-center rounded-full bg-[#fff0cf] text-lg text-[#b7770c]">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="text-sm font-bold text-brand-ink">
          {t("rail.promoTitle")}
        </h2>
        <p className="mt-1.5 mb-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("rail.promoBody")}
        </p>
        <Button
          asChild
          size="sm"
          className="h-8 rounded-full bg-[#ee9d1d] px-4 text-[11px] font-extrabold text-white hover:bg-[#d88c12]"
        >
          <Link to={promoTo}>{t("rail.promoCta")}</Link>
        </Button>
      </section>

      {topics.length > 0 ? (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
          <div className="mb-2 flex items-center gap-2 font-extrabold text-brand-ink">
            <Flame className="h-4 w-4" aria-hidden />
            {t("rail.popularTopics")}
          </div>
          <ul>
            {topics.map(
              (topic: { slug: string; name: string; postCount: number }) => (
                <li
                  key={topic.slug}
                  className="border-b border-[#edf0f3] last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTopic?.(topic.slug)}
                    className="flex w-full items-center gap-2 py-2 text-left text-[11px]"
                  >
                    <span className="text-[#8091a5]">#</span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {topic.name}
                    </span>
                    <span className="rounded-full bg-[#f0f3f6] px-2 py-0.5 text-[9px] text-[#5b6f86]">
                      {topic.postCount}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]">
        <div className="mb-3 flex items-center gap-2 font-extrabold text-brand-ink">
          <CalendarDays className="h-5 w-5" aria-hidden />
          {t("rail.events")}
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("rail.eventsBody")}
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 w-full text-[11px] font-bold"
        >
          <Link to={calendarTo}>{t("rail.eventsCta")}</Link>
        </Button>
      </section>

      <section className="relative flex min-h-[86px] items-center gap-3 overflow-hidden rounded-2xl border border-brand-ink bg-brand-ink p-4 text-white">
        <span
          aria-hidden
          className="absolute -right-2.5 -bottom-8 h-[110px] w-[110px] rounded-full border border-white/15"
        />
        <span className="font-brand-display text-[2.4rem] leading-none">
          ✝
        </span>
        <div>
          <strong className="block text-sm">{t("rail.missionTitle")}</strong>
          <span className="mt-1 block text-[10px] text-white/70">
            {t("rail.missionSubtitle")}
          </span>
          <div className="mt-2 h-0.5 w-12 bg-brand-gold" />
        </div>
      </section>
    </aside>
  );
}
