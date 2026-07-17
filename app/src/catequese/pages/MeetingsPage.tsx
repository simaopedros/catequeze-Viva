import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Badge } from "../../client/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import {
  Plus,
  Calendar,
  BookOpen,
  Feather,
  MessageCircle,
  Trash2,
  ClipboardList,
} from "lucide-react";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { SkeletonPage } from "../../client/components/Skeletons";
import { EmptyState } from "../../client/components/EmptyState";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  listContentItems,
} from "wasp/client/operations";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";

export default function MeetingsPage() {
  const { t } = useTranslation("meetings");
  const { t: tc } = useTranslation("common");
  const { t: tcl } = useTranslation("classes");
  const { currentLocale } = useLocale();
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const canManageMeetings = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "PERSONAL_OWNER",
  ].includes(userRole);
  const {
    data: meetings = [],
    isLoading: loading,
    refetch: refetchMeetings,
  } = useQuery(listMeetings, { classId: classId! });
  const { data: contentItems = [] } = useQuery(listContentItems, { take: 100 });
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedContentId, setSelectedContentId] = useState("");

  const handleCreate = async () => {
    if (!title) return;
    try {
      await createMeeting({
        classId: classId!,
        title,
        date,
        contentId: selectedContentId || undefined,
      });
      setTitle("");
      setSelectedContentId("");
      setShowForm(false);
      refetchMeetings();
    } catch (e: any) {
      toast({
        title: t("create_error", { message: e.message || t("no_permission") }),
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting({ id: deleteTarget });
      toast({ title: t("delete_success") });
      refetchMeetings();
    } catch (e: any) {
      toast({
        title: t("delete_error", { message: e.message || tc("try_again") }),
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  };

  const handleLinkContent = async (
    meetingId: string,
    contentId: string | null,
  ) => {
    try {
      await updateMeeting({ id: meetingId, contentId });
    } catch (e: any) {
      toast({
        title: t("update_error", { message: e.message || t("server_error") }),
      });
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        primaryAction={
          canManageMeetings
            ? {
                label: t("new"),
                onClick: () => setShowForm(!showForm),
              }
            : undefined
        }
        secondaryActions={[
          {
            label: tcl("attendance"),
            href: `/app/classes/${classId}/attendance`,
          },
          {
            label: tc("back"),
            href: `/app/classes/${classId}`,
          },
        ]}
      />

      {showForm && (
        <AppPanel className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {t("new")}
            </p>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="meetingTitle">{t("meeting_title")}</Label>
              <Input
                id="meetingTitle"
                className="h-11 min-h-11"
                placeholder={t("meeting_title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Label htmlFor="meetingDate">{t("date")}</Label>
              <Input
                id="meetingDate"
                type="date"
                className="h-11 min-h-11"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Input
                placeholder={t("search_content")}
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                className="h-11 min-h-11"
              />
              <Select
                value={selectedContentId || "none"}
                onValueChange={(v) =>
                  setSelectedContentId(v === "none" ? "" : v)
                }
              >
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue placeholder={t("no_content")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("no_content")}</SelectItem>
                  {contentItems
                    .filter(
                      (c: any) =>
                        !contentSearch ||
                        c.title
                          ?.toLowerCase()
                          .includes(contentSearch.toLowerCase()) ||
                        c.theme
                          ?.toLowerCase()
                          .includes(contentSearch.toLowerCase()),
                    )
                    .slice(0, 20)
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                        {c.theme ? ` — ${c.theme}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-11 min-h-11 w-full rounded-sm sm:w-auto"
              onClick={handleCreate}
              disabled={!title && !selectedContentId}
            >
              {t("create")}
            </Button>
          </div>
        </AppPanel>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t("empty_title")}
          description={t("empty_desc")}
          compact
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m: any) => (
            <article
              key={m.id}
              className="relative space-y-3 rounded-sm border border-border/70 bg-surface-elevated p-4"
            >
              <Link
                to={`/app/meetings/${m.id}`}
                className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={m.title || t("no_title")}
              />
              <div className="relative z-[1] flex items-start justify-between gap-3 pointer-events-none">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold tracking-tight text-brand-ink"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {m.title || t("no_title")}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(m.date, currentLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-overline">
                  {t("attendance_count", {
                    count: m._count?.attendance || 0,
                  })}
                </Badge>
              </div>

              {m.content ? (
                <div className="relative z-[1] flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-2 text-xs pointer-events-auto">
                  <BookOpen className="h-3 w-3 text-brand-ink" />
                  <Link
                    to={`/app/content-library/${m.content.id}`}
                    className="font-medium text-brand-ink underline-offset-2 hover:underline"
                  >
                    {m.content.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleLinkContent(m.id, null)}
                    className="ml-auto min-h-11 px-2 text-overline text-muted-foreground hover:text-destructive"
                  >
                    {t("unlink")}
                  </button>
                </div>
              ) : (
                <div className="relative z-[1] flex items-center gap-2 pointer-events-auto">
                  <Select
                    onValueChange={(v) => {
                      if (v !== "none") handleLinkContent(m.id, v);
                    }}
                    defaultValue="none"
                  >
                    <SelectTrigger className="h-11 min-h-11 min-w-0 flex-1 text-xs sm:min-w-[180px]">
                      <SelectValue placeholder={t("link_content")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("link_content")}</SelectItem>
                      {contentItems.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative z-[1] flex flex-wrap gap-2 border-t border-border/60 pt-3 pointer-events-auto">
                <Button
                  size="sm"
                  className="h-11 min-h-11 flex-1 rounded-sm shadow-none sm:flex-none"
                  asChild
                >
                  <Link
                    to={`/app/classes/${classId}/attendance?meetingId=${m.id}`}
                  >
                    <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                    {tcl("attendance")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 min-h-11 rounded-sm"
                  onClick={() =>
                    navigate(
                      `/app/ai-hub?mode=generate-activity&meetingId=${
                        m.id
                      }&meetingTitle=${encodeURIComponent(m.title || "")}${
                        m.content
                          ? `&contentId=${
                              m.content.id
                            }&contentTitle=${encodeURIComponent(
                              m.content.title || "",
                            )}&contentTheme=${encodeURIComponent(
                              m.content.theme || "",
                            )}`
                          : ""
                      }`,
                    )
                  }
                >
                  <Feather className="mr-1 h-3 w-3" />
                  {t("generate_ai_activity")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-11 min-h-11 text-xs"
                  onClick={() =>
                    navigate(
                      `/app/ai-hub?mode=generate-whatsapp&meetingId=${
                        m.id
                      }&meetingTitle=${encodeURIComponent(m.title || "")}${
                        m.content
                          ? `&contentId=${
                              m.content.id
                            }&contentTitle=${encodeURIComponent(
                              m.content.title || "",
                            )}&contentTheme=${encodeURIComponent(
                              m.content.theme || "",
                            )}`
                          : ""
                      }`,
                    )
                  }
                >
                  <MessageCircle className="mr-1 h-3 w-3" />
                  {t("generate_whatsapp")}
                </Button>
                {canManageMeetings && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 min-h-11 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(m.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {tc("delete")}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title={t("delete_confirm_title")}
        description={t("delete_confirm_desc")}
      />
    </div>
  );
}
