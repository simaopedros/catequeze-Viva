import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  EditorContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  searchBible,
  searchCatechism,
  searchDirectory,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { cn } from "../../../client/utils";
import { useLocale } from "../../../i18n/useLocale";
import {
  parseContentDocument,
  createEmptyContentDocument,
  MEETING_SECTION_TITLES,
} from "../../../shared/contentDocument";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table2,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  BookOpen,
  Church,
  FileText,
  Unlink2,
  X,
  LayoutList,
  ChevronDown,
  Save,
  Eye,
} from "lucide-react";

type ReferenceKind = "bible" | "catechism" | "directory";

type BibleSearchResult = {
  id: string;
  number: number;
  text: string;
  chapter?: {
    number: number;
    book?: { name?: string; abbreviation?: string | null };
  };
};

type CatechismSearchResult = {
  id: string;
  number: number;
  question: string;
  answer?: string;
};

type DirectorySearchResult = {
  id: string;
  number: number;
  title?: string;
  chapter?: string;
  content?: string;
};

type SelectionBubbleState = {
  from: number;
  to: number;
  left: number;
  top: number;
  text: string;
  refLabel?: string;
  refType?: string;
};

const referenceMarkClassName =
  "rounded-sm bg-brand-gold/15 px-0.5 underline decoration-dotted underline-offset-4 decoration-brand-gold/80";

const ReferenceAnchor = Mark.create({
  name: "referenceAnchor",
  inclusive: false,

  addAttributes() {
    return {
      refType: { default: null },
      refId: { default: null },
      refLabel: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-reference-anchor]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-reference-anchor": "true",
        "data-ref-type": HTMLAttributes.refType,
        "data-ref-id": HTMLAttributes.refId,
        "data-ref-label": HTMLAttributes.refLabel,
        class: referenceMarkClassName,
        title: HTMLAttributes.refLabel,
      }),
      0,
    ];
  },
});

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-8 shrink-0 rounded-sm border-border/60 px-2 shadow-none",
        !active &&
          "bg-background/80 text-muted-foreground hover:bg-background hover:text-brand-ink",
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

function SelectionActionBubble({
  editor,
  bubble,
  onAddBibleReference,
  onAddCatechismReference,
  onAddDirectoryReference,
  onClose,
}: {
  editor: TiptapEditor;
  bubble: SelectionBubbleState;
  onAddBibleReference: (
    verseId: string,
    label: string,
    text: string,
  ) => Promise<void> | void;
  onAddCatechismReference: (
    entryId: string,
    label: string,
    question: string,
  ) => Promise<void> | void;
  onAddDirectoryReference: (
    entryId: string,
    label: string,
    content: string,
  ) => Promise<void> | void;
  onClose: () => void;
}) {
  const { currentLocale } = useLocale();
  const [mode, setMode] = useState<ReferenceKind | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<BibleSearchResult | CatechismSearchResult | DirectorySearchResult>
  >([]);
  const [searching, setSearching] = useState(false);
  const latestSelectionRef = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    latestSelectionRef.current = { from: bubble.from, to: bubble.to };
  }, [bubble.from, bubble.to]);

  useEffect(() => {
    setMode(null);
    setQuery("");
    setResults([]);
    setSearching(false);
  }, [bubble.from, bubble.to]);

  useEffect(() => {
    if (!mode) {
      setResults([]);
      setSearching(false);
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        let nextResults:
          | Array<
              BibleSearchResult | CatechismSearchResult | DirectorySearchResult
            >
          | undefined;

        if (mode === "bible") {
          nextResults = (await searchBible({
            query: trimmedQuery,
            limit: 8,
            locale: currentLocale,
          })) as BibleSearchResult[];
        } else if (mode === "catechism") {
          nextResults = (await searchCatechism({
            query: trimmedQuery,
            limit: 8,
            locale: currentLocale,
          })) as CatechismSearchResult[];
        } else {
          nextResults = (await searchDirectory({
            query: trimmedQuery,
            limit: 8,
            locale: currentLocale,
          })) as DirectorySearchResult[];
        }

        if (!cancelled) {
          setResults(nextResults || []);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, query, currentLocale]);

  const restoreSelection = () => {
    const selection = latestSelectionRef.current;
    if (!selection) return null;
    editor.chain().focus().setTextSelection(selection).run();
    return selection;
  };

  const applyReference = async (
    refType: ReferenceKind,
    refId: string,
    refLabel: string,
    sideEffect?: () => Promise<void> | void,
  ) => {
    const selection = latestSelectionRef.current;
    if (!selection) return;

    if (sideEffect) {
      await sideEffect();
    }

    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .setMark("referenceAnchor", { refType, refId, refLabel })
      .run();

    setMode(null);
    setQuery("");
    setResults([]);
  };

  const handleLink = () => {
    // Link editing from the bubble uses the parent toolbar dialog via focus restore.
    const selection = restoreSelection();
    if (!selection) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = previous || "https://";
    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  };

  const clearReference = () => {
    const selection = restoreSelection();
    if (!selection) return;
    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .unsetMark("referenceAnchor")
      .run();
  };

  const renderResultLabel = (
    item: BibleSearchResult | CatechismSearchResult | DirectorySearchResult,
  ) => {
    if (mode === "bible") {
      const verse = item as BibleSearchResult;
      const bookLabel =
        verse.chapter?.book?.abbreviation ||
        verse.chapter?.book?.name ||
        "Bíblia";
      return {
        title: `${bookLabel} ${verse.chapter?.number}:${verse.number}`,
        description: verse.text,
        onSelect: () =>
          applyReference(
            "bible",
            verse.id,
            `${bookLabel} ${verse.chapter?.number}:${verse.number}`,
            () =>
              onAddBibleReference(
                verse.id,
                `${bookLabel} ${verse.chapter?.number}:${verse.number}`,
                verse.text,
              ),
          ),
      };
    }

    if (mode === "catechism") {
      const entry = item as CatechismSearchResult;
      return {
        title: `CIC §${entry.number}`,
        description: entry.question,
        onSelect: () =>
          applyReference("catechism", entry.id, `CIC §${entry.number}`, () =>
            onAddCatechismReference(
              entry.id,
              `CIC §${entry.number}`,
              entry.question,
            ),
          ),
      };
    }

    const entry = item as DirectorySearchResult;
    return {
      title: `Diretório §${entry.number}`,
      description: entry.title || entry.chapter || entry.content || "",
      onSelect: () =>
        applyReference(
          "directory",
          entry.id,
          `Diretório §${entry.number}`,
          () =>
            onAddDirectoryReference(
              entry.id,
              `Diretório §${entry.number}`,
              entry.content || entry.title || entry.chapter || "",
            ),
        ),
    };
  };

  const bubbleButtonClass = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-medium transition-colors",
      active
        ? "border-brand-ink bg-brand-ink text-white"
        : "border-border/60 bg-background/90 text-muted-foreground hover:text-brand-ink",
    );

  const bubbleNode = (
    <div
      className="fixed z-[2147483000] w-[340px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-sm border border-border/60 bg-background/95 p-3 "
      style={{ left: bubble.left, top: bubble.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-xs text-muted-foreground">
            “{bubble.text}”
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bubble.refLabel ? (
            <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-semibold tracking-tight text-brand-ink">
              {bubble.refLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border/60 bg-background/90 text-muted-foreground transition-colors hover:text-brand-ink"
            aria-label="Fechar balão"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={bubbleButtonClass(mode === "bible")}
          onClick={() =>
            setMode((current) => (current === "bible" ? null : "bible"))
          }
        >
          <BookOpen className="h-3.5 w-3.5" /> Bíblia
        </button>
        <button
          type="button"
          className={bubbleButtonClass(mode === "catechism")}
          onClick={() =>
            setMode((current) => (current === "catechism" ? null : "catechism"))
          }
        >
          <Church className="h-3.5 w-3.5" /> Catecismo
        </button>
        <button
          type="button"
          className={bubbleButtonClass(mode === "directory")}
          onClick={() =>
            setMode((current) => (current === "directory" ? null : "directory"))
          }
        >
          <FileText className="h-3.5 w-3.5" /> Diretório
        </button>
        <button
          type="button"
          className={bubbleButtonClass(false)}
          onClick={handleLink}
        >
          <LinkIcon className="h-3.5 w-3.5" /> Link
        </button>
        {bubble.refLabel ? (
          <button
            type="button"
            className={bubbleButtonClass(false)}
            onClick={clearReference}
          >
            <Unlink2 className="h-3.5 w-3.5" /> Remover vínculo
          </button>
        ) : null}
      </div>

      {mode ? (
        <div className="mt-3 space-y-2 rounded-sm border border-border/50 bg-muted/20 p-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none"
            placeholder={
              mode === "bible"
                ? "Buscar passagem"
                : mode === "catechism"
                  ? "Buscar no Catecismo"
                  : "Buscar no Diretório"
            }
            aria-label={
              mode === "bible"
                ? "Buscar passagem"
                : mode === "catechism"
                  ? "Buscar no Catecismo"
                  : "Buscar no Diretório"
            }
          />

          {query.trim().length < 2 ? (
            <div className="px-1 py-2 text-xs text-muted-foreground">
              Digite ao menos 2 caracteres para vincular a seleção.
            </div>
          ) : searching ? (
            <div className="px-1 py-2 text-xs text-muted-foreground">
              Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="px-1 py-2 text-xs text-muted-foreground">
              Nenhuma referência encontrada.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-sm border border-border/70 bg-white">
              {results.map((item) => {
                const result = renderResultLabel(item);
                return (
                  <button
                    key={(item as { id: string }).id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 border-b border-border/40 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted/40"
                    onClick={() => void result.onSelect()}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-brand-display font-semibold tracking-tight text-brand-ink">
                        {result.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-muted-foreground">
                        {result.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") {
    return bubbleNode;
  }

  return createPortal(bubbleNode, document.body);
}

export function RichContentEditor({
  value,
  onChange,
  onImageUpload,
  onAddBibleReference,
  onAddCatechismReference,
  onAddDirectoryReference,
  placeholder = "Escreva o encontro aqui...",
  onSave,
  saveLabel = "Salvar",
  saveDisabled = false,
  onPreview,
}: {
  value: string;
  onChange: (next: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  onAddBibleReference: (
    verseId: string,
    label: string,
    text: string,
  ) => Promise<void> | void;
  onAddCatechismReference: (
    entryId: string,
    label: string,
    question: string,
  ) => Promise<void> | void;
  onAddDirectoryReference: (
    entryId: string,
    label: string,
    content: string,
  ) => Promise<void> | void;
  placeholder?: string;
  /** Single save action shown on the sticky format bar */
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Live preview of the current document without leaving the editor */
  onPreview?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncRef = useRef(false);
  const dismissedSelectionRef = useRef<string | null>(null);
  const [selectionBubble, setSelectionBubble] =
    useState<SelectionBubbleState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("https://");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Image,
      ReferenceAnchor,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: parseContentDocument(value) || createEmptyContentDocument(),
    editorProps: {
      attributes: {
        class:
          "min-h-[50vh] max-w-none px-5 py-8 outline-none prose prose-neutral sm:min-h-[60vh] sm:px-8 sm:py-10 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-brand-ink prose-p:leading-7 prose-img:rounded-sm prose-blockquote:border-l-brand-ink prose-blockquote:text-brand-ink/90 prose-strong:text-brand-ink",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (!item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (!file) continue;
          event.preventDefault();
          void onImageUpload(file).then((url) => {
            editor?.chain().focus().setImage({ src: url }).run();
          });
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor: instance }) {
      if (syncRef.current) return;
      onChange(JSON.stringify(instance.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;

    const updateSelectionBubble = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setSelectionBubble(null);
        return;
      }

      const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
      if (!selectedText) {
        setSelectionBubble(null);
        dismissedSelectionRef.current = null;
        return;
      }

      const selectionKey = `${from}:${to}:${selectedText}`;
      if (dismissedSelectionRef.current === selectionKey) {
        setSelectionBubble(null);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const left = Math.min(
        Math.max((start.left + end.right) / 2, 24),
        window.innerWidth - 24,
      );
      const top = Math.max(start.top - 12, 80);
      const activeReference = editor.getAttributes("referenceAnchor") as {
        refLabel?: string;
        refType?: string;
      };

      setSelectionBubble({
        from,
        to,
        left,
        top,
        text: selectedText,
        refLabel: activeReference.refLabel,
        refType: activeReference.refType,
      });
      dismissedSelectionRef.current = null;
    };

    updateSelectionBubble();
    editor.on("selectionUpdate", updateSelectionBubble);
    editor.on("transaction", updateSelectionBubble);

    return () => {
      editor.off("selectionUpdate", updateSelectionBubble);
      editor.off("transaction", updateSelectionBubble);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const parsed = parseContentDocument(value) || createEmptyContentDocument();
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(parsed);
    if (current === next) return;
    syncRef.current = true;
    editor.commands.setContent(parsed, false);
    syncRef.current = false;
  }, [editor, value]);

  const openLinkDialog = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    setLinkHref(previous || "https://");
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const href = linkHref.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  const insertMeetingSection = (sectionTitle: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: sectionTitle }],
        },
        { type: "paragraph" },
      ])
      .run();
  };

  const insertImage = async (file: File) => {
    const url = await onImageUpload(file);
    editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
  };

  const ToolbarDivider = () => (
    <span className="mx-0.5 hidden h-6 w-px bg-border/70 sm:inline-block" />
  );

  return (
    <div className="rounded-sm border border-border/70 bg-white">
      {/* Only the format bar sticks at the scroll container top */}
      <div className="sticky top-0 z-40 flex border-b border-border/60 bg-white shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 py-1.5 no-scrollbar sm:px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 rounded-sm px-2 text-xs"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Seção</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {MEETING_SECTION_TITLES.map((section) => (
                <DropdownMenuItem
                  key={section}
                  onClick={() => insertMeetingSection(section)}
                >
                  {section}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="hidden h-5 w-px shrink-0 bg-border/70 sm:inline-block" />
          <ToolbarButton
            title="Parágrafo"
            onClick={() => editor?.chain().focus().setParagraph().run()}
            active={editor?.isActive("paragraph")}
          >
            <Pilcrow className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Título 1"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor?.isActive("heading", { level: 1 })}
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Título 2"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor?.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Título 3"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor?.isActive("heading", { level: 3 })}
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Negrito (Ctrl/Cmd+B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Itálico (Ctrl/Cmd+I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Sublinhado"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive("underline")}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Lista"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Lista numerada"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Citação"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive("blockquote")}
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Separador"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Link"
            onClick={openLinkDialog}
            active={editor?.isActive("link")}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Tabela"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            active={editor?.isActive("table")}
          >
            <Table2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Imagem"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Desfazer"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Refazer"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
        {(onPreview || onSave) && (
          <div className="flex shrink-0 items-center gap-1.5 border-l border-border/60 bg-white px-2 py-1.5 sm:px-3">
            {onPreview ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 rounded-sm px-2.5 text-xs"
                onClick={onPreview}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Visualizar</span>
              </Button>
            ) : null}
            {onSave ? (
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 gap-1.5 rounded-sm px-2.5 text-xs shadow-none"
                onClick={onSave}
                disabled={saveDisabled}
              >
                <Save className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{saveLabel}</span>
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await insertImage(file);
          event.target.value = "";
        }}
      />

      <div className="overflow-visible bg-muted/40 p-3 sm:p-6 lg:p-8">
        <div
          className={cn(
            "relative z-10 mx-auto max-w-[920px] overflow-visible rounded-sm border border-border/70 bg-white",
          )}
        >
          {editor && selectionBubble ? (
            <SelectionActionBubble
              editor={editor}
              bubble={selectionBubble}
              onAddBibleReference={onAddBibleReference}
              onAddCatechismReference={onAddCatechismReference}
              onAddDirectoryReference={onAddDirectoryReference}
              onClose={() => {
                dismissedSelectionRef.current = `${selectionBubble.from}:${selectionBubble.to}:${selectionBubble.text}`;
                setSelectionBubble(null);
              }}
            />
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-muted-foreground">
              URL
            </label>
            <Input
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="https://"
              aria-label="URL"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              Remover link
            </Button>
            <Button type="button" onClick={applyLink}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
