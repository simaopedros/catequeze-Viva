import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getPastoralGroup,
  joinPastoralGroup,
  leavePastoralGroup,
  decideGroupJoin,
  postGroupNotice,
  useQuery,
} from "wasp/client/operations";
import { AppPageHeader, AppPanel } from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";
import { Textarea } from "../../client/components/ui/textarea";
import { SkeletonPage } from "../../client/components/Skeletons";
import { toast } from "../../client/hooks/use-toast";
import { QueryErrorState } from "../../client/components/QueryErrorState";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("groups");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery(
    getPastoralGroup,
    { id },
    { enabled: Boolean(id) },
  );

  if (isLoading) return <SkeletonPage />;
  if (error || !data) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  const isMember = data.myStatus === "ACTIVE";
  const pending = data.myStatus === "PENDING";

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: ok });
      await refetch();
    } catch (err: any) {
      toast({
        title: tc("error"),
        description: err?.message || t("action_error"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t(`kinds.${data.kind}`)}
        title={data.name}
        subtitle={[data.city, data.state].filter(Boolean).join(" · ") || t("no_city")}
        secondaryActions={[
          {
            label: tc("back"),
            onClick: () => navigate("/app/grupos"),
          },
        ]}
        primaryAction={
          isMember
            ? {
                label: t("leave"),
                onClick: () => run(() => leavePastoralGroup({ groupId: data.id }), t("left")),
              }
            : pending
              ? { label: t("status_pending"), onClick: () => undefined }
              : {
                  label: t("join"),
                  onClick: () =>
                    run(() => joinPastoralGroup({ groupId: data.id }), t("joined")),
                }
        }
      />

      {data.description && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {data.description}
        </p>
      )}

      {data.restricted ? (
        <AppPanel>
          <p className="text-sm text-muted-foreground">{t("restricted")}</p>
        </AppPanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <AppPanel className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-brand-ink">{t("notices")}</h2>
            {data.canManage && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await postGroupNotice({ groupId: data.id, body: notice });
                    setNotice("");
                  }, t("notice_posted"));
                }}
              >
                <Textarea
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  placeholder={t("notice_placeholder")}
                  rows={3}
                />
                <Button type="submit" disabled={busy || notice.trim().length < 3}>
                  {t("post_notice")}
                </Button>
              </form>
            )}
            {data.notices?.length ? (
              <ul className="space-y-3">
                {data.notices.map((n: any) => (
                  <li key={n.id} className="border-t border-border/70 pt-3 first:border-0 first:pt-0">
                    <p className="text-sm text-brand-ink">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.authorName}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("no_notices")}</p>
            )}
          </AppPanel>
          <AppPanel className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-ink">{t("members")}</h2>
            <ul className="space-y-2">
              {(data.members || []).map((m: any) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-brand-ink">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`roles.${m.role}`)}
                    {m.status !== "ACTIVE" ? ` · ${t(`status_${m.status.toLowerCase()}`)}` : ""}
                  </span>
                  {data.canManage && m.status === "PENDING" && (
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => decideGroupJoin({ membershipId: m.id, accept: true }),
                            t("join_accepted"),
                          )
                        }
                      >
                        {tc("confirm")}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => decideGroupJoin({ membershipId: m.id, accept: false }),
                            t("join_rejected"),
                          )
                        }
                      >
                        {tc("cancel")}
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AppPanel>
        </div>
      )}
    </div>
  );
}
