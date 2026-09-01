import { useParams, Link, useNavigate } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  User,
  MessageCircle,
  MapPin,
  Phone,
} from "lucide-react";
import { EmptyState } from "../../client/components/EmptyState";
import {
  useQuery,
  listCommunities,
  listClasses,
  listHouseholds,
  createConversation,
} from "wasp/client/operations";
import { useCommunityTypeLabels } from "../../i18n/useLabels";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { useActiveParish } from "../../client/hooks/useActiveParish";

const AVATAR_COLORS = ["border border-border/70 bg-muted/30 text-brand-ink"];

export default function CommunityDetailPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const typeLabels = useCommunityTypeLabels();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const { data: communities = [], isLoading: loading } = useQuery(
    listCommunities,
    { parishId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );
  const community = communities.find((c: any) => c.id === id);
  const workspaceId = community?.parishId || activeParishId || undefined;

  const { data: classes = [] } = useQuery(
    listClasses,
    {
      communityId: id!,
      workspaceId,
    } as any,
    { enabled: Boolean(id && workspaceId) },
  );
  const { data: households = [] } = useQuery(
    listHouseholds,
    {
      communityId: id!,
      parishId: workspaceId,
    } as any,
    { enabled: Boolean(id && workspaceId) },
  );

  const [tab, setTab] = useState<"turmas" | "familias" | "catequistas">(
    "turmas",
  );

  const catechistsFromClasses = new Map<string, any>();
  classes.forEach((cls: any) => {
    cls.catechists?.forEach((cc: any) => {
      if (!catechistsFromClasses.has(cc.user?.id)) {
        catechistsFromClasses.set(cc.user?.id, {
          ...cc.user,
          role: cc.role,
          className: cls.name,
        });
      }
    });
  });
  const uniqueCatechists = Array.from(catechistsFromClasses.values());

  const handleOpenCommunityChat = async () => {
    try {
      const conv = await createConversation({
        type: "GROUP",
        title: tp("community_chat_title", { name: community.name }),
        parishId: community.parishId,
        communityId: id!,
        participantUserIds: uniqueCatechists.map((c: any) => c.id),
      });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 animate-pulse py-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  if (!community)
    return (
      <div className="p-6 text-destructive">{tp("community_not_found")}</div>
    );

  const tabs = [
    {
      id: "turmas" as const,
      label: tp("tab_classes", { count: classes.length }),
      icon: GraduationCap,
    },
    {
      id: "familias" as const,
      label: tp("tab_families", { count: households.length }),
      icon: Users,
    },
    {
      id: "catequistas" as const,
      label: tp("tab_catechists", { count: uniqueCatechists.length }),
      icon: User,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" asChild>
          <Link to="/app/communities" aria-label={t("back")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <AppPageHeader
          className="min-w-0 flex-1 border-0 pb-0"
          eyebrow={
            typeLabels[community.type as keyof typeof typeLabels] ||
            community.type
          }
          title={community.name}
          subtitle={
            community.coordinatorName
              ? tp("coordinator_label", { name: community.coordinatorName })
              : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={handleOpenCommunityChat}
            >
              <MessageCircle className="mr-1 h-3 w-3" />
              {tp("chat")}
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {community.street && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {t("address")}
            </h3>
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {community.street}
              {community.number ? `, ${community.number}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {community.neighborhood} {community.city}/{community.state}
            </p>
          </div>
        )}
        {community.phone && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Phone className="h-3 w-3" />
              {tp("contact")}
            </h3>
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {community.phone}
            </p>
            {community.email && (
              <p className="text-xs text-muted-foreground">{community.email}</p>
            )}
          </div>
        )}
        <div className="rounded-sm border border-border/70 bg-white p-4">
          <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            {tp("summary")}
          </h3>
          <p className="text-sm font-semibold tracking-tight text-brand-ink">
            {tp("summary_counts", {
              classes: classes.length,
              families: households.length,
              catechists: uniqueCatechists.length,
            })}
          </p>
        </div>
      </div>

      {community.description && (
        <div className="rounded-sm border border-border/70 bg-white p-4">
          <p className="text-sm text-muted-foreground">
            {community.description}
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-border/70">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`relative flex items-center gap-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === tabItem.id
                ? "text-brand-ink"
                : "text-muted-foreground hover:text-brand-ink"
            }`}
          >
            <tabItem.icon className="h-3.5 w-3.5" />
            {tabItem.label}
            {tab === tabItem.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold"
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>

      {tab === "turmas" && (
        <div>
          {classes.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={tp("no_classes_in_community")}
              compact
            />
          ) : (
            <div className="grid gap-2">
              {classes.map((cls: any) => (
                <Link
                  key={cls.id}
                  to={`/app/classes/${cls.id}`}
                  className="flex items-center justify-between rounded-sm border border-border/70 bg-white p-3 transition-colors hover:bg-muted/20"
                >
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-brand-ink">
                      {cls.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cls.stage?.name && `${cls.stage.name} · `}
                      {cls.dayOfWeek && `${cls.dayOfWeek} ${cls.startTime}`}
                      {cls._count?.enrollments
                        ? ` · ${cls._count.enrollments} ${t("enrolled")}`
                        : ""}
                    </p>
                  </div>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "familias" && (
        <div>
          {households.length === 0 ? (
            <EmptyState
              icon={Users}
              title={tp("no_families_in_community")}
              compact
            />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {households.map((h: any) => (
                <Link
                  key={h.id}
                  to={`/app/families/${h.id}`}
                  className="rounded-sm border border-border/70 bg-white p-3 transition-colors hover:bg-muted/20"
                >
                  <p className="text-sm font-semibold tracking-tight text-brand-ink">
                    {h.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("families.summary", {
                      catechumens: h._count?.catechumens || 0,
                      guardians: h.guardians?.length || 0,
                    })}
                  </p>
                  {h.catechumens?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {h.catechumens.slice(0, 3).map((c: any) => (
                        <span
                          key={c.id}
                          className="rounded-sm bg-muted px-2 py-0.5 text-overline"
                        >
                          {c.firstName}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "catequistas" && (
        <div>
          {uniqueCatechists.length === 0 ? (
            <EmptyState
              icon={User}
              title={tp("no_catechists_in_community")}
              compact
            />
          ) : (
            <div className="grid gap-2">
              {uniqueCatechists.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-sm border border-border/70 bg-white p-3"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-sm text-xs font-semibold ${AVATAR_COLORS[0]}`}
                  >
                    {c.firstName?.[0]}
                    {c.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold tracking-tight text-brand-ink">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.className} ·{" "}
                      {c.role === "LEAD"
                        ? tp("lead_catechist")
                        : tp("assistant_catechist")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
