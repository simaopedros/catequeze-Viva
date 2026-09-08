import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import { AppPanel } from "../../client/components/brand/AppChrome";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  createFormationModule,
  updateFormationModule,
  deleteFormationModule,
  createFormationLesson,
  updateFormationLesson,
  deleteFormationLesson,
  markFormationLessonComplete,
} from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";

type Lesson = {
  id: string;
  title: string;
  body?: string | null;
  durationMinutes?: number | null;
  videoUrl?: string | null;
  resourceUrl?: string | null;
  order: number;
  completed?: boolean;
};

type Module = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
};

type Props = {
  trackId: string;
  workspaceId?: string | null;
  modules: Module[];
  canManage: boolean;
  enrolled: boolean;
  onChanged?: () => void | Promise<unknown>;
};

const emptyLesson = {
  title: "",
  body: "",
  durationMinutes: "",
  videoUrl: "",
  resourceUrl: "",
};

export function FormationCurriculum({
  trackId,
  workspaceId,
  modules,
  canManage,
  enrolled,
  onChanged,
}: Props) {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [openModuleIds, setOpenModuleIds] = useState<Record<string, boolean>>(
    {},
  );
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: "module" | "lesson";
    id: string;
  } | null>(null);

  const lessonTotal = modules.reduce(
    (sum, mod) => sum + (mod.lessons?.length || 0),
    0,
  );
  const lessonDone = modules.reduce(
    (sum, mod) => sum + (mod.lessons || []).filter((l) => l.completed).length,
    0,
  );

  const resetModuleForm = () => {
    setShowModuleForm(false);
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDesc("");
  };

  const resetLessonForm = () => {
    setLessonModuleId(null);
    setEditingLessonId(null);
    setLessonForm(emptyLesson);
  };

  const startEditModule = (mod: Module) => {
    setEditingModuleId(mod.id);
    setShowModuleForm(true);
    setModuleTitle(mod.title);
    setModuleDesc(mod.description || "");
  };

  const startAddLesson = (moduleId: string) => {
    setLessonModuleId(moduleId);
    setEditingLessonId(null);
    setLessonForm(emptyLesson);
    setOpenModuleIds((prev) => ({ ...prev, [moduleId]: true }));
  };

  const startEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonModuleId(moduleId);
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title || "",
      body: lesson.body || "",
      durationMinutes: lesson.durationMinutes
        ? String(lesson.durationMinutes)
        : "",
      videoUrl: lesson.videoUrl || "",
      resourceUrl: lesson.resourceUrl || "",
    });
    setOpenModuleIds((prev) => ({ ...prev, [moduleId]: true }));
  };

  const handleSaveModule = async () => {
    if (!moduleTitle.trim()) return;
    try {
      if (editingModuleId) {
        await updateFormationModule({
          id: editingModuleId,
          workspaceId,
          title: moduleTitle.trim(),
          description: moduleDesc.trim() || null,
        });
        toast({ title: t("formation.module_updated") });
      } else {
        await createFormationModule({
          trackId,
          workspaceId,
          title: moduleTitle.trim(),
          description: moduleDesc.trim() || undefined,
        });
        toast({ title: t("formation.module_created") });
      }
      resetModuleForm();
      await onChanged?.();
    } catch (e: any) {
      toast({
        title: t("formation.module_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonModuleId || !lessonForm.title.trim()) return;
    const payload = {
      title: lessonForm.title.trim(),
      body: lessonForm.body.trim() || undefined,
      durationMinutes: lessonForm.durationMinutes
        ? Number(lessonForm.durationMinutes)
        : undefined,
      videoUrl: lessonForm.videoUrl.trim() || undefined,
      resourceUrl: lessonForm.resourceUrl.trim() || undefined,
    };
    try {
      if (editingLessonId) {
        await updateFormationLesson({
          id: editingLessonId,
          workspaceId,
          ...payload,
          body: payload.body ?? null,
          durationMinutes: payload.durationMinutes ?? null,
          videoUrl: payload.videoUrl ?? null,
          resourceUrl: payload.resourceUrl ?? null,
        });
        toast({ title: t("formation.lesson_updated") });
      } else {
        await createFormationLesson({
          moduleId: lessonModuleId,
          workspaceId,
          ...payload,
        });
        toast({ title: t("formation.lesson_created") });
      }
      resetLessonForm();
      await onChanged?.();
    } catch (e: any) {
      toast({
        title: t("formation.lesson_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === "module") {
        await deleteFormationModule({
          id: pendingDelete.id,
          workspaceId,
        });
        toast({ title: t("formation.module_deleted") });
      } else {
        await deleteFormationLesson({
          id: pendingDelete.id,
          workspaceId,
        });
        toast({ title: t("formation.lesson_deleted") });
      }
      await onChanged?.();
    } catch (e: any) {
      toast({
        title: t("formation.delete_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setPendingDelete(null);
  };

  const toggleComplete = async (lesson: Lesson) => {
    try {
      await markFormationLessonComplete({
        lessonId: lesson.id,
        workspaceId,
        completed: !lesson.completed,
      });
      await onChanged?.();
    } catch (e: any) {
      toast({
        title: t("formation.lesson_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AppPanel className="space-y-4" data-testid="formation-curriculum">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("formation.curriculum_title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("formation.curriculum_hint")}
          </p>
          {lessonTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("formation.progress", {
                done: lessonDone,
                total: lessonTotal,
              })}
            </p>
          )}
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              resetModuleForm();
              setShowModuleForm(true);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("formation.add_module")}
          </Button>
        )}
      </div>

      {showModuleForm && canManage && (
        <div className="grid gap-2 rounded-sm border border-border/60 p-3">
          <Input
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder={t("formation.module_title_placeholder")}
            aria-label={t("formation.module_title")}
          />
          <Textarea
            value={moduleDesc}
            onChange={(e) => setModuleDesc(e.target.value)}
            placeholder={t("formation.module_desc_placeholder")}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveModule}
              disabled={!moduleTitle.trim()}
            >
              {t("formation.save_module")}
            </Button>
            <Button size="sm" variant="outline" onClick={resetModuleForm}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}

      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canManage
            ? t("formation.empty_curriculum")
            : t("formation.empty_curriculum_readonly")}
        </p>
      ) : (
        <ul className="space-y-3">
          {modules.map((mod, index) => {
            const open = openModuleIds[mod.id] ?? index === 0;
            return (
              <li
                key={mod.id}
                className="rounded-sm border border-border/60"
                data-testid="formation-module"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 p-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() =>
                      setOpenModuleIds((prev) => ({
                        ...prev,
                        [mod.id]: !open,
                      }))
                    }
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>
                      <span className="block text-sm font-semibold text-brand-ink">
                        {index + 1}. {mod.title}
                      </span>
                      {mod.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {mod.description}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("formation.lessons_count", {
                          count: mod.lessons?.length || 0,
                        })}
                      </span>
                    </span>
                  </button>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAddLesson(mod.id)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {t("formation.add_lesson")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditModule(mod)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">{tc("edit")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPendingDelete({ type: "module", id: mod.id })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">{tc("delete")}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="space-y-3 border-t border-border/60 p-3">
                    {lessonModuleId === mod.id && canManage && (
                      <div className="grid gap-2 rounded-sm bg-muted/30 p-3">
                        <Input
                          value={lessonForm.title}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          placeholder={t("formation.lesson_title_placeholder")}
                          aria-label={t("formation.lesson_title")}
                        />
                        <Textarea
                          value={lessonForm.body}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              body: e.target.value,
                            }))
                          }
                          placeholder={t("formation.lesson_body_placeholder")}
                          aria-label={t("formation.lesson_body")}
                          rows={6}
                        />
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Input
                            type="number"
                            min={1}
                            value={lessonForm.durationMinutes}
                            onChange={(e) =>
                              setLessonForm((f) => ({
                                ...f,
                                durationMinutes: e.target.value,
                              }))
                            }
                            placeholder={t("formation.lesson_duration")}
                            aria-label={t("formation.lesson_duration")}
                          />
                          <Input
                            value={lessonForm.videoUrl}
                            onChange={(e) =>
                              setLessonForm((f) => ({
                                ...f,
                                videoUrl: e.target.value,
                              }))
                            }
                            placeholder={t("formation.lesson_video")}
                            aria-label={t("formation.lesson_video")}
                          />
                          <Input
                            value={lessonForm.resourceUrl}
                            onChange={(e) =>
                              setLessonForm((f) => ({
                                ...f,
                                resourceUrl: e.target.value,
                              }))
                            }
                            placeholder={t("formation.lesson_resource")}
                            aria-label={t("formation.lesson_resource")}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveLesson}
                            disabled={!lessonForm.title.trim()}
                          >
                            {t("formation.save_lesson")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={resetLessonForm}
                          >
                            {tc("cancel")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(mod.lessons || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("formation.empty_lessons")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {mod.lessons.map((lesson, lessonIndex) => {
                          const lessonOpen = openLessonId === lesson.id;
                          return (
                            <li
                              key={lesson.id}
                              className="rounded-sm border border-border/50 bg-white"
                              data-testid="formation-lesson"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  onClick={() =>
                                    setOpenLessonId(
                                      lessonOpen ? null : lesson.id,
                                    )
                                  }
                                >
                                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {lessonIndex + 1}. {lesson.title}
                                  </span>
                                  {lesson.durationMinutes ? (
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.durationMinutes} min
                                    </span>
                                  ) : null}
                                  {lesson.completed && (
                                    <Badge variant="success" size="sm">
                                      {t("formation.completed")}
                                    </Badge>
                                  )}
                                </button>
                                <div className="flex flex-wrap gap-1">
                                  {enrolled && (
                                    <Button
                                      size="sm"
                                      variant={
                                        lesson.completed ? "outline" : "ghost"
                                      }
                                      onClick={() => toggleComplete(lesson)}
                                    >
                                      <Check className="mr-1 h-3.5 w-3.5" />
                                      {lesson.completed
                                        ? t("formation.reopen_lesson")
                                        : t("formation.mark_complete")}
                                    </Button>
                                  )}
                                  {canManage && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        startEditLesson(mod.id, lesson)
                                      }
                                    >
                                      {tc("edit")}
                                    </Button>
                                  )}
                                  {canManage && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setPendingDelete({
                                          type: "lesson",
                                          id: lesson.id,
                                        })
                                      }
                                    >
                                      {tc("delete")}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {lessonOpen && (
                                <div className="space-y-3 border-t border-border/50 p-3 text-sm">
                                  {lesson.body ? (
                                    <p className="whitespace-pre-wrap text-brand-ink/80">
                                      {lesson.body}
                                    </p>
                                  ) : (
                                    <p className="text-muted-foreground">
                                      {t("formation.lesson_body_placeholder")}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-3 text-xs">
                                    {lesson.videoUrl && (
                                      <a
                                        href={lesson.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-brand-ink underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {t("formation.lesson_video")}
                                      </a>
                                    )}
                                    {lesson.resourceUrl && (
                                      <a
                                        href={lesson.resourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-brand-ink underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {t("formation.lesson_resource")}
                                      </a>
                                    )}
                                  </div>
                                  {!enrolled && !canManage && (
                                    <p className="text-xs text-muted-foreground">
                                      {t("formation.enroll_to_progress")}
                                    </p>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={
          pendingDelete?.type === "module"
            ? t("formation.delete_module_title")
            : t("formation.delete_lesson_title")
        }
        description={
          pendingDelete?.type === "module"
            ? t("formation.delete_module_confirm")
            : t("formation.delete_lesson_confirm")
        }
        confirmLabel={tc("delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </AppPanel>
  );
}
