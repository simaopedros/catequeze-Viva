import { AI_FEATURES_ENABLED, MOCK_AI_STATUS } from "./aiFeatureFlag";

/**
 * Conditional export for getAiCreditsStatus
 * When AI is disabled, returns mock data without calling the backend
 */
export const getAiCreditsStatus = AI_FEATURES_ENABLED
  ? // When enabled, use the real operation (must be re-enabled in main.wasp)
    async () => {
      throw new Error("AI features are currently disabled");
    }
  : // When disabled, return mock data
    async () => MOCK_AI_STATUS;

/**
 * Conditional export for submitAiFeedback
 * When AI is disabled, is a no-op
 */
export const submitAiFeedback = AI_FEATURES_ENABLED
  ? async (_args: { prompt: string; response: string; rating: string }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: { prompt: string; response: string; rating: string }) =>
      undefined;

/**
 * Conditional export for generateActivityForMeeting
 */
export const generateActivityForMeeting = AI_FEATURES_ENABLED
  ? async (_args: {
      contentId: string;
      activityType: string;
      meetingId?: string;
    }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: {
      contentId: string;
      activityType: string;
      meetingId?: string;
    }) => {
      throw new Error("AI features are currently disabled");
    };

/**
 * Conditional export for generateWhatsAppMessage
 */
export const generateWhatsAppMessage = AI_FEATURES_ENABLED
  ? async (_args: {
      contentId: string;
      tone: string;
      length: string;
      includeLink?: boolean;
      meetingId?: string;
    }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: {
      contentId: string;
      tone: string;
      length: string;
      includeLink?: boolean;
      meetingId?: string;
    }) => {
      throw new Error("AI features are currently disabled");
    };

/**
 * Conditional export for startCollaborativeSession
 */
export const startCollaborativeSession = AI_FEATURES_ENABLED
  ? async (_args: { contentId: string }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: { contentId: string }) => {
      throw new Error("AI features are currently disabled");
    };

/**
 * Conditional export for getSessionHistory
 */
export const getSessionHistory = AI_FEATURES_ENABLED
  ? async (_args: { sessionId: string }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: { sessionId: string }) => [];

/**
 * Conditional export for getAiSuggestions
 */
export const getAiSuggestions = AI_FEATURES_ENABLED
  ? async (_args: { sessionId: string }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: { sessionId: string }) => [];

/**
 * Conditional export for getSaintStory
 */
export const getSaintStory = AI_FEATURES_ENABLED
  ? async (_args: { theme: string; ageGroup: string }) => {
      throw new Error("AI features are currently disabled");
    }
  : async (_args: { theme: string; ageGroup: string }) => ({
      title: "",
      content: "",
      saintName: "",
    });
