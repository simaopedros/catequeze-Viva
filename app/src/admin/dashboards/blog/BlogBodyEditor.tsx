import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline as UnderlineIcon,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { cn } from "../../../client/utils";
import { sanitizeBlogHtml } from "../../../shared/blogHtml";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", active && "bg-brand-ink/8 text-brand-ink")}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

export function BlogBodyEditor({
  value,
  onChange,
  onImageUpload,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
}) {
  const { t } = useTranslation("admin");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncRef = useRef(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("https://");

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Image,
      Placeholder.configure({
        placeholder: t("pages.blog.body_placeholder"),
      }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[22rem] max-w-none px-4 py-5 outline-none prose prose-neutral prose-headings:font-semibold prose-headings:text-brand-ink prose-p:leading-7 prose-img:rounded-sm",
      },
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false;
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
      onChange(sanitizeBlogHtml(instance.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = sanitizeBlogHtml(editor.getHTML());
    const next = sanitizeBlogHtml(value || "");
    if (current === next) return;
    syncRef.current = true;
    editor.commands.setContent(value || "<p></p>", false);
    syncRef.current = false;
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-sm border border-border/70 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
        <ToolbarButton
          label={t("pages.blog.toolbar.paragraph")}
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.h2")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.h3")}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.bold")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.italic")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.underline")}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.bullet")}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.ordered")}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.quote")}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.link")}
          active={editor.isActive("link")}
          onClick={() => {
            setLinkHref(editor.getAttributes("link").href || "https://");
            setLinkOpen(true);
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        {onImageUpload && (
          <ToolbarButton
            label={t("pages.blog.toolbar.image")}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
        )}
        <ToolbarButton
          label={t("pages.blog.toolbar.undo")}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("pages.blog.toolbar.redo")}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !onImageUpload) return;
          void onImageUpload(file).then((url) => {
            editor.chain().focus().setImage({ src: url }).run();
          });
        }}
      />
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.blog.link_title")}</DialogTitle>
          </DialogHeader>
          <Input
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            placeholder="https://"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              {t("pages.blog.remove_link")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const href = linkHref.trim();
                if (href) {
                  editor.chain().focus().setLink({ href }).run();
                }
                setLinkOpen(false);
              }}
            >
              {t("pages.blog.apply_link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
