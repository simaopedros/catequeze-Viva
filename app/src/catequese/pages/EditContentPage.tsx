import { useParams, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Save, Sparkles, Clock, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { ReferencePicker } from '../../client/components/ReferencePicker';
import { getContentItem, addBibleRef, removeBibleRef, addCatechismRef, removeCatechismRef, addDirectoryRef, removeDirectoryRef, updateContentItem } from 'wasp/client/operations';
import { enhanceContentWithAi } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';

export default function EditContentPage() {
  const { t } = useTranslation('content');
  const { t: tc } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const contentId = id ?? '';
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [pastoralObjective, setPastoralObjective] = useState('');
  const [openingPrayer, setOpeningPrayer] = useState('');
  const [closingPrayer, setClosingPrayer] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [dynamic, setDynamic] = useState('');
  const [activity, setActivity] = useState('');
  const [familyTask, setFamilyTask] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [biblicalRef, setBiblicalRef] = useState('');
  const [catechismRef, setCatechismRef] = useState('');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [bibleRefs, setBibleRefs] = useState<{ id?: string; verseId: string; label: string; text?: string }[]>([]);
  const [catechismRefs, setCatechismRefs] = useState<{ id?: string; entryId: string; label: string; question?: string }[]>([]);
  const [directoryRefs, setDirectoryRefs] = useState<{ id?: string; entryId: string; label: string; content?: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const item = await getContentItem({ id: id! });
        if (item) {
          setTitle(item.title || '');
          setTheme(item.theme || '');
          setPastoralObjective(item.pastoralObjective || '');
          setOpeningPrayer(item.openingPrayer || '');
          setClosingPrayer(item.closingPrayer || '');
          setMainContent(item.mainContent || '');
          setDynamic(item.dynamic || '');
          setActivity(item.activity || '');
          setFamilyTask(item.familyTask || '');
          setEstimatedTime(item.estimatedTime || 60);
          setBiblicalRef(item.biblicalRef || '');
          setCatechismRef(item.catechismRef || '');
          setIsAiGenerated(item.isAiGenerated || false);

          const bible = (item.bibleRefs || []).map((r: any) => ({
            id: r.id,
            verseId: r.verseId,
            label: (r.verse?.chapter?.book?.abbreviation || r.verse?.chapter?.book?.name || '') + ' ' + r.verse?.chapter?.number + ':' + r.verse?.number,
          }));
          const catechism = (item.catechismRefs || []).map((r: any) => ({
            id: r.id,
            entryId: r.entryId,
            label: '§' + r.entry?.number,
          }));
          setBibleRefs(bible);
          setCatechismRefs(catechism);
        }
      } catch (e) { console.error(e); }
    })();
  }, [id]);

  const handleAddBibleRef = async (verseId: string, label: string, text: string) => {
    try {
      const result = await addBibleRef({ contentId: contentId, verseId });
      setBibleRefs(prev => [...prev, { id: result.id, verseId, label, text }]);
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };
  const handleRemoveBibleRef = async (refId: string) => {
    try {
      await removeBibleRef({ id: refId });
      setBibleRefs(prev => prev.filter(r => r.id !== refId));
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };
  const handleAddCatechismRef = async (entryId: string, label: string, question: string) => {
    try {
      const result = await addCatechismRef({ contentId: contentId, entryId });
      setCatechismRefs(prev => [...prev, { id: result.id, entryId, label, question }]);
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };
  const handleAddDirectoryRef = async (entryId: string, label: string, content: string) => {
    try {
      const result = await addDirectoryRef({ contentId: contentId, entryId });
      setDirectoryRefs(prev => [...prev, { id: result.id, entryId, label, content }]);
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };
  const handleRemoveDirectoryRef = async (refId: string) => {
    try {
      await removeDirectoryRef({ id: refId });
      setDirectoryRefs(prev => prev.filter(r => r.id !== refId));
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };
  const handleRemoveCatechismRef = async (refId: string) => {
    try {
      await removeCatechismRef({ id: refId });
      setCatechismRefs(prev => prev.filter(r => r.id !== refId));
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
  };

  const handleEnhanceWithAi = async () => {
    setEnhancing(true);
    setAiSuggestions([]);
    try {
      const res = await enhanceContentWithAi({
        title,
        theme: theme || undefined,
        pastoralObjective: pastoralObjective || undefined,
        mainContent: mainContent || undefined,
        activity: dynamic || undefined,
        estimatedTime,
        bibleRefs: bibleRefs.map(r => r.label),
        catechismRefs: catechismRefs.map(r => r.label),
        directoryRefs: directoryRefs.map(r => r.label),
      });
      const e = res.enhanced;
      if (e.title) setTitle(e.title);
      if (e.theme) setTheme(e.theme);
      if (e.pastoralObjective) setPastoralObjective(e.pastoralObjective);
      if (e.openingPrayer && !openingPrayer) setOpeningPrayer(e.openingPrayer);
      if (e.closingPrayer && !closingPrayer) setClosingPrayer(e.closingPrayer);
      if (e.mainContent) setMainContent(e.mainContent);
      if (e.dynamic && !dynamic) setDynamic(e.dynamic);
      if (e.familyTask && !familyTask) setFamilyTask(e.familyTask);
      if (e.estimatedTime) setEstimatedTime(e.estimatedTime);
      if (e.biblicalReading?.reference) setBiblicalRef(e.biblicalReading.reference);
      if (e.suggestions?.length) setAiSuggestions(e.suggestions);
      toast({ title: t('edit_page.success_enhanced'), variant: 'default' });
    } catch (e: any) {
      toast({ title: tc('error'), description: e?.message || t('edit_page.error_enhance'), variant: 'destructive' });
    } finally {
      setEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!title) return;
    setSaving(true);
    try {
      await updateContentItem({
        id: contentId,
        title,
        theme: theme || undefined,
        pastoralObjective: pastoralObjective || undefined,
        openingPrayer: openingPrayer || undefined,
        closingPrayer: closingPrayer || undefined,
        mainContent: mainContent || undefined,
        dynamic: dynamic || undefined,
        activity: activity || undefined,
        familyTask: familyTask || undefined,
        estimatedTime,
        biblicalRef: biblicalRef || undefined,
        catechismRef: catechismRef || undefined,
      });
      toast({ title: t('edit_page.success_saved'), variant: 'default' });
    } catch (e: any) { toast({ title: tc('error'), description: e.message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to={`/app/content-library/${id}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t('edit_page.title')}
              {isAiGenerated && <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> {t('edit_page.ai_badge')}</Badge>}
            </h1>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('create_page.title_required').replace(' *', '')}</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t('theme')}</Label>
              <Input value={theme} onChange={e => setTheme(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>{t('pastoral_objective')}</Label>
            <Input value={pastoralObjective} onChange={e => setPastoralObjective(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>{t('opening_prayer')}</Label>
            <Textarea value={openingPrayer} onChange={e => setOpeningPrayer(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>

          <div>
            <Label>{t('closing_prayer')}</Label>
            <Textarea value={closingPrayer} onChange={e => setClosingPrayer(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('biblical_ref')}</Label>
              <Input value={biblicalRef} onChange={e => setBiblicalRef(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t('edit_page.cic_ref')}</Label>
              <Input value={catechismRef} onChange={e => setCatechismRef(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>{t('edit_page.central_content')}</Label>
            <Textarea value={mainContent} onChange={e => setMainContent(e.target.value)} className="mt-1 min-h-[200px]" />
          </div>

          <div>
            <Label>{t('edit_page.group_dynamic')}</Label>
            <Textarea value={dynamic} onChange={e => setDynamic(e.target.value)} className="mt-1 min-h-[120px]" />
          </div>

          <div>
            <Label>{t('edit_page.additional_activity')}</Label>
            <Textarea value={activity} onChange={e => setActivity(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>

          <div>
            <Label>{t('edit_page.family_task')}</Label>
            <Textarea value={familyTask} onChange={e => setFamilyTask(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>

          <div>
            <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> {t('edit_page.duration_minutes')}</Label>
            <Input type="number" value={estimatedTime} onChange={e => setEstimatedTime(Number(e.target.value))} className="mt-1 w-32" />
          </div>

          <div className="border-t pt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleEnhanceWithAi}
              disabled={enhancing}
              className="gap-2 border-dashed border-2 border-violet-300 dark:border-violet-700 hover:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300"
            >
              {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {enhancing ? t('edit_page.enhancing') : t('edit_page.enhance_ai')}
            </Button>
            {aiSuggestions.length > 0 && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" /> {t('edit_page.ai_suggestions')}
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

          <ReferencePicker
            bibleRefs={bibleRefs}
            catechismRefs={catechismRefs}
            directoryRefs={directoryRefs}
            onAddBible={handleAddBibleRef}
            onRemoveBible={handleRemoveBibleRef}
            onAddCatechism={handleAddCatechismRef}
            onRemoveCatechism={handleRemoveCatechismRef}
            onAddDirectory={handleAddDirectoryRef}
            onRemoveDirectory={handleRemoveDirectoryRef}
          />

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}><Save className="mr-1 h-4 w-4" />{tc('save')}</Button>
            <Button variant="outline" asChild><Link to={`/app/content-library/${id}`}>{tc('cancel')}</Link></Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
