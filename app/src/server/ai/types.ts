/**
 * Shared types for AI operations.
 */

export type AiProvider = 'openai' | 'deepseek' | 'openrouter';

export interface AiModelConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/** Parameters the catechist fills in to generate a meeting */
export interface MeetingGeneratorInput {
  theme: string;
  ageGroup: string;   // e.g. 'Pre-catequese: 6-8 anos'
  duration: number;   // minutes
  approach: string;   // e.g. 'Mais dinamica/ludica'
}

/** Structured output from the AI for a full meeting */
export interface GeneratedMeeting {
  title: string;
  theme: string;
  pastoralObjective: string;
  openingPrayer: string;
  biblicalReading: {
    reference: string;    // e.g. 'Jo 6,51-58'
    text: string;         // actual verse text
    explanation: string;  // simple explanation adapted to age
  };
  mainContent: string;
  dynamic: string;
  familyTask: string;
  closingPrayer: string;
  catechismRefs: Array<{ number: number; summary: string }>;
  bibleRefs: Array<{ book: string; chapter: number; verse: number; text: string }>;
  estimatedTime: number;
}

export interface AnnualPlanningInput {
  stageName: string;       // e.g. 'Catequese 1o Ano'
  startDate: string;
  endDate: string;
  weekDays: string[];      // e.g. ['sabado']
  skipDates: string[];     // holidays to skip
}

export interface GeneratedMeetingPlan {
  date: string;
  title: string;
  theme: string;
  liturgicalSeason: string;
  goals: string;
}
