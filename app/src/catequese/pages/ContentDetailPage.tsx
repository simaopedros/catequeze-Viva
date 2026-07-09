import { useParams, Link, useSearchParams } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { EmptyState } from "../../client/components/EmptyState";
import {
  ArrowLeft,
  Clock,
  Tag,
  Send,
  CheckCircle,
  Archive,
  Eye,
  Plus,
  Puzzle,
  Edit3,
  Calendar,
  FileText,
  Trash2,
  Feather,
  Printer,
  MessageCircle,
} from "lucide-react";
import {
  useQuery,
  getContentItem,
  listActivitiesByContent,
  updateContentStatus,
  createActivity,
  updateActivity,
  deleteActivity,
} from "wasp/client/operations";
import { ActivityForm, type ActivityType } from "../components/ActivityForm";
import { useContentStatusMap, useActivityTypes } from "../../i18n/useLabels";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import {
  parseContentDocument,
  buildLegacyContentDocument,
} from "../../shared/contentDocument";
import { ContentDocumentRenderer } from "../components/content/ContentDocumentRenderer";
import { AppPageHeader } from "../../client/components/brand/AppChrome";

function parseData(data: string | null): any {
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function activityPreview(type: string, data: any, t: any): string {
  switch (type) {
    case "QUIZ":
      return t("preview.quiz_questions", {
        count: data?.questions?.length || 0,
      });
    case "OPEN_QUESTION":
      return data?.question
        ? t("preview.open_question")
        : t("preview.no_question");
    case "PARTICIPATION_CHECKLIST":
      return t("preview.checklist_items", { count: data?.items?.length || 0 });
    case "GUIDED_REFLECTION":
      return t("preview.reflection_prompts", {
        count: data?.prompts?.length || 0,
      });
    case "GROUP_DYNAMIC":
      return t("preview.dynamic_steps", { count: data?.steps?.length || 0 });
    case "FAMILY_ACTIVITY":
      return data?.task
        ? t("preview.family_described")
        : t("preview.no_description");
    case "BIBLE_READING":
      return data?.reference || t("preview.bible_reading");
    case "MATCHING":
      return t("preview.matching_pairs", { count: data?.pairs?.length || 0 });
    case "TASK_WITH_ATTACHMENT":
      return data?.requiresUpload
        ? t("preview.requires_upload")
        : t("preview.no_upload");
    case "RITE_CELEBRATION":
      return data?.rite
        ? t("preview.rite_described")
        : t("preview.no_description");
    default:
      return "";
  }
}

export default function ContentDetailPage() {
  const { t } = useTranslation("content");
  const { t: ta } = useTranslation("activities");
  const { t: tai } = useTranslation("ai");
  const { t: tc } = useTranslation("common");
  const STATUS_MAP = useContentStatusMap();
  const activityTypes = useActivityTypes();
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: item, isLoading: loading } = useQuery(getContentItem, {
    id: id!,
  });
  const { data: activities = [] } = useQuery(listActivitiesByContent, {
    contentId: id!,
  });
  const initialTab =
    searchParams.get("tab") === "activities" ? "activities" : "meeting";
  const [tab, setTab] = useState<"meeting" | "activities">(initialTab);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const changeStatus = async (status: string) => {
    await updateContentStatus({ id: id!, status });
  };

  const handleCreate = async (formData: {
    title: string;
    type: ActivityType;
    description: string;
    points: number;
    data: any;
  }) => {
    await createActivity({
      contentId: id!,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      data: formData.data,
      points: formData.points,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleUpdate = async (formData: {
    title: string;
    type: ActivityType;
    description: string;
    points: number;
    data: any;
  }) => {
    if (!editingId) return;
    await updateActivity({
      id: editingId,
      title: formData.title,
      description: formData.description,
      data: formData.data,
      points: formData.points,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm(t("detail.confirm_remove_activity"))) return;
    await deleteActivity({ id: activityId });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-48 rounded-sm bg-muted" />
      </div>
    );
  }
  if (!item) {
    return (
      <div className="p-6 text-center text-destructive">{t("not_found")}</div>
    );
  }

  const editingActivity = editingId
    ? activities.find((activity: any) => activity.id === editingId)
    : null;
  const handleTabChange = (nextTab: "meeting" | "activities") => {
    setTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextTab === "activities") next.set("tab", "activities");
      else next.delete("tab");
      return next;
    });
  };

  const document =
    parseContentDocument(item.documentJson) || buildLegacyContentDocument(item);

  const subtitleParts = [
    STATUS_MAP[item.status as keyof typeof STATUS_MAP]?.label,
    item.estimatedTime
      ? t("library.minutes", { count: item.estimatedTime })
      : null,
    item.createdBy
      ? t("detail.by_author", { name: item.createdBy.firstName })
      : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 shrink-0 rounded-sm"
          asChild
        >
          <Link to="/app/content-library">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <AppPageHeader
          className="min-w-0 flex-1 border-0 pb-0"
          eyebrow={t("script")}
          title={item.title}
          subtitle={subtitleParts.join(" · ")}
          actions={
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-sm"
                asChild
              >
                <Link to={`/app/content-library/${id}/edit`}>
                  <Edit3 className="mr-1 h-3 w-3" />
                  {tc("edit")}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-sm"
                asChild
              >
                <Link to={`/app/content-library/${id}/print`}>
                  <Printer className="mr-1 h-3 w-3" />
                  {t("print")}
                </Link>
              </Button>
            </>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {item.status === "DRAFT" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeStatus("IN_REVIEW")}
          >
            <Send className="mr-1 h-3 w-3" />
            {t("submit_review")}
          </Button>
        )}
        {item.status === "IN_REVIEW" && (
          <>
            <Button size="sm" onClick={() => changeStatus("APPROVED")}>
              <CheckCircle className="mr-1 h-3 w-3" />
              {t("approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => changeStatus("DRAFT")}
            >
              {t("back_to_draft")}
            </Button>
          </>
        )}
        {item.status === "APPROVED" && (
          <Button size="sm" onClick={() => changeStatus("PUBLISHED")}>
            <Eye className="mr-1 h-3 w-3" />
            {t("publish")}
          </Button>
        )}
        {item.status === "PUBLISHED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeStatus("ARCHIVED")}
          >
            <Archive className="mr-1 h-3 w-3" />
            {t("archive")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          asChild
          className="gap-1 border-dashed"
        >
          <Link
            to={`/app/ai-hub?mode=generate-whatsapp&contentId=${id}&contentTitle=${encodeURIComponent(
              item.title || "",
            )}&contentTheme=${encodeURIComponent(item.theme || "")}`}
          >
            <MessageCircle className="h-3 w-3" />
            {tai("hub.existing_whatsapp")}
          </Link>
        </Button>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => handleTabChange("meeting")}
          className={`relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "meeting"
              ? "border-[#D39A2B] text-[#071A2D]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> {t("script")}
        </button>
        <button
          onClick={() => handleTabChange("activities")}
          className={`relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "activities"
              ? "border-[#D39A2B] text-[#071A2D]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Puzzle className="h-4 w-4" /> {t("activities_tab")} (
          {activities.length})
        </button>
      </div>

      {tab === "meeting" && (
        <div className="space-y-5">
          {item.theme && (
            <div className="rounded-sm border border-border/70 bg-white p-4">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("theme")}
              </h3>
              <p
                className="text-sm font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {item.theme}
              </p>
            </div>
          )}
          <div className="rounded-sm border border-border/70 bg-white p-4 sm:p-8">
            <ContentDocumentRenderer document={document} />
          </div>
          {item.tags && (
            <div className="flex flex-wrap gap-1">
              {item.tags.split(",").map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-semibold tracking-tight text-[#071A2D]"
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
          {item.meetings?.length > 0 && (
            <div className="rounded-sm border border-border/70 bg-white p-4">
              <div className="mb-2 space-y-1.5">
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("used_in_meetings", { count: item.meetings.length })}
                </h3>
                <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
              </div>
              <div className="space-y-1">
                {item.meetings.map((meeting: any) => (
                  <Link
                    key={meeting.id}
                    to={`/app/classes/${meeting.classId}/attendance`}
                    className="flex justify-between py-1 text-sm font-medium tracking-tight text-[#071A2D] hover:text-[#0a2540]"
                  >
                    <span
                      style={{ fontFamily: "var(--font-brand-display)" }}
                      className="font-semibold"
                    >
                      {meeting.title || t("meeting_default")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(meeting.date, currentLocale)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "activities" && (
        <div className="space-y-4">
          {showForm || editingId ? (
            <ActivityForm
              initialType={(editingActivity?.type as ActivityType) || "QUIZ"}
              initialTitle={editingActivity?.title || ""}
              initialDescription={editingActivity?.description || ""}
              initialPoints={editingActivity?.points || 10}
              initialData={
                editingActivity ? parseData(editingActivity.data) : undefined
              }
              onSubmit={editingId ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              submitLabel={
                editingId
                  ? t("detail.update_activity")
                  : t("detail.create_activity")
              }
            />
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" /> {t("detail.new_activity")}
              </Button>
              <Button
                variant="outline"
                asChild
                className="gap-2 rounded-sm border-dashed border-border/70 text-foreground hover:bg-muted/20"
              >
                <Link
                  to={`/app/ai-hub?mode=generate-activity&contentId=${id}&contentTitle=${encodeURIComponent(
                    item.title || "",
                  )}&contentTheme=${encodeURIComponent(item.theme || "")}`}
                >
                  <Feather className="h-4 w-4" />
                  {t("detail.open_copilot")
                    ? t("detail.open_copilot")
                    : t("detail.generate_ai")}
                </Link>
              </Button>
            </div>
          )}

          {activities.length === 0 && !showForm ? (
            <EmptyState
              icon={Puzzle}
              title={t("detail.no_activities")}
              description={t("detail.no_activities_desc")}
            >
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("detail.create_activity")}
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {activities.map((activity: any) => {
                const data = parseData(activity.data);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-sm border border-border/70 bg-white p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold tracking-tight text-[#071A2D]"
                          style={{ fontFamily: "var(--font-brand-display)" }}
                        >
                          {activity.title}
                        </p>
                        <Badge variant="outline" className="text-overline">
                          {activityTypes.find(
                            (type) => type.value === activity.type,
                          )?.label || activity.type}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      <p className="mt-1 text-caption text-muted-foreground">
                        {activityPreview(activity.type, data, ta)}
                        {activity.points > 0 &&
                          ` · ${t("detail.points", {
                            count: activity.points,
                          })}`}
                        {activity.submissions?.length > 0 &&
                          ` · ${t("detail.responses", {
                            count: activity.submissions.length,
                          })}`}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(activity.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(activity.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
