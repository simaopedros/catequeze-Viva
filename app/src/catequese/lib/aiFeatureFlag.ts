/**
 * Feature flag to control AI-powered features during launch phase.
 * When false, AI operations will be disabled at runtime.
 */
export const AI_FEATURES_ENABLED = false;

/**
 * Mock AI credits status for when AI features are disabled
 */
export const MOCK_AI_STATUS = {
  hasAiAccess: false,
  creditsLeft: 0,
  monthlyAllowance: 0,
  dailyLimit: 0,
  canUseToday: false,
};
