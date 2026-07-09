import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Textarea } from '../../client/components/ui/textarea';
import { Badge } from '../../client/components/ui/badge';
import { Plus, Trash2, Check } from 'lucide-react';
import { useActivityTypes } from '../../i18n/useLabels';

export type ActivityType =
  | 'QUIZ' | 'OPEN_QUESTION' | 'PARTICIPATION_CHECKLIST' | 'GUIDED_REFLECTION'
  | 'GROUP_DYNAMIC' | 'FAMILY_ACTIVITY' | 'BIBLE_READING' | 'MATCHING'
  | 'TASK_WITH_ATTACHMENT' | 'RITE_CELEBRATION';

export const ACTIVITY_TYPE_VALUES: ActivityType[] = [
  'QUIZ', 'OPEN_QUESTION', 'PARTICIPATION_CHECKLIST', 'GUIDED_REFLECTION',
  'GROUP_DYNAMIC', 'FAMILY_ACTIVITY', 'BIBLE_READING', 'MATCHING',
  'TASK_WITH_ATTACHMENT', 'RITE_CELEBRATION',
];

// ─── Data structures per type ─────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ChecklistItem {
  id: string;
  text: string;
}

interface ReflectionPrompt {
  id: string;
  question: string;
}

interface DynamicStep {
  id: string;
  instruction: string;
  duration?: number;
  materials?: string;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface BibleReadingQuestion {
  id: string;
  question: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Props ────────────────────────────────────────────────────────────────

interface ActivityFormProps {
  initialType?: ActivityType;
  initialTitle?: string;
  initialDescription?: string;
  initialPoints?: number;
  initialData?: any;
  onSubmit: (data: {
    title: string;
    type: ActivityType;
    description: string;
    points: number;
    data: any;
  }) => void;
  onCancel: () => void;
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function ActivityForm({
  initialType = 'QUIZ',
  initialTitle = '',
  initialDescription = '',
  initialPoints = 10,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: ActivityFormProps) {
  const { t } = useTranslation('activities');
  const { t: tc } = useTranslation('common');
  const activityTypes = useActivityTypes();
  const [type, setType] = useState<ActivityType>(initialType);
  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDescription);
  const [points, setPoints] = useState(initialPoints);

  // Type-specific state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    initialType === 'QUIZ' && initialData?.questions ? initialData.questions : []
  );
  const [openQuestionText, setOpenQuestionText] = useState(
    initialType === 'OPEN_QUESTION' && initialData?.question ? initialData.question : ''
  );
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialType === 'PARTICIPATION_CHECKLIST' && initialData?.items ? initialData.items : []
  );
  const [reflectionPrompts, setReflectionPrompts] = useState<ReflectionPrompt[]>(
    initialType === 'GUIDED_REFLECTION' && initialData?.prompts ? initialData.prompts : []
  );
  const [reflectionGuide, setReflectionGuide] = useState(
    initialType === 'GUIDED_REFLECTION' && initialData?.guide ? initialData.guide : ''
  );
  const [dynamicSteps, setDynamicSteps] = useState<DynamicStep[]>(
    initialType === 'GROUP_DYNAMIC' && initialData?.steps ? initialData.steps : []
  );
  const [familyTaskText, setFamilyTaskText] = useState(
    initialType === 'FAMILY_ACTIVITY' && initialData?.task ? initialData.task : ''
  );
  const [bibleRef, setBibleRef] = useState(
    initialType === 'BIBLE_READING' && initialData?.reference ? initialData.reference : ''
  );
  const [bibleQuestions, setBibleQuestions] = useState<BibleReadingQuestion[]>(
    initialType === 'BIBLE_READING' && initialData?.questions ? initialData.questions : []
  );
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    initialType === 'MATCHING' && initialData?.pairs ? initialData.pairs : []
  );
  const [taskRequiresUpload, setTaskRequiresUpload] = useState(
    initialType === 'TASK_WITH_ATTACHMENT' && initialData?.requiresUpload ? initialData.requiresUpload : false
  );
  const [riteText, setRiteText] = useState(
    initialType === 'RITE_CELEBRATION' && initialData?.rite ? initialData.rite : ''
  );

  const buildData = () => {
    switch (type) {
      case 'QUIZ': return { questions: quizQuestions };
      case 'OPEN_QUESTION': return { question: openQuestionText };
      case 'PARTICIPATION_CHECKLIST': return { items: checklistItems };
      case 'GUIDED_REFLECTION': return { guide: reflectionGuide, prompts: reflectionPrompts };
      case 'GROUP_DYNAMIC': return { steps: dynamicSteps };
      case 'FAMILY_ACTIVITY': return { task: familyTaskText };
      case 'BIBLE_READING': return { reference: bibleRef, questions: bibleQuestions };
      case 'MATCHING': return { pairs: matchingPairs };
      case 'TASK_WITH_ATTACHMENT': return { requiresUpload: taskRequiresUpload };
      case 'RITE_CELEBRATION': return { rite: riteText };
      default: return {};
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, description: desc.trim(), points, data: buildData() });
  };

  // ── Helpers for sub-forms ───────────────────────────────────────────────

  const addQuizQuestion = () => {
    setQuizQuestions(q => [...q, { id: uid(), question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]);
  };

  const addChecklistItem = () => setChecklistItems(i => [...i, { id: uid(), text: '' }]);
  const addReflectionPrompt = () => setReflectionPrompts(p => [...p, { id: uid(), question: '' }]);
  const addDynamicStep = () => setDynamicSteps(s => [...s, { id: uid(), instruction: '', duration: 5, materials: '' }]);
  const addBibleQuestion = () => setBibleQuestions(q => [...q, { id: uid(), question: '' }]);
  const addMatchingPair = () => setMatchingPairs(p => [...p, { id: uid(), left: '', right: '' }]);

  // ── Render sub-form by type ─────────────────────────────────────────────

  const renderSubForm = () => {
    switch (type) {
      // ── Quiz ──────────────────────────────────────────────────────────
      case 'QUIZ':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.questions_count', { count: quizQuestions.length })}</p>
              <Button size="sm" variant="outline" onClick={addQuizQuestion}><Plus className="h-3 w-3 mr-1"/> {t('form.add_question')}</Button>
            </div>
            {quizQuestions.map((q, qi) => (
              <div key={q.id} className="rounded-sm border border-border/70 bg-white p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{qi + 1}</span>
                  <Input
                    placeholder={t('form.question_text')}
                    value={q.question}
                    onChange={e => setQuizQuestions(prev => prev.map(p => p.id === q.id ? { ...p, question: e.target.value } : p))}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setQuizQuestions(prev => prev.filter(p => p.id !== q.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizQuestions(prev => prev.map(p => p.id === q.id ? { ...p, correctIndex: oi } : p))}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
       q.correctIndex === oi ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground/30'
      }`}
                      >
                        {q.correctIndex === oi ? <Check className="h-3 w-3"/> : <span className="text-overline">{['A','B','C','D'][oi]}</span>}
                      </button>
                      <Input
                        placeholder={t('form.option', { letter: ['A','B','C','D'][oi] })}
                        value={opt}
                        onChange={e => setQuizQuestions(prev => prev.map(p => p.id === q.id ? { ...p, options: p.options.map((o, j) => j === oi ? e.target.value : o) } : p))}
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Input
                  placeholder={t('form.explanation')}
                  value={q.explanation}
                  onChange={e => setQuizQuestions(prev => prev.map(p => p.id === q.id ? { ...p, explanation: e.target.value } : p))}
                  className="text-xs h-8"
                />
              </div>
            ))}
          </div>
        );

      // ── Open Question ─────────────────────────────────────────────────
      case 'OPEN_QUESTION':
        return (
          <div>
            <Textarea
              placeholder={t('form.open_question_placeholder')}
              value={openQuestionText}
              onChange={e => setOpenQuestionText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        );

      // ── Checklist ─────────────────────────────────────────────────────
      case 'PARTICIPATION_CHECKLIST':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.items_count', { count: checklistItems.length })}</p>
              <Button size="sm" variant="outline" onClick={addChecklistItem}><Plus className="h-3 w-3 mr-1"/> {t('form.add_item')}</Button>
            </div>
            {checklistItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder={t('form.checklist_item')}
                  value={item.text}
                  onChange={e => setChecklistItems(prev => prev.map(p => p.id === item.id ? { ...p, text: e.target.value } : p))}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setChecklistItems(prev => prev.filter(p => p.id !== item.id))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        );

      // ── Guided Reflection ─────────────────────────────────────────────
      case 'GUIDED_REFLECTION':
        return (
          <div className="space-y-3">
            <Textarea
              placeholder={t('form.reflection_guide')}
              value={reflectionGuide}
              onChange={e => setReflectionGuide(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.reflection_questions', { count: reflectionPrompts.length })}</p>
              <Button size="sm" variant="outline" onClick={addReflectionPrompt}><Plus className="h-3 w-3 mr-1"/> {t('form.add_question')}</Button>
            </div>
            {reflectionPrompts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder={t('form.reflection_question')}
                  value={p.question}
                  onChange={e => setReflectionPrompts(prev => prev.map(r => r.id === p.id ? { ...r, question: e.target.value } : r))}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setReflectionPrompts(prev => prev.filter(r => r.id !== p.id))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        );

      // ── Group Dynamic ─────────────────────────────────────────────────
      case 'GROUP_DYNAMIC':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.steps_count', { count: dynamicSteps.length })}</p>
              <Button size="sm" variant="outline" onClick={addDynamicStep}><Plus className="h-3 w-3 mr-1"/> {t('form.add_step')}</Button>
            </div>
            {dynamicSteps.map((step, i) => (
              <div key={step.id} className="space-y-2 rounded-sm border border-border/70 bg-white p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-overline">{t('form.step', { number: i + 1 })}</Badge>
                  <Button size="icon" variant="ghost" className="text-destructive ml-auto" onClick={() => setDynamicSteps(prev => prev.filter(s => s.id !== step.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  placeholder={t('form.step_instruction')}
                  value={step.instruction}
                  onChange={e => setDynamicSteps(prev => prev.map(s => s.id === step.id ? { ...s, instruction: e.target.value } : s))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder={t('form.duration_min')}
                    type="number"
                    value={step.duration || ''}
                    onChange={e => setDynamicSteps(prev => prev.map(s => s.id === step.id ? { ...s, duration: Number(e.target.value) } : s))}
                    className="w-24 h-8 text-xs"
                  />
                  <Input
                    placeholder={t('form.materials')}
                    value={step.materials || ''}
                    onChange={e => setDynamicSteps(prev => prev.map(s => s.id === step.id ? { ...s, materials: e.target.value } : s))}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        );

      // ── Family Activity ───────────────────────────────────────────────
      case 'FAMILY_ACTIVITY':
        return (
          <Textarea
            placeholder={t('form.family_placeholder')}
            value={familyTaskText}
            onChange={e => setFamilyTaskText(e.target.value)}
            className="min-h-[120px]"
          />
        );

      // ── Bible Reading ─────────────────────────────────────────────────
      case 'BIBLE_READING':
        return (
          <div className="space-y-3">
            <Input
              placeholder={t('form.bible_ref_placeholder')}
              value={bibleRef}
              onChange={e => setBibleRef(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.questions_count', { count: bibleQuestions.length })}</p>
              <Button size="sm" variant="outline" onClick={addBibleQuestion}><Plus className="h-3 w-3 mr-1"/> {t('form.add_question')}</Button>
            </div>
            {bibleQuestions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder={t('form.reading_question')}
                  value={q.question}
                  onChange={e => setBibleQuestions(prev => prev.map(p => p.id === q.id ? { ...p, question: e.target.value } : p))}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setBibleQuestions(prev => prev.filter(p => p.id !== q.id))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        );

      // ── Matching ──────────────────────────────────────────────────────
      case 'MATCHING':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('form.pairs_count', { count: matchingPairs.length })}</p>
              <Button size="sm" variant="outline" onClick={addMatchingPair}><Plus className="h-3 w-3 mr-1"/> {t('form.add_pair')}</Button>
            </div>
            {matchingPairs.map((pair, i) => (
              <div key={pair.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder={t('form.left')}
                  value={pair.left}
                  onChange={e => setMatchingPairs(prev => prev.map(p => p.id === pair.id ? { ...p, left: e.target.value } : p))}
                  className="flex-1 h-8 text-sm"
                />
                <span className="text-muted-foreground">↔</span>
                <Input
                  placeholder={t('form.right')}
                  value={pair.right}
                  onChange={e => setMatchingPairs(prev => prev.map(p => p.id === pair.id ? { ...p, right: e.target.value } : p))}
                  className="flex-1 h-8 text-sm"
                />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setMatchingPairs(prev => prev.filter(p => p.id !== pair.id))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        );

      // ── Task with Attachment ──────────────────────────────────────────
      case 'TASK_WITH_ATTACHMENT':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('form.task_hint')}</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-border/70 p-3 transition-colors hover:bg-muted/20">
              <input
                type="checkbox"
                checked={taskRequiresUpload}
                onChange={e => setTaskRequiresUpload(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">{t('form.require_upload')}</span>
            </label>
          </div>
        );

      // ── Rite Celebration ──────────────────────────────────────────────
      case 'RITE_CELEBRATION':
        return (
          <Textarea
            placeholder={t('form.rite_placeholder')}
            value={riteText}
            onChange={e => setRiteText(e.target.value)}
            className="min-h-[150px]"
          />
        );

      default:
        return null;
    }
  };

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 rounded-sm border border-dashed border-border/70 bg-muted/20 p-5">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {initialTitle ? t('form.edit_title') : t('form.new_title')}
      </h3>

      <div>
        <label className="text-xs font-medium">{t('form.type')}</label>
        <select
          value={type}
          onChange={e => setType(e.target.value as ActivityType)}
          className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm mt-1"
        >
          {activityTypes.map(at => (
            <option key={at.value} value={at.value}>{at.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium">{t('form.title')}</label>
        <Input
          placeholder={t('form.title_placeholder')}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-medium">{t('form.description')}</label>
        <Textarea
          placeholder={t('form.description_placeholder')}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="min-h-[60px]"
        />
      </div>

      <div>
        <label className="text-xs font-medium">{t('form.points')}</label>
        <Input
          type="number"
          value={points}
          onChange={e => setPoints(Number(e.target.value))}
          className="w-24"
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
          {t('form.config', { type: activityTypes.find(at => at.value === type)?.label })}
        </p>
        {renderSubForm()}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={!title.trim()}>{submitLabel || tc('save')}</Button>
        <Button variant="outline" onClick={onCancel}>{tc('cancel')}</Button>
      </div>
    </div>
  );
}
