import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Textarea } from '../../client/components/ui/textarea';
import { Badge } from '../../client/components/ui/badge';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';

export type ActivityType =
  | 'QUIZ' | 'OPEN_QUESTION' | 'PARTICIPATION_CHECKLIST' | 'GUIDED_REFLECTION'
  | 'GROUP_DYNAMIC' | 'FAMILY_ACTIVITY' | 'BIBLE_READING' | 'MATCHING'
  | 'TASK_WITH_ATTACHMENT' | 'RITE_CELEBRATION';

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'OPEN_QUESTION', label: 'Pergunta aberta' },
  { value: 'PARTICIPATION_CHECKLIST', label: 'Checklist' },
  { value: 'GUIDED_REFLECTION', label: 'Reflexão guiada' },
  { value: 'GROUP_DYNAMIC', label: 'Dinâmica de grupo' },
  { value: 'FAMILY_ACTIVITY', label: 'Atividade em família' },
  { value: 'BIBLE_READING', label: 'Leitura bíblica' },
  { value: 'MATCHING', label: 'Associação' },
  { value: 'TASK_WITH_ATTACHMENT', label: 'Tarefa com anexo' },
  { value: 'RITE_CELEBRATION', label: 'Celebração / Rito' },
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
  submitLabel = 'Salvar',
}: ActivityFormProps) {
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
              <p className="text-sm font-medium">{quizQuestions.length} pergunta(s)</p>
              <Button size="sm" variant="outline" onClick={addQuizQuestion}><Plus className="h-3 w-3 mr-1"/> Pergunta</Button>
            </div>
            {quizQuestions.map((q, qi) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">#{qi + 1}</span>
                  <Input
                    placeholder="Texto da pergunta"
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
                        {q.correctIndex === oi ? <Check className="h-3 w-3"/> : <span className="text-[10px]">{['A','B','C','D'][oi]}</span>}
                      </button>
                      <Input
                        placeholder={`Opção ${['A','B','C','D'][oi]}`}
                        value={opt}
                        onChange={e => setQuizQuestions(prev => prev.map(p => p.id === q.id ? { ...p, options: p.options.map((o, j) => j === oi ? e.target.value : o) } : p))}
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Input
                  placeholder="Explicação da resposta correta (aparece após responder)"
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
              placeholder="Digite a pergunta que o catequizando deve responder..."
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
              <p className="text-sm font-medium">{checklistItems.length} item(ns)</p>
              <Button size="sm" variant="outline" onClick={addChecklistItem}><Plus className="h-3 w-3 mr-1"/> Item</Button>
            </div>
            {checklistItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder="Item do checklist"
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
              placeholder="Texto guia da reflexão (contexto, tema, introdução)..."
              value={reflectionGuide}
              onChange={e => setReflectionGuide(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{reflectionPrompts.length} pergunta(s) para reflexão</p>
              <Button size="sm" variant="outline" onClick={addReflectionPrompt}><Plus className="h-3 w-3 mr-1"/> Pergunta</Button>
            </div>
            {reflectionPrompts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder="Pergunta para reflexão"
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
              <p className="text-sm font-medium">{dynamicSteps.length} passo(s)</p>
              <Button size="sm" variant="outline" onClick={addDynamicStep}><Plus className="h-3 w-3 mr-1"/> Passo</Button>
            </div>
            {dynamicSteps.map((step, i) => (
              <div key={step.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Passo {i + 1}</Badge>
                  <Button size="icon" variant="ghost" className="text-destructive ml-auto" onClick={() => setDynamicSteps(prev => prev.filter(s => s.id !== step.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  placeholder="Instrução do passo"
                  value={step.instruction}
                  onChange={e => setDynamicSteps(prev => prev.map(s => s.id === step.id ? { ...s, instruction: e.target.value } : s))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Duração (min)"
                    type="number"
                    value={step.duration || ''}
                    onChange={e => setDynamicSteps(prev => prev.map(s => s.id === step.id ? { ...s, duration: Number(e.target.value) } : s))}
                    className="w-24 h-8 text-xs"
                  />
                  <Input
                    placeholder="Materiais necessários"
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
            placeholder="Descreva a atividade para a família fazer em casa..."
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
              placeholder="Referência bíblica (ex: Jo 6,51-58)"
              value={bibleRef}
              onChange={e => setBibleRef(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{bibleQuestions.length} pergunta(s)</p>
              <Button size="sm" variant="outline" onClick={addBibleQuestion}><Plus className="h-3 w-3 mr-1"/> Pergunta</Button>
            </div>
            {bibleQuestions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder="Pergunta sobre a leitura"
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
              <p className="text-sm font-medium">{matchingPairs.length} par(es)</p>
              <Button size="sm" variant="outline" onClick={addMatchingPair}><Plus className="h-3 w-3 mr-1"/> Par</Button>
            </div>
            {matchingPairs.map((pair, i) => (
              <div key={pair.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  placeholder="Esquerda"
                  value={pair.left}
                  onChange={e => setMatchingPairs(prev => prev.map(p => p.id === pair.id ? { ...p, left: e.target.value } : p))}
                  className="flex-1 h-8 text-sm"
                />
                <span className="text-muted-foreground">↔</span>
                <Input
                  placeholder="Direita"
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
            <p className="text-sm text-muted-foreground">A descrição da tarefa vai no campo "Descrição" acima.</p>
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                checked={taskRequiresUpload}
                onChange={e => setTaskRequiresUpload(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Exigir upload de arquivo (foto, PDF, etc.)</span>
            </label>
          </div>
        );

      // ── Rite Celebration ──────────────────────────────────────────────
      case 'RITE_CELEBRATION':
        return (
          <Textarea
            placeholder="Descreva o rito ou celebração (texto litúrgico, rubricas, orações)..."
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
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {initialTitle ? 'Editar atividade' : 'Nova atividade'}
      </h3>

      {/* Tipo */}
      <div>
        <label className="text-xs font-medium">Tipo</label>
        <select
          value={type}
          onChange={e => setType(e.target.value as ActivityType)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
        >
          {ACTIVITY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Título */}
      <div>
        <label className="text-xs font-medium">Título</label>
        <Input
          placeholder="Nome da atividade"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="text-xs font-medium">Descrição / Instruções</label>
        <Textarea
          placeholder="Instruções para o catequista aplicar esta atividade..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="min-h-[60px]"
        />
      </div>

      {/* Pontos */}
      <div>
        <label className="text-xs font-medium">Pontos</label>
        <Input
          type="number"
          value={points}
          onChange={e => setPoints(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {/* Sub-formulário específico */}
      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
          Configuração: {ACTIVITY_TYPES.find(t => t.value === type)?.label}
        </p>
        {renderSubForm()}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={!title.trim()}>{submitLabel}</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
