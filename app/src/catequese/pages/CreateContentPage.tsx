import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('content');
  const { t: tc } = useTranslation('common');
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
      setError(t('create_page.error_title_required'));
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
      if (e.title) setTitle(e.title);
      if (e.theme) setTheme(e.theme);
      if (e.pastoralObjective) setPastoralObjective(e.pastoralObjective);
      if (e.mainContent) setMainContent(e.mainContent);
      if (e.dynamic && !activity) setActivity(e.dynamic);
      if (e.familyTask) setActivity(prev => prev ? prev + '\n\n' + t('create_page.home_task_prefix') + e.familyTask : t('create_page.home_task_prefix') + e.familyTask);
      if (e.estimatedTime) setEstimatedTime(e.estimatedTime);
      if (e.suggestions?.length) setAiSuggestions(e.suggestions);
    } catch (e: any) {
      setError(e?.message || t('create_page.error_enhance'));
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !mainContent) {
      setError(t('create_page.error_required_fields'));
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

      for (const ref of bibleRefs) {
        try { await addBibleRef({ contentId: item.id, verseId: ref.verseId }); } catch (e: any) { toast({ title: t('create_page.error_bible_ref'), description: e.message, variant: 'destructive' }); }
      }
      for (const ref of catechismRefs) {
        try { await addCatechismRef({ contentId: item.id, entryId: ref.entryId }); } catch (e: any) { toast({ title: t('create_page.error_catechism_ref'), description: e.message, variant: 'destructive' }); }
      }
      for (const ref of directoryRefs) {
        try { await addDirectoryRef({ contentId: item.id, entryId: ref.entryId }); } catch (e: any) { toast({ title: t('create_page.error_directory_ref'), description: e.message, variant: 'destructive' }); }
      }

      toast({ title: t('create_page.success_created') });
      navigate('/app/content-library');
    } catch (e: any) {
      setError(e.message || t('create_page.error_create'));
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
            <h1 className="text-2xl font-bold tracking-tight">{t('create_page.title')}</h1>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          {field(t('create_page.title_required'), title, setTitle, t('create_page.title_placeholder'))}  
          {field(t('theme'), theme, setTheme, t('create_page.theme_placeholder'))}
          {field(t('pastoral_objective'), pastoralObjective, setPastoralObjective, t('create_page.objective_placeholder'))}
          {field(t('create_page.main_content_required'), mainContent, setMainContent, t('create_page.main_content_placeholder'), true)}
          {field(t('create_page.activity_dynamic'), activity, setActivity, t('create_page.activity_placeholder'), true)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('create_page.estimated_time_min')}</label>
              <input type="number" value={estimatedTime} onChange={e => setEstimatedTime(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('tags')}</label>
              <input value={tags} onChange={e => setTags(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" placeholder={t('create_page.tags_placeholder')} />
            </div>
          </div>

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
              {enhancing ? t('create_page.enhancing') : t('create_page.enhance_ai')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('create_page.enhance_hint')}
            </p>

            {aiSuggestions.length > 0 && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" /> {t('create_page.ai_suggestions')}
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
              {saving ? tc('saving') : t('create_page.create_content')}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/content-library">{tc('cancel')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
