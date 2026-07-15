import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router";
import {
  addBibleRef,
  addCatechismRef,
  addDirectoryRef,
  createContentItem,
  deleteContentItem,
  getContentItem,
  removeBibleRef,
  removeCatechismRef,
  removeDirectoryRef,
  updateContentItem,
} from "wasp/client/operations";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../client/components/ui/sheet";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { ReferencePicker } from "../../../client/components/ReferencePicker";
import { toast } from "../../../client/hooks/use-toast";
import { cn } from "../../../client/utils";
import {
  CONTENT_DOCUMENT_VERSION,
  buildLegacyContentDocument,
  createEmptyContentDocument,
  createMeetingSkeletonDocument,
  isUnmodifiedMeetingSkeleton,
  parseContentDocument,
} from "../../../shared/contentDocument";
import { uploadContentImage } from "../../../client/utils/contentImageUpload";
import { ContentDocumentRenderer } from "./ContentDocumentRenderer";

/** TipTap editor is heavy — load only when the content workspace mounts. */
const RichContentEditor = lazy(() =>
  import("./RichContentEditor").then((m) => ({ default: m.RichContentEditor })),
);

import {
  BookMarked,
  Clock3,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareShare,
  MoreHorizontal,
  Save,
  ArrowLeft,
  Tags,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";

const DEFAULT_TITLE = "Novo encontro";
const DEFAULT_TIME = "60";

function SelectedChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-white px-2.5 py-1 text-xs font-semibold tracking-tight text-[#071A2D]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        ×
      </button>
    </span>
  );
}

function formatSavedAt(date: Date | null) {
  if (!date) return null;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReferencesSidebar({
  contentId,
  ensurePersisted,
  bibleRefs,
  catechismRefs,
  directoryRefs,
  setBibleRefs,
  setCatechismRefs,
  setDirectoryRefs,
}: {
  contentId: string | null;
  ensurePersisted: () => Promise<string | null>;
  bibleRefs: any[];
  catechismRefs: any[];
  directoryRefs: any[];
  setBibleRefs: React.Dispatch<React.SetStateAction<any[]>>;
  setCatechismRefs: React.Dispatch<React.SetStateAction<any[]>>;
  setDirectoryRefs: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const total =
    bibleRefs.length + catechismRefs.length + directoryRefs.length;

  const onError = (message: string) =>
    toast({ title: "Erro", description: message, variant: "destructive" });

  const handleRemoveBible = async (id?: string, verseId?: string) => {
    try {
      if (id) await removeBibleRef({ id });
      setBibleRefs((prev) =>
        prev.filter((ref) => (ref.id || ref.verseId) !== (id || verseId)),
      );
    } catch (error: any) {
      onError(error.message);
    }
  };

  const handleRemoveCatechism = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeCatechismRef({ id });
      setCatechismRefs((prev) =>
        prev.filter((ref) => (ref.id || ref.entryId) !== (id || entryId)),
      );
    } catch (error: any) {
      onError(error.message);
    }
  };

  const handleRemoveDirectory = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeDirectoryRef({ id });
      setDirectoryRefs((prev) =>
        prev.filter((ref) => (ref.id || ref.entryId) !== (id || entryId)),
      );
    } catch (error: any) {
      onError(error.message);
    }
  };

  const openPicker = async () => {
    const id = await ensurePersisted();
    if (!id) {
      toast({
        title: "Salve o rascunho",
        description: "Edite o título ou o roteiro antes de anexar referências.",
      });
      return;
    }
    setPickerOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border border-border/70 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-[#071A2D]" />
              <h3
                className="text-base font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                Referências pastorais
              </h3>
            </div>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            <p className="text-sm leading-6 text-muted-foreground">
              Anexe Bíblia, Catecismo e Diretório sem sair do editor. Também
              pode selecionar um trecho no texto.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-sm border border-border/70 bg-muted/30 px-2.5 py-0.5 text-xs font-semibold tracking-tight text-[#071A2D]"
          >
            {total}
          </Badge>
        </div>

        {total === 0 ? (
          <div className="mb-4 rounded-sm border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
            <FileText className="mx-auto mb-2 h-6 w-6 text-[#071A2D]/50" />
            <p className="text-sm font-medium tracking-tight text-[#071A2D]">
              Nenhuma referência ainda
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Selecione texto no encontro ou use o seletor para anexar
              passagens.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>Bíblia</span>
                <span>{bibleRefs.length}</span>
              </div>
              <div className="flex min-h-8 flex-wrap gap-2">
                {bibleRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma passagem selecionada.
                  </span>
                ) : (
                  bibleRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.verseId}
                      label={ref.label}
                      onRemove={() => handleRemoveBible(ref.id, ref.verseId)}
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>Catecismo</span>
                <span>{catechismRefs.length}</span>
              </div>
              <div className="flex min-h-8 flex-wrap gap-2">
                {catechismRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma referência selecionada.
                  </span>
                ) : (
                  catechismRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.entryId}
                      label={ref.label}
                      onRemove={() =>
                        handleRemoveCatechism(ref.id, ref.entryId)
                      }
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>Diretório</span>
                <span>{directoryRefs.length}</span>
              </div>
              <div className="flex min-h-8 flex-wrap gap-2">
                {directoryRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma referência selecionada.
                  </span>
                ) : (
                  directoryRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.entryId}
                      label={ref.label}
                      onRemove={() =>
                        handleRemoveDirectory(ref.id, ref.entryId)
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="mt-5 h-10 w-full rounded-sm border-border/60 bg-background/80"
          onClick={() => void openPicker()}
        >
          Selecionar referências
        </Button>
      </Card>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Selecionar referências</SheetTitle>
            <SheetDescription>
              Busque e anexe Bíblia, Catecismo ou Diretório a este encontro.
            </SheetDescription>
          </SheetHeader>
          {contentId ? (
            <ReferencePicker
              bibleRefs={bibleRefs}
              catechismRefs={catechismRefs}
              directoryRefs={directoryRefs}
              onAddBible={async (verseId, label, text) => {
                try {
                  const result = await addBibleRef({ contentId, verseId });
                  setBibleRefs((prev) => {
                    if (
                      prev.some(
                        (ref) =>
                          ref.id === result.id || ref.verseId === verseId,
                      )
                    ) {
                      return prev;
                    }
                    return [
                      ...prev,
                      { id: result.id, verseId, label, text },
                    ];
                  });
                } catch (error: any) {
                  onError(error.message);
                }
              }}
              onRemoveBible={async (id) => handleRemoveBible(id)}
              onAddCatechism={async (entryId, label, question) => {
                try {
                  const result = await addCatechismRef({ contentId, entryId });
                  setCatechismRefs((prev) => {
                    if (
                      prev.some(
                        (ref) =>
                          ref.id === result.id || ref.entryId === entryId,
                      )
                    ) {
                      return prev;
                    }
                    return [
                      ...prev,
                      { id: result.id, entryId, label, question },
                    ];
                  });
                } catch (error: any) {
                  onError(error.message);
                }
              }}
              onRemoveCatechism={async (id) => handleRemoveCatechism(id)}
              onAddDirectory={async (entryId, label, content) => {
                try {
                  const result = await addDirectoryRef({ contentId, entryId });
                  setDirectoryRefs((prev) => {
                    if (
                      prev.some(
                        (ref) =>
                          ref.id === result.id || ref.entryId === entryId,
                      )
                    ) {
                      return prev;
                    }
                    return [
                      ...prev,
                      { id: result.id, entryId, label, content },
                    ];
                  });
                } catch (error: any) {
                  onError(error.message);
                }
              }}
              onRemoveDirectory={async (id) => handleRemoveDirectory(id)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ContentDocumentWorkspace({
  existingContentId,
}: {
  existingContentId?: string;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!existingContentId);
  const [contentId, setContentId] = useState<string | null>(
    existingContentId || null,
  );
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [theme, setTheme] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(DEFAULT_TIME);
  const [tags, setTags] = useState("");
  const [documentJson, setDocumentJson] = useState(() =>
    JSON.stringify(createMeetingSkeletonDocument()),
  );
  const [saveState, setSaveState] = useState<
    "clean" | "dirty" | "saving" | "saved" | "error"
  >("clean");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [bibleRefs, setBibleRefs] = useState<any[]>([]);
  const [catechismRefs, setCatechismRefs] = useState<any[]>([]);
  const [directoryRefs, setDirectoryRefs] = useState<any[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const baselineRef = useRef("");
  const readyRef = useRef(!existingContentId);
  const creatingRef = useRef(false);
  const contentIdRef = useRef<string | null>(existingContentId || null);

  useEffect(() => {
    contentIdRef.current = contentId;
  }, [contentId]);

  const snapshot = useMemo(
    () => JSON.stringify({ title, theme, estimatedTime, tags, documentJson }),
    [title, theme, estimatedTime, tags, documentJson],
  );

  const isMeaningfullyEdited = useCallback(() => {
    if (title.trim() !== DEFAULT_TITLE) return true;
    if (
      theme.trim().length > 0 ||
      tags.trim().length > 0 ||
      estimatedTime !== DEFAULT_TIME
    ) {
      return true;
    }
    const doc = parseContentDocument(documentJson);
    if (!doc) return false;
    if (isUnmodifiedMeetingSkeleton(doc)) return false;
    if (
      JSON.stringify(doc) === JSON.stringify(createEmptyContentDocument())
    ) {
      return false;
    }
    return true;
  }, [title, theme, tags, estimatedTime, documentJson]);

  const loadItemIntoState = (item: any) => {
    setContentId(item.id);
    contentIdRef.current = item.id;
    setTitle(item.title || DEFAULT_TITLE);
    setTheme(item.theme || "");
    setEstimatedTime(String(item.estimatedTime || 60));
    setTags(item.tags || "");
    setDocumentJson(
      item.documentJson || JSON.stringify(buildLegacyContentDocument(item)),
    );
    setBibleRefs(
      (item.bibleRefs || []).map((ref: any) => ({
        id: ref.id,
        verseId: ref.verseId,
        label: `${
          ref.verse?.chapter?.book?.abbreviation ||
          ref.verse?.chapter?.book?.name ||
          ""
        } ${ref.verse?.chapter?.number}:${ref.verse?.number}`,
        text: ref.verse?.text,
      })),
    );
    setCatechismRefs(
      (item.catechismRefs || []).map((ref: any) => ({
        id: ref.id,
        entryId: ref.entryId,
        label: `CIC ${ref.entry?.number}`,
        question: ref.entry?.question,
        answer: ref.entry?.answer,
      })),
    );
    setDirectoryRefs(
      (item.directoryRefs || []).map((ref: any) => ({
        id: ref.id,
        entryId: ref.entryId,
        label: `DC ${ref.entry?.number}`,
        content: ref.entry?.content,
      })),
    );
  };

  useEffect(() => {
    if (!existingContentId) {
      const initial = JSON.stringify({
        title: DEFAULT_TITLE,
        theme: "",
        estimatedTime: DEFAULT_TIME,
        tags: "",
        documentJson: JSON.stringify(createMeetingSkeletonDocument()),
      });
      baselineRef.current = initial;
      readyRef.current = true;
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const item = await getContentItem({ id: existingContentId! });
        if (cancelled) return;
        loadItemIntoState(item);
        readyRef.current = true;
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error?.message || "Não foi possível abrir o editor.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [existingContentId]);

  useEffect(() => {
    if (!readyRef.current || loading) return;
    if (!baselineRef.current) {
      baselineRef.current = snapshot;
    }
  }, [loading, snapshot]);

  useEffect(() => {
    if (!readyRef.current || loading) return;
    if (snapshot === baselineRef.current) {
      if (saveState !== "saving") setSaveState(contentId ? "saved" : "clean");
      return;
    }
    setSaveState("dirty");
  }, [snapshot, loading, contentId]);

  const ensurePersisted = useCallback(async (): Promise<string | null> => {
    if (contentIdRef.current) return contentIdRef.current;
    if (creatingRef.current) {
      // Wait briefly for in-flight create
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 50));
        if (contentIdRef.current) return contentIdRef.current;
      }
      return null;
    }

    if (!isMeaningfullyEdited()) return null;

    creatingRef.current = true;
    setSaveState("saving");
    try {
      const item = await createContentItem({
        title: title.trim() || DEFAULT_TITLE,
        theme: theme.trim() || "",
        mainContent: "",
        estimatedTime: Number(estimatedTime) || 60,
        tags: tags.trim() || "",
        documentJson,
      });
      contentIdRef.current = item.id;
      setContentId(item.id);
      baselineRef.current = snapshot;
      setLastSavedAt(new Date());
      setSaveState("saved");
      navigate(`/app/content-library/${item.id}/edit`, { replace: true });
      return item.id;
    } catch (error: any) {
      setSaveState("error");
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      creatingRef.current = false;
    }
  }, [
    title,
    theme,
    estimatedTime,
    tags,
    documentJson,
    snapshot,
    navigate,
    isMeaningfullyEdited,
  ]);

  const saveNow = useCallback(async () => {
    if (!isMeaningfullyEdited() && !contentIdRef.current) {
      toast({
        title: "Nada para salvar",
        description: "Edite o título ou o roteiro do encontro.",
      });
      return;
    }

    setSaveState("saving");
    try {
      let id = contentIdRef.current;
      if (!id) {
        id = await ensurePersisted();
        if (!id) return;
        return; // ensurePersisted already saved create payload
      }

      await updateContentItem({
        id,
        title: title.trim() || DEFAULT_TITLE,
        theme: theme.trim() || null,
        estimatedTime: Number(estimatedTime) || 60,
        tags: tags.trim() || null,
        documentJson,
        documentVersion: CONTENT_DOCUMENT_VERSION,
      } as any);
      baselineRef.current = snapshot;
      setLastSavedAt(new Date());
      setSaveState("saved");
    } catch (error: any) {
      setSaveState("error");
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [
    title,
    theme,
    estimatedTime,
    tags,
    documentJson,
    snapshot,
    ensurePersisted,
    isMeaningfullyEdited,
  ]);

  // Autosave when dirty
  useEffect(() => {
    if (!readyRef.current || loading) return;
    if (snapshot === baselineRef.current) return;
    if (!isMeaningfullyEdited() && !contentIdRef.current) return;

    const timer = setTimeout(() => {
      void saveNow();
    }, 900);
    return () => clearTimeout(timer);
  }, [snapshot, loading, saveNow, isMeaningfullyEdited]);

  // beforeunload when dirty/error
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "error" || saveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  const handleDeleteContent = async () => {
    if (!contentId) return;
    setDeleting(true);
    try {
      await deleteContentItem({ id: contentId });
      toast({
        title: "Encontro excluído",
        description: "O rascunho foi removido.",
      });
      navigate("/app/content-library");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error?.message || "Não foi possível excluir.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const attachBibleReference = async (
    verseId: string,
    label: string,
    text: string,
  ) => {
    const id = await ensurePersisted();
    if (!id) {
      toast({
        title: "Salve o rascunho",
        description: "Edite o encontro antes de vincular referências.",
      });
      throw new Error("Draft not persisted");
    }
    try {
      const result = await addBibleRef({ contentId: id, verseId });
      setBibleRefs((prev) => {
        if (prev.some((ref) => ref.id === result.id || ref.verseId === verseId)) {
          return prev;
        }
        return [...prev, { id: result.id, verseId, label, text }];
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error?.message || "Não foi possível vincular a referência bíblica.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const attachCatechismReference = async (
    entryId: string,
    label: string,
    question: string,
  ) => {
    const id = await ensurePersisted();
    if (!id) {
      toast({
        title: "Salve o rascunho",
        description: "Edite o encontro antes de vincular referências.",
      });
      throw new Error("Draft not persisted");
    }
    try {
      const result = await addCatechismRef({ contentId: id, entryId });
      setCatechismRefs((prev) => {
        if (prev.some((ref) => ref.id === result.id || ref.entryId === entryId)) {
          return prev;
        }
        return [...prev, { id: result.id, entryId, label, question }];
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error?.message ||
          "Não foi possível vincular a referência do Catecismo.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const attachDirectoryReference = async (
    entryId: string,
    label: string,
    content: string,
  ) => {
    const id = await ensurePersisted();
    if (!id) {
      toast({
        title: "Salve o rascunho",
        description: "Edite o encontro antes de vincular referências.",
      });
      throw new Error("Draft not persisted");
    }
    try {
      const result = await addDirectoryRef({ contentId: id, entryId });
      setDirectoryRefs((prev) => {
        if (prev.some((ref) => ref.id === result.id || ref.entryId === entryId)) {
          return prev;
        }
        return [...prev, { id: result.id, entryId, label, content }];
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error?.message ||
          "Não foi possível vincular a referência do Diretório.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const useBlankDocument = () => {
    setDocumentJson(JSON.stringify(createEmptyContentDocument()));
  };

  const useSkeletonDocument = () => {
    setDocumentJson(JSON.stringify(createMeetingSkeletonDocument()));
  };

  const saveBadge = (() => {
    if (saveState === "saving") {
      return {
        label: "Salvando…",
        className: "border-border/70 bg-muted/30 text-[#071A2D]",
      };
    }
    if (saveState === "error") {
      return {
        label: "Falha ao salvar",
        className: "border-destructive/20 bg-destructive/10 text-destructive",
      };
    }
    if (saveState === "saved" || (contentId && saveState === "clean")) {
      const time = formatSavedAt(lastSavedAt);
      return {
        label: time ? `Salvo às ${time}` : "Salvo",
        className: "border-[#071A2D]/20 bg-[#071A2D]/05 text-[#071A2D]",
      };
    }
    if (saveState === "dirty") {
      return {
        label: "Não salvo",
        className: "border-border/70 bg-muted/30 text-muted-foreground",
      };
    }
    return {
      label: "Rascunho local",
      className: "border-border/70 bg-muted/20 text-muted-foreground",
    };
  })();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card className="rounded-sm border-border/70 p-8">
          <div className="flex items-center gap-3 text-sm text-[#071A2D]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Abrindo o editor do encontro…
          </div>
        </Card>
      </div>
    );
  }

  const aiLink = contentId
    ? `/app/ai-hub?mode=improve-content&contentId=${contentId}&contentTitle=${encodeURIComponent(
        title,
      )}&contentTheme=${encodeURIComponent(theme)}`
    : null;

  return (
    <div className="mx-auto max-w-[1660px] space-y-3 px-3 pb-8 pt-2 sm:px-4">
      {/* Scrolls away — meta fields are not needed during continuous writing */}
      <div className="rounded-sm border border-border/70 bg-white px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/app/content-library"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-[#071A2D]"
            title="Voltar para a biblioteca"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Biblioteca</span>
          </Link>
          <div className="hidden h-4 w-px shrink-0 bg-border/70 sm:block" />
          <p
            className="min-w-0 truncate text-sm font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            Editor do encontro
          </p>
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-medium",
              saveBadge.className,
            )}
          >
            {saveBadge.label}
          </Badge>

          <div className="flex shrink-0 items-center gap-1.5">
            {saveState === "error" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-sm px-2 text-xs"
                onClick={() => void saveNow()}
              >
                Tentar de novo
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-sm px-2.5 text-xs"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Visualizar</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-sm"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {aiLink && (
                  <DropdownMenuItem asChild>
                    <Link to={aiLink} className="flex items-center gap-2">
                      <MessageSquareShare className="h-4 w-4" />
                      Assistência editorial
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={useSkeletonDocument}>
                  Usar esqueleto de encontro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={useBlankDocument}>
                  Documento em branco
                </DropdownMenuItem>
                {contentId && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir rascunho
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-8 rounded-sm border-border/60 bg-muted/20 px-2.5 text-sm font-semibold tracking-tight text-[#071A2D] shadow-none focus-visible:ring-1"
            style={{ fontFamily: "var(--font-brand-display)" }}
            placeholder="Título do encontro"
            aria-label="Título"
          />
          <Input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="h-8 rounded-sm border-border/60 bg-muted/20 px-2.5 text-sm shadow-none focus-visible:ring-1"
            placeholder="Tema"
            aria-label="Tema"
          />
          <div className="relative">
            <Clock3 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={estimatedTime}
              onChange={(event) =>
                setEstimatedTime(event.target.value.replace(/[^0-9]/g, ""))
              }
              className="h-8 rounded-sm border-border/60 bg-muted/20 pl-7 pr-2 text-sm shadow-none focus-visible:ring-1"
              placeholder="min"
              aria-label="Duração em minutos"
            />
          </div>
          <div className="relative">
            <Tags className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="h-8 rounded-sm border-border/60 bg-muted/20 pl-7 pr-2 text-sm shadow-none focus-visible:ring-1"
              placeholder="Tags"
              aria-label="Tags"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <Suspense
            fallback={
              <div
                className="min-h-[320px] animate-pulse rounded-sm border border-border/70 bg-muted/30"
                aria-busy="true"
              />
            }
          >
          <RichContentEditor
            value={documentJson}
            onChange={setDocumentJson}
            onImageUpload={async (file) => {
              const id = await ensurePersisted();
              if (!id) {
                toast({
                  title: "Salve o rascunho",
                  description: "Edite o encontro antes de enviar imagens.",
                });
                throw new Error("Draft not persisted");
              }
              return uploadContentImage(file, id);
            }}
            onAddBibleReference={attachBibleReference}
            onAddCatechismReference={attachCatechismReference}
            onAddDirectoryReference={attachDirectoryReference}
            placeholder="Escreva o roteiro do encontro nesta seção…"
            onSave={() => void saveNow()}
            saveLabel={
              saveState === "saving"
                ? "Salvando…"
                : saveState === "error"
                  ? "Tentar de novo"
                  : "Salvar"
            }
            saveDisabled={saveState === "saving"}
            onPreview={() => setPreviewOpen(true)}
          />
          </Suspense>
        </div>

        <div className="xl:sticky xl:top-14">
          <ReferencesSidebar
            contentId={contentId}
            ensurePersisted={ensurePersisted}
            bibleRefs={bibleRefs}
            catechismRefs={catechismRefs}
            directoryRefs={directoryRefs}
            setBibleRefs={setBibleRefs}
            setCatechismRefs={setCatechismRefs}
            setDirectoryRefs={setDirectoryRefs}
          />
        </div>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-4 text-left">
            <SheetTitle>Pré-visualização</SheetTitle>
            <SheetDescription>
              Como o encontro aparece para leitura — edições atuais, mesmo
              antes de salvar.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-5 py-5">
            <article className="rounded-sm border border-border/70 bg-white px-5 py-6 sm:px-7 sm:py-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Encontro
              </p>
              <h1
                className="mt-1 text-2xl font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {title.trim() || DEFAULT_TITLE}
              </h1>
              {(theme.trim() || estimatedTime) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {[
                    theme.trim() || null,
                    estimatedTime
                      ? `${estimatedTime} min`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <div className="mt-3 h-px w-10 bg-[#D39A2B]" aria-hidden />
              <div className="mt-6">
                <ContentDocumentRenderer
                  document={
                    parseContentDocument(documentJson) ||
                    createMeetingSkeletonDocument()
                  }
                />
              </div>
              {(bibleRefs.length > 0 ||
                catechismRefs.length > 0 ||
                directoryRefs.length > 0) && (
                <div className="mt-8 border-t border-border/60 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Referências pastorais
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-[#071A2D]">
                    {bibleRefs.map((ref) => (
                      <li key={ref.id || ref.verseId}>· {ref.label}</li>
                    ))}
                    {catechismRefs.map((ref) => (
                      <li key={ref.id || ref.entryId}>· {ref.label}</li>
                    ))}
                    {directoryRefs.map((ref) => (
                      <li key={ref.id || ref.entryId}>· {ref.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-white px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-sm"
              onClick={() => setPreviewOpen(false)}
            >
              Voltar à edição
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {contentId ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-sm"
                    asChild
                  >
                    <Link to={`/app/content-library/${contentId}/print`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Pré-impressão
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 rounded-sm shadow-none"
                    asChild
                  >
                    <Link to={`/app/content-library/${contentId}`}>
                      Página completa
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 rounded-sm shadow-none"
                  onClick={() => {
                    setPreviewOpen(false);
                    void saveNow();
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar rascunho
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir este rascunho?"
        description="Esta ação não pode ser desfeita. O encontro será removido da biblioteca."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={() => void handleDeleteContent()}
      />
    </div>
  );
}
