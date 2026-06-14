import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Textarea } from '../../client/components/ui/textarea';
import { ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { ReferencePicker } from '../../client/components/ReferencePicker';
import { createContentItem, addBibleRef, addCatechismRef, addDirectoryRef } from 'wasp/client/operations';
import { enhanceContentWithAi } from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';
import { createContentSchema, type CreateContentValues } from '../../client/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../client/components/ui/form';

export default function CreateContentPage() {
  const { t } = useTranslation('content');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [enhancing, setEnhancing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const [bibleRefs, setBibleRefs] = useState<{ verseId: string; label: string; text?: string }[]>([]);
  const [catechismRefs, setCatechismRefs] = useState<{ entryId: string; label: string; question?: string }[]>([]);
  const [directoryRefs, setDirectoryRefs] = useState<{ entryId: string; label: string; content?: string }[]>([]);

  const form = useForm<CreateContentValues>({
    resolver: zodResolver(createContentSchema) as any,
    defaultValues: {
      title: '',
      theme: '',
      pastoralObjective: '',
      mainContent: '',
      activity: '',
      estimatedTime: 60,
      tags: '',
    },
  });

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
    const title = form.getValues('title');
    if (!title?.trim()) {
      form.setError('title', { message: t('create_page.error_title_required') });
      return;
    }
    setEnhancing(true);
    setAiSuggestions([]);
    try {
      const res = await enhanceContentWithAi({
        title,
        theme: form.getValues('theme') || undefined,
        pastoralObjective: form.getValues('pastoralObjective') || undefined,
        mainContent: form.getValues('mainContent') || undefined,
        activity: form.getValues('activity') || undefined,
        estimatedTime: form.getValues('estimatedTime'),
        bibleRefs: bibleRefs.map(r => r.label),
        catechismRefs: catechismRefs.map(r => r.label),
        directoryRefs: directoryRefs.map(r => r.label),
      });

      const e = res.enhanced;
      if (e.title) form.setValue('title', e.title);
      if (e.theme) form.setValue('theme', e.theme);
      if (e.pastoralObjective) form.setValue('pastoralObjective', e.pastoralObjective);
      if (e.mainContent) form.setValue('mainContent', e.mainContent);
      if (e.dynamic && !form.getValues('activity')) form.setValue('activity', e.dynamic);
      if (e.familyTask) {
        const current = form.getValues('activity');
        form.setValue('activity', current ? current + '\n\n' + t('create_page.home_task_prefix') + e.familyTask : t('create_page.home_task_prefix') + e.familyTask);
      }
      if (e.estimatedTime) form.setValue('estimatedTime', e.estimatedTime);
      if (e.suggestions?.length) setAiSuggestions(e.suggestions);
    } catch (e: any) {
      form.setError('root', { message: e?.message || t('create_page.error_enhance') });
    } finally {
      setEnhancing(false);
    }
  };

  const onSubmit = async (values: CreateContentValues) => {
    try {
      const item = await createContentItem({
        title: values.title,
        theme: values.theme || undefined,
        pastoralObjective: values.pastoralObjective || undefined,
        mainContent: values.mainContent,
        activity: values.activity || undefined,
        estimatedTime: values.estimatedTime,
        tags: values.tags || undefined,
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
      form.setError('root', { message: e.message || t('create_page.error_create') });
    }
  };

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

        {form.formState.errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('create_page.title_required')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('create_page.title_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('theme')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('create_page.theme_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pastoralObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pastoral_objective')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('create_page.objective_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('create_page.main_content_required')}</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" placeholder={t('create_page.main_content_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('create_page.activity_dynamic')}</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" placeholder={t('create_page.activity_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_page.estimated_time_min')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tags')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('create_page.tags_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? tc('saving') : t('create_page.create_content')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/app/content-library">{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppShell>
  );
}
