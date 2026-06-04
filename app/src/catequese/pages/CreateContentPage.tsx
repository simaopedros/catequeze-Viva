import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import { ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { ReferencePicker } from '../../client/components/ReferencePicker';
import { createContentItem, addBibleRef, addCatechismRef, addDirectoryRef } from 'wasp/client/operations';
import { enhanceContentWithAi } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';

export default function CreateContentPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [pastoralObjective, setPastoralObjective] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [activity, setActivity] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [tags, setTags] = useState('');

  // References
  const [bibleRefs, setBibleRefs] = useState<{ verseId: string; label: string; text?: string }[]>([]);
  const [catechismRefs, setCatechismRefs] = useState<{ entryId: string; label: string; question?: string }[]>([]);
  const [directoryRefs, setDirectoryRefs] = useState<{ entryId: string; label: string; content?: string }[]>([]);

  const handleAddBible = (verseId: string, label: string, text: string) => {    
    setBibleRefs(prev => [...prev, { verseId, label, text }]);
  };
  const handleRemoveBible = (id: string) => {
    setBibleRefs(prev => prev.filter(r => r.verseId !== id));
  };
  const handleAddCatechism = (entryId: string, label: string, question: string) => {
    setCatechismRefs(prev => [...prev, { entryId, label, question }]);
  };
  const handleRemoveCatechism = (id: string) => {
    setCatechismRefs(prev => prev.filter(r => r.entryId !== id));
  };
  const handleAddDirectory = (entryId: string, label: string, content: string) => {
    setDirectoryRefs(prev => [...prev, { entryId, label, content }]);
  };
  const handleRemoveDirectory = (id: string) => {
    setDirectoryRefs(prev => prev.filter(r => r.entryId !== id));
  };

  const handleEnhanceWithAi = async () => {
    if (!title.trim()) {
      setError('Preencha ao menos o título antes de usar a IA.');
      return;
    }
    setEnhancing(true);
    setError('');
    setAiSuggestions([]);
    try {
      const res = await enhanceContentWithAi({
        title,
        theme: theme || undefined,
        pastoralObjective: pastoralObjective || undefined,
        mainContent: mainContent || undefined,
        activity: activity || undefined,
        estimatedTime,
        bibleRefs: bibleRefs.map(r => r.label),
        catechismRefs: catechismRefs.map(r => r.label),
        directoryRefs: directoryRefs.map(r => r.label),
      });

      const e = res.enhanced;
      // Populate fields with AI improvements (preserve originals if AI returns empty)
      if (e.title) setTitle(e.title);
      if (e.theme) setTheme(e.theme);
      if (e.pastoralObjective) setPastoralObjective(e.pastoralObjective);
      if (e.mainContent) setMainContent(e.mainContent);
      if (e.dynamic && !activity) setActivity(e.dynamic);
      if (e.familyTask) setActivity(prev => prev ? prev + '\n\nTarefa para casa: ' + e.familyTask : 'Tarefa para casa: ' + e.familyTask);
      if (e.estimatedTime) setEstimatedTime(e.estimatedTime);
      if (e.suggestions?.length) setAiSuggestions(e.suggestions);
    } catch (e: any) {
      setError(e?.message || 'Erro ao melhorar com IA.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !mainContent) {
      setError('Título e conteúdo principal são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const item = await createContentItem({
        title, theme: theme || undefined,
        pastoralObjective: pastoralObjective || undefined,
        mainContent, activity: activity || undefined,
        estimatedTime, tags: tags || undefined,
      });

      // Add references
      for (const ref of bibleRefs) {
        try { await addBibleRef({ contentId: item.id, verseId: ref.verseId }); } catch (e) { console.error(e); }
      }
      for (const ref of catechismRefs) {
        try { await addCatechismRef({ contentId: item.id, entryId: ref.entryId }); } catch (e) { console.error(e); }
      }
      for (const ref of directoryRefs) {
        try { await addDirectoryRef({ contentId: item.id, entryId: ref.entryId }); } catch (e) { console.error(e); }
      }

      toast({ title: 'Conteúdo criado com sucesso!' });
      navigate('/app/content-library');
    } catch (e: any) {
      setError(e.message || 'Erro ao criar conteúdo.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, setter: (v: string) => void, placeholder: string, textarea = false) => (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {textarea ? (
        <Textarea value={value} onChange={e => setter(e.target.value)} className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder={placeholder} />
      ) : (
        <input value={value} onChange={e => setter(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder={placeholder} />
      )}
    </div>
  );

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/content-library"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Conteúdo</h1>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          {field('Título *', title, setTitle, 'Ex: Encontro sobre o Batismo')}  
          {field('Tema', theme, setTheme, 'Ex: Sacramento do Batismo')}
          {field('Objetivo pastoral', pastoralObjective, setPastoralObjective, 'O que se espera alcançar neste encontro')}
          {field('Conteúdo principal *', mainContent, setMainContent, 'Desenvolva o conteúdo do encontro...', true)}
          {field('Atividade / Dinâmica', activity, setActivity, 'Descreva a atividade proposta...', true)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tempo estimado (min)</label>
              <input type="number" value={estimatedTime} onChange={e => setEstimatedTime(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tags</label>
              <input value={tags} onChange={e => setTags(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder="Ex: batismo, liturgia, infantil" />
            </div>
          </div>

          {/* Reference Picker */}
          <ReferencePicker
            bibleRefs={bibleRefs}
            catechismRefs={catechismRefs}
            directoryRefs={directoryRefs}
            onAddBible={handleAddBible}
            onRemoveBible={handleRemoveBible}
            onAddCatechism={handleAddCatechism}
            onRemoveCatechism={handleRemoveCatechism}
            onAddDirectory={handleAddDirectory}
            onRemoveDirectory={handleRemoveDirectory}
          />

          {/* AI Enhance Button */}
          <div className="border-t pt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleEnhanceWithAi}
              disabled={enhancing}
              className="gap-2 border-dashed border-2 border-violet-300 dark:border-violet-700 hover:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/40"
            >
              {enhancing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {enhancing ? 'Melhorando com IA...' : 'Melhorar com IA'}
            </Button>
            <p className="text-xs text-muted-foreground">
              A IA vai expandir e melhorar seu rascunho, sugerir referências bíblicas e do Catecismo, e completar campos vazios.
            </p>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" /> Sugestões da IA
                </p>
                <ul className="space-y-1">
                  {aiSuggestions.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-violet-500">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving}>     
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Criar conteúdo'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/content-library">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
