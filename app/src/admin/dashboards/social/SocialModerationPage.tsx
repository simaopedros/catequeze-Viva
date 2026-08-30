import { useState } from "react";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getSocialModerationQueue,
  moderateSocialContent,
  setSocialAuthorBan,
} from "wasp/client/operations";
import { ExternalLink, Flag, Loader2, ShieldOff, Trash2 } from "lucide-react";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { EmptyState } from "../../../client/components/EmptyState";
import { toast } from "../../../client/hooks/use-toast";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";

type ModerationAction = "REMOVE" | "APPROVE" | "DISMISS";

/** Parked with the rest of the Comunidade module — see shared/socialFeatures. */
const SocialModerationPage = ({ user }: { user: AuthUser }) => {
  if (!SOCIAL_FEATURES_ENABLED) {
    return <Navigate to="/admin" replace />;
  }

  return <SocialModerationQueue user={user} />;
};

const SocialModerationQueue = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("social");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(getSocialModerationQueue, {
    status: "OPEN",
  });

  const act = async (
    key: string,
    targetType: "POST" | "COMMENT",
    targetId: string,
    action: ModerationAction,
  ) => {
    const reason =
      action === "REMOVE" ? window.prompt(t("moderation.removalReason")) ?? "" : undefined;

    setBusyId(key);
    try {
      await moderateSocialContent({ targetType, targetId, action, reason });
      toast({ title: t("moderation.actioned") });
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || t("moderation.actioned"), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const ban = async (key: string, userId: string, banned: boolean) => {
    const reason = banned ? window.prompt(t("moderation.banReason")) ?? "" : undefined;

    setBusyId(key);
    try {
      await setSocialAuthorBan({ userId, banned, reason });
      toast({ title: banned ? t("moderation.authorSuspended") : t("moderation.actioned") });
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || t("moderation.actioned"), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const reports = data?.reports ?? [];
  const pendingPosts = data?.pendingPosts ?? [];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow="Admin"
          title={t("moderation.title")}
          subtitle={t("moderation.subtitle")}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("moderation.queue")}
          </h2>

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("feed.loading")}
            </p>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={Flag}
              title={t("moderation.empty")}
              description={t("moderation.emptyDescription")}
              compact
            />
          ) : (
            <ul className="space-y-3">
              {reports.map((report: any) => (
                <li
                  key={report.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">{t(`report.reason.${report.reason}`)}</Badge>
                    <Badge variant="outline">{report.targetType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("moderation.reportedBy")}:{" "}
                      {report.reporter?.displayName || t("moderation.anonymous")}
                    </span>
                    {report.target?.slug && (
                      <a
                        href={`/comunidade/p/${report.target.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                      >
                        {t("moderation.openTarget")}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </div>

                  {report.details && (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      “{report.details}”
                    </p>
                  )}

                  {report.target ? (
                    <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-sm">
                      {report.target.body}
                    </blockquote>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("post.notFoundDescription")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === report.id}
                      onClick={() => act(report.id, report.targetType, report.targetId, "REMOVE")}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("moderation.removeContent")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === report.id}
                      onClick={() => act(report.id, report.targetType, report.targetId, "DISMISS")}
                    >
                      {t("moderation.dismiss")}
                    </Button>
                    {report.target?.author && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === report.id}
                        onClick={() =>
                          ban(report.id, report.target.author.id, !report.target.author.banned)
                        }
                        className="gap-2"
                      >
                        <ShieldOff className="h-4 w-4" aria-hidden />
                        {report.target.author.banned
                          ? t("moderation.unbanAuthor")
                          : t("moderation.banAuthor")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("moderation.pending")}
          </h2>

          {pendingPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("moderation.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {pendingPosts.map((post: any) => (
                <li
                  key={post.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <p className="text-xs text-muted-foreground">{post.author.displayName}</p>
                  <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-sm">
                    {post.body}
                  </blockquote>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === post.id}
                      onClick={() => act(post.id, "POST", post.id, "APPROVE")}
                    >
                      {t("moderation.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === post.id}
                      onClick={() => act(post.id, "POST", post.id, "REMOVE")}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("moderation.removeContent")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DefaultLayout>
  );
};

export default SocialModerationPage;
