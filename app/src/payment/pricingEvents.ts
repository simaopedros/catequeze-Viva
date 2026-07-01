import { PRICING_VERSION } from "../shared/pricing";

interface TrackPricingEventArgs {
  userId?: string | null;
  event: string;
  sessionId?: string | null;
  fromPlan?: string | null;
  toPlan?: string | null;
  processor?: string | null;
  interval?: string | null;
  pricingVersion?: number | null;
}

export async function trackPricingEvent(
  context: any,
  args: TrackPricingEventArgs,
): Promise<void> {
  try {
    await (context.entities as any).PricingEvent.create({
      data: {
        userId: args.userId ?? null,
        event: args.event,
        sessionId: args.sessionId ?? null,
        fromPlan: args.fromPlan ?? null,
        toPlan: args.toPlan ?? null,
        processor: args.processor ?? null,
        interval: args.interval ?? null,
        pricingVersion: args.pricingVersion ?? PRICING_VERSION,
      },
    });
  } catch {
    // Non-critical — don't block checkout or webhook processing
  }
}