import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Button } from '../../../client/components/ui/button';
import { cn } from '../../../client/utils';
import { parseContentDocument, createEmptyContentDocument } from '../../../shared/contentDocument';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon, Table2, Undo2, Redo2, Heading1, Heading2, Heading3, Pilcrow } from 'lucide-react';

function ToolbarButton({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: ReactNode; title: string }) {
  return (
    <Button type="button" variant={active ? 'default' : 'outline'} size="sm" className="h-9 px-3" onClick={onClick} title={title}>
      {children}
    </Button>
  );
}

export function RichContentEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Escreva o encontro aqui...',
}: {
  value: string;
  onChange: (next: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Image,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: parseContentDocument(value) || createEmptyContentDocument(),
    editorProps: {
      attributes: {
        class: 'min-h-[720px] outline-none px-8 py-10 prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-7 prose-img:rounded-xl prose-blockquote:border-l-primary prose-blockquote:text-foreground',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (!item.type.startsWith('image/')) continue;
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
    const parsed = parseContentDocument(value) || createEmptyContentDocument();
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(parsed);
    if (current === next) return;
    syncRef.current = true;
    editor.commands.setContent(parsed, false);
    syncRef.current = false;
  }, [editor, value]);

  const insertLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Cole o link', previous || 'https://');
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const insertImage = async (file: File) => {
    const url = await onImageUpload(file);
    editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-border/70 bg-muted/20 p-3">
        <ToolbarButton title="Parágrafo" onClick={() => editor?.chain().focus().setParagraph().run()} active={editor?.isActive('paragraph')}><Pilcrow className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Título 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}><Heading1 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Título 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Título 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Negrito" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Sublinhado" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Lista" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Separador" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Link" onClick={insertLink} active={editor?.isActive('link')}><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Tabela" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor?.isActive('table')}><Table2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Imagem" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Desfazer" onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
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
          event.target.value = '';
        }}
      />

      <div className="bg-[#f6f0e5] p-4 sm:p-6">
        <div className={cn('mx-auto max-w-[900px] rounded-[24px] border border-border/70 bg-background shadow-[0_25px_80px_rgba(7,26,45,0.08)]')}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
