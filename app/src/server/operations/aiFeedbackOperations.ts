/**
 * Submit AI feedback (thumbs up / down) to improve response quality over time.
 */
import { HttpError } from 'wasp/server';

const MAX_PROMPT_CHARS = 4000;
const MAX_RESPONSE_CHARS = 12000;
const MAX_COMMENT_CHARS = 1000;
const RATINGS = ['thumbs_up', 'thumbs_down'] as const;

type Rating = (typeof RATINGS)[number];

function clampText(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

export const submitAiFeedback = async (
  args: { prompt: string; response: string; rating: Rating; comment?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  if (!RATINGS.includes(args?.rating)) {
    throw new HttpError(400, 'Avaliação inválida.');
  }
  const prompt = clampText(args.prompt, MAX_PROMPT_CHARS);
  const response = clampText(args.response, MAX_RESPONSE_CHARS);
  if (!prompt.trim() || !response.trim()) {
    throw new HttpError(400, 'Prompt e resposta são obrigatórios.');
  }

  await context.entities.AiFeedback.create({
    data: {
      userId: context.user.id,
      prompt,
      response,
      rating: args.rating,
      comment: args.comment ? clampText(args.comment, MAX_COMMENT_CHARS) : null,
    },
  });

  return { success: true };
};
