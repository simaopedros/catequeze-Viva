import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router";
import { useState } from "react";
import { AppShell } from "../AppShell";
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

  if (loading)
    return (
      <AppShell>
        <div className="p-6">
          <SkeletonPage />
        </div>
      </AppShell>
    );

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="h-10 rounded-sm">
              <Link to={`/app/classes/${classId}`}>{tc("back")}</Link>
            </Button>
            {canManageMeetings && (
              <Button
                className="h-10 rounded-sm shadow-none"
                onClick={() => setShowForm(!showForm)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("new")}
              </Button>
            )}
          </div>
        }
      />

      {showForm && (
        <AppPanel className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("new")}
            </p>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="meetingTitle">{t("meeting_title")}</Label>
              <Input
                id="meetingTitle"
                placeholder={t("meeting_title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meetingDate">{t("date")}</Label>
              <Input
                id="meetingDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={t("search_content")}
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                className="h-9"
              />
              <Select
                value={selectedContentId || "none"}
                onValueChange={(v) =>
                  setSelectedContentId(v === "none" ? "" : v)
                }
              >
                <SelectTrigger className="h-9">
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
              className="h-10 rounded-sm"
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
            <div
              key={m.id}
              className="rounded-sm border border-border/70 bg-white p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {m.title || t("no_title")}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(m.date, currentLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-overline">
                    {t("attendance_count", {
                      count: m._count?.attendance || 0,
                    })}
                  </Badge>
                  <Link
                    to={`/app/classes/${classId}/attendance`}
                    className="text-xs font-medium text-[#071A2D] underline-offset-2 hover:underline"
                  >
                    {tcl("attendance")}
                  </Link>
                </div>
              </div>

              {m.content ? (
                <div className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-2 text-xs">
                  <BookOpen className="h-3 w-3 text-[#071A2D]" />
                  <Link
                    to={`/app/content-library/${m.content.id}`}
                    className="font-medium text-[#071A2D] underline-offset-2 hover:underline"
                  >
                    {m.content.title}
                  </Link>
                  <button
                    onClick={() => handleLinkContent(m.id, null)}
                    className="ml-auto text-muted-foreground hover:text-destructive text-overline"
                  >
                    {t("unlink")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(v) => {
                      if (v !== "none") handleLinkContent(m.id, v);
                    }}
                    defaultValue="none"
                  >
                    <SelectTrigger className="h-8 text-xs min-w-[180px]">
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

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
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
                  className="text-xs h-7"
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
                    className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(m.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {tc("delete")}
                  </Button>
                )}
              </div>
            </div>
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
