/**
 * Submit AI feedback (thumbs up / down) to improve response quality over time.
 */
export const submitAiFeedback = async (
  args: { prompt: string; response: string; rating: 'thumbs_up' | 'thumbs_down'; comment?: string },
  context: any,
) => {
  if (!context.user) return { success: false };

  await context.entities.AiFeedback.create({
    data: {
      userId: context.user.id,
      prompt: args.prompt,
      response: args.response,
      rating: args.rating,
      comment: args.comment || null,
    },
  });

  return { success: true };
};
