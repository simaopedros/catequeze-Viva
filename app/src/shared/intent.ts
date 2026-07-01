/**
 * Canonical AI intent types for the Catequese Viva platform.
 *
 * Each intent maps to one of the two AI surfaces:
 * - "Copiloto de Conteúdo" (content copilot): create_meeting, improve_content, generate_activity, generate_whatsapp
 * - "Assistente Teológico" (theological assistant): ask_theology
 *
 * ─── Operation → Intent Mapping ───────────────────────────────────────────
 *
 * Intent               | Primary Operation(s)           | Surface
 * ---------------------|-------------------------------|--------------------
 * create_meeting       | startCollaborativeSession      | Copiloto (hub)
 * improve_content      | enhanceContentWithAi (inline)  | Copiloto (hub)
 *                      | or startCollaborativeSession   |
 * generate_activity    | generateActivityForMeeting     | Copiloto (hub)
 *                      | or startCollaborativeSession   |
 * generate_whatsapp    | generateWhatsAppMessage        | Copiloto (hub)
 *                      | or startCollaborativeSession   |
 * ask_theology         | chatWithAi (stream)            | Assistente (widget)
 *
 * Inline operations (enhanceContentWithAi, generateActivityForMeeting,
 * generateWhatsAppMessage) are synchronous/single-shot and kept for quick
 * actions. Full collaborative flows route through startCollaborativeSession
 * in the hub workspace.
 */
export const AI_INTENTS = [
  'create_meeting',
  'improve_content',
  'generate_activity',
  'generate_whatsapp',
  'ask_theology',
] as const;

export type AiIntent = (typeof AI_INTENTS)[number];

/** Maps URL `mode` param to canonical AiIntent */
export function modeToIntent(mode: string, subIntent?: string | null): AiIntent {
  switch (mode) {
    case 'create-meeting':
      return 'create_meeting';
    case 'improve-content':
      return 'improve_content';
    case 'generate-activity':
      return 'generate_activity';
    case 'generate-whatsapp':
      return 'generate_whatsapp';
    // Legacy compat — kept for existing deep-links; hub no longer generates this
    case 'support':
      return subIntent === 'whatsapp' ? 'generate_whatsapp' : 'generate_activity';
    case 'ask':
      return 'ask_theology';
    default:
      return 'create_meeting';
  }
}

/** Maps URL mode/sub-intent to the most specific hub label key for UI titles. */
export function modeToHubLabelKey(mode: string, subIntent?: string | null): string {
  switch (mode) {
    case 'create-meeting':
      return 'hub.create_meeting';
    case 'improve-content':
      return subIntent === 'adapt' ? 'hub.existing_adapt' : 'hub.existing_improve';
    case 'generate-activity':
      return 'hub.existing_activity';
    case 'generate-whatsapp':
      return 'hub.existing_whatsapp';
    case 'support':
      return subIntent === 'whatsapp' ? 'hub.existing_whatsapp' : 'hub.existing_activity';
    case 'ask':
      return 'hub.ask';
    default:
      return 'hub.create_meeting';
  }
}

/** Human-readable labels for intents */
export const INTENT_LABELS: Record<AiIntent, string> = {
  create_meeting: 'Criar encontro',
  improve_content: 'Melhorar conteúdo',
  generate_activity: 'Gerar atividade',
  generate_whatsapp: 'Gerar WhatsApp',
  ask_theology: 'Consultar assistente',
};

// ─── Intent categories ─────────────────────────────────────────────────────

export type IntentCategory = 'create' | 'improve' | 'support' | 'ask';

export function intentCategory(intent: AiIntent): IntentCategory {
  switch (intent) {
    case 'create_meeting':
      return 'create';
    case 'improve_content':
      return 'improve';
    case 'generate_activity':
    case 'generate_whatsapp':
      return 'support';
    case 'ask_theology':
      return 'ask';
  }
}

export function isCreateIntent(i: AiIntent) { return intentCategory(i) === 'create'; }
export function isImproveIntent(i: AiIntent) { return intentCategory(i) === 'improve'; }
export function isSupportIntent(i: AiIntent) { return intentCategory(i) === 'support'; }

// ─── Session context (passed from URL → context → backend) ──────────────────

export interface SessionContext {
  intent: AiIntent;
  theme: string;
  ageGroup: string;
  duration?: number;
  approach?: string;
  manualCreation?: boolean;
  /** ID of existing content to improve (improve_content) */
  contentId?: string | null;
  /** ID of meeting to generate support for (generate_activity / generate_whatsapp) */
  meetingId?: string | null;
  /** Source page that originated the session */
  source?: 'library' | 'meetings' | 'content_detail' | 'content_edit' | 'widget';
  /** For improve_content: true = update original, false/undefined = create copy */
  applyToOriginal?: boolean;
}
