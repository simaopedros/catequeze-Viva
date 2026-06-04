import * as z from 'zod';

/**
 * AI environment variables — all optional.
 * At least one provider must be configured for AI features to work.
 */
export const aiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'deepseek', 'openrouter']).optional(),
  AI_MODEL: z.string().optional(),
});
