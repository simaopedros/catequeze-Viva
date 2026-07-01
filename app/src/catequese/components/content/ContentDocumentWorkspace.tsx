import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { addBibleRef, addCatechismRef, addDirectoryRef, createContentItem, getContentItem, removeBibleRef, removeCatechismRef, removeDirectoryRef, updateContentItem } from 'wasp/client/operations';
import { Badge } from '../../../client/components/ui/badge';
import { Button } from '../../../client/components/ui/button';
import { Card } from '../../../client/components/ui/card';
import { Input } from '../../../client/components/ui/input';
import { ReferencePicker } from '../../../client/components/ReferencePicker';
import { toast } from '../../../client/hooks/use-toast';
import { cn } from '../../../client/utils';
import { CONTENT_DOCUMENT_VERSION, buildLegacyContentDocument, createEmptyContentDocument } from '../../../shared/contentDocument';
import { uploadContentImage } from '../../../client/utils/contentImageUpload';
import { RichContentEditor } from './RichContentEditor';
import { BookMarked, Clock3, Eye, Loader2, MessageSquareShare, Save, Sparkles, ArrowLeft, Tags } from 'lucide-react';

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-foreground">
      {label}
      <button type="button" onClick={onRemove} className="text-muted-foreground transition-colors hover:text-destructive">
        ×
      </button>
    </span>
  );
}

function ReferencesSidebar({
  contentId,
  bibleRefs,
  catechismRefs,
  directoryRefs,
  setBibleRefs,
  setCatechismRefs,
  setDirectoryRefs,
}: any) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const onError = (message: string) => toast({ title: 'Erro', description: message, variant: 'destructive' });

  const handleRemoveBible = async (id?: string, verseId?: string) => {
    try {
      if (id) await removeBibleRef({ id });
      setBibleRefs((prev: any[]) => prev.filter((ref: any) => (ref.id || ref.verseId) !== (id || verseId)));
    } catch (error: any) {
      onError(error.message);
    }
  };

  const handleRemoveCatechism = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeCatechismRef({ id });
      setCatechismRefs((prev: any[]) => prev.filter((ref: any) => (ref.id || ref.entryId) !== (id || entryId)));
    } catch (error: any) {
      onError(error.message);
    }
  };

  const handleRemoveDirectory = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeDirectoryRef({ id });
      setDirectoryRefs((prev: any[]) => prev.filter((ref: any) => (ref.id || ref.entryId) !== (id || entryId)));
    } catch (error: any) {
      onError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-border/70 p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Referências do encontro</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Anexe Bíblia, Catecismo e Diretório sem sair do editor.</p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
            {bibleRefs.length + catechismRefs.length + directoryRefs.length}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Bíblia</span>
              <span>{bibleRefs.length}</span>
            </div>
            <div className="flex min-h-8 flex-wrap gap-2">
              {bibleRefs.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma passagem selecionada.</span> : bibleRefs.map((ref: any) => (
                <SelectedChip key={ref.id || ref.verseId} label={ref.label} onRemove={() => handleRemoveBible(ref.id, ref.verseId)} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Catecismo</span>
              <span>{catechismRefs.length}</span>
            </div>
            <div className="flex min-h-8 flex-wrap gap-2">
              {catechismRefs.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma referência selecionada.</span> : catechismRefs.map((ref: any) => (
                <SelectedChip key={ref.id || ref.entryId} label={ref.label} onRemove={() => handleRemoveCatechism(ref.id, ref.entryId)} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Diretório</span>
              <span>{directoryRefs.length}</span>
            </div>
            <div className="flex min-h-8 flex-wrap gap-2">
              {directoryRefs.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma referência selecionada.</span> : directoryRefs.map((ref: any) => (
                <SelectedChip key={ref.id || ref.entryId} label={ref.label} onRemove={() => handleRemoveDirectory(ref.id, ref.entryId)} />
              ))}
            </div>
          </div>
        </div>

        <Button variant="outline" className="mt-5 w-full rounded-xl" onClick={() => setPickerOpen((value) => !value)}>
          {pickerOpen ? 'Fechar seletor' : 'Selecionar referências'}
        </Button>
      </Card>

      {pickerOpen && (
        <Card className="rounded-3xl border-border/70 p-2 shadow-sm">
          <ReferencePicker
            bibleRefs={bibleRefs}
            catechismRefs={catechismRefs}
            directoryRefs={directoryRefs}
            onAddBible={async (verseId, label, text) => {
              try {
                const result = await addBibleRef({ contentId, verseId });
                setBibleRefs((prev: any[]) => [...prev, { id: result.id, verseId, label, text }]);
              } catch (error: any) {
                onError(error.message);
              }
            }}
            onRemoveBible={async (id) => handleRemoveBible(id)}
            onAddCatechism={async (entryId: string, label: string, question: string) => {
              try {
                const result = await addCatechismRef({ contentId, entryId });
                setCatechismRefs((prev: any[]) => [...prev, { id: result.id, entryId, label, question }]);
              } catch (error: any) {
                onError(error.message);
              }
            }}
            onRemoveCatechism={async (id) => handleRemoveCatechism(id)}
            onAddDirectory={async (entryId, label, content) => {
              try {
                const result = await addDirectoryRef({ contentId, entryId });
                setDirectoryRefs((prev: any[]) => [...prev, { id: result.id, entryId, label, content }]);
              } catch (error: any) {
                onError(error.message);
              }
            }}
            onRemoveDirectory={async (id) => handleRemoveDirectory(id)}
          />
        </Card>
      )}
    </div>
  );
}

export function ContentDocumentWorkspace({ existingContentId }: { existingContentId?: string }) {
  const [loading, setLoading] = useState(true);
  const [contentId, setContentId] = useState<string | null>(existingContentId || null);
  const [title, setTitle] = useState('Novo encontro');
  const [theme, setTheme] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('60');
  const [tags, setTags] = useState('');
  const [documentJson, setDocumentJson] = useState(JSON.stringify(createEmptyContentDocument()));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [bibleRefs, setBibleRefs] = useState<any[]>([]);
  const [catechismRefs, setCatechismRefs] = useState<any[]>([]);
  const [directoryRefs, setDirectoryRefs] = useState<any[]>([]);
  const baselineRef = useRef('');
  const readyRef = useRef(false);

  const snapshot = useMemo(
    () => JSON.stringify({ title, theme, estimatedTime, tags, documentJson }),
    [title, theme, estimatedTime, tags, documentJson],
  );

  const loadItemIntoState = (item: any) => {
    setContentId(item.id);
    setTitle(item.title || 'Novo encontro');
    setTheme(item.theme || '');
    setEstimatedTime(String(item.estimatedTime || 60));
    setTags(item.tags || '');
    setDocumentJson(item.documentJson || JSON.stringify(buildLegacyContentDocument(item)));
    setBibleRefs((item.bibleRefs || []).map((ref: any) => ({
      id: ref.id,
      verseId: ref.verseId,
      label: `${ref.verse?.chapter?.book?.abbreviation || ref.verse?.chapter?.book?.name || ''} ${ref.verse?.chapter?.number}:${ref.verse?.number}`,
      text: ref.verse?.text,
    })));
    setCatechismRefs((item.catechismRefs || []).map((ref: any) => ({
      id: ref.id,
      entryId: ref.entryId,
      label: `CIC ${ref.entry?.number}`,
      question: ref.entry?.question,
      answer: ref.entry?.answer,
    })));
    setDirectoryRefs(((item.directoryRefs || [])).map((ref: any) => ({
      id: ref.id,
      entryId: ref.entryId,
      label: `DC ${ref.entry?.number}`,
      content: ref.entry?.content,
    })));
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        const item = existingContentId
          ? await getContentItem({ id: existingContentId })
          : await createContentItem({
              title: 'Novo encontro',
              theme: '',
              mainContent: '',
              estimatedTime: 60,
              tags: '',
              documentJson: JSON.stringify(createEmptyContentDocument()),
            });

        if (cancelled) return;
        const resolved = existingContentId ? item : await getContentItem({ id: item.id });
        if (cancelled) return;
        loadItemIntoState(resolved);
        readyRef.current = true;
      } catch (error: any) {
        toast({ title: 'Erro', description: error?.message || 'Não foi possível abrir o editor.', variant: 'destructive' });
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
    if (!readyRef.current) return;
    baselineRef.current = snapshot;
  }, [loading]);

  const saveNow = async () => {
    if (!contentId) return;
    setSaveState('saving');
    try {
      await updateContentItem({
        id: contentId,
        title: title.trim() || 'Novo encontro',
        theme: theme.trim() || null,
        estimatedTime: Number(estimatedTime) || 60,
        tags: tags.trim() || null,
        documentJson,
        documentVersion: CONTENT_DOCUMENT_VERSION,
      } as any);
      baselineRef.current = snapshot;
      setSaveState('saved');
    } catch (error: any) {
      setSaveState('error');
      toast({ title: 'Erro ao salvar', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!readyRef.current || !contentId) return;
    if (snapshot === baselineRef.current) return;

    setSaveState('idle');
    const timer = setTimeout(() => {
      void saveNow();
    }, 900);

    return () => clearTimeout(timer);
  }, [snapshot, contentId]);

  if (loading || !contentId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card className="rounded-3xl p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> preparando editor do encontro
          </div>
        </Card>
      </div>
    );
  }

  const aiLink = `/app/ai-hub?mode=improve-content&contentId=${contentId}&contentTitle=${encodeURIComponent(title)}&contentTheme=${encodeURIComponent(theme)}`;

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 px-4 pb-8 pt-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <Link to="/app/content-library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para a biblioteca
          </Link>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Editor do encontro</h1>
            <p className="mt-2 text-base text-muted-foreground">Documento contínuo, imagens, tabelas e autosave para escrever como um texto de verdade.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
            {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo' : saveState === 'error' ? 'Erro ao salvar' : 'Alterações pendentes'}
          </Badge>
          <Button variant="outline" className="rounded-xl gap-2" asChild>
            <Link to={aiLink}>
              <MessageSquareShare className="h-4 w-4" /> Melhorar com IA
            </Link>
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => void saveNow()}>
            <Save className="h-4 w-4" /> Salvar agora
          </Button>
          <Button className="rounded-xl gap-2" asChild>
            <Link to={`/app/content-library/${contentId}`}>
              <Eye className="h-4 w-4" /> Visualizar
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-border/70 p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Título</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-12 rounded-xl" placeholder="Nome do encontro" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tema</label>
            <Input value={theme} onChange={(event) => setTheme(event.target.value)} className="h-12 rounded-xl" placeholder="Tema central" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duração</label>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={estimatedTime} onChange={(event) => setEstimatedTime(event.target.value.replace(/[^0-9]/g, ''))} className="h-12 rounded-xl pl-9" placeholder="60" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</label>
            <div className="relative">
              <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={tags} onChange={(event) => setTags(event.target.value)} className="h-12 rounded-xl pl-9" placeholder="fé, família, sacramentos" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            A IA ficou secundária. O foco aqui é escrever bem, com liberdade de documento.
          </div>
          <RichContentEditor value={documentJson} onChange={setDocumentJson} onImageUpload={(file) => uploadContentImage(file, contentId)} />
        </div>

        <ReferencesSidebar
          contentId={contentId}
          bibleRefs={bibleRefs}
          catechismRefs={catechismRefs}
          directoryRefs={directoryRefs}
          setBibleRefs={setBibleRefs}
          setCatechismRefs={setCatechismRefs}
          setDirectoryRefs={setDirectoryRefs}
        />
      </div>
    </div>
  );
}
