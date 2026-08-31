import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  computeTrialClock,
  isLifecycleAudience,
  isPaidLifecycleUser,
  resolveCampaignCtaPath,
  selectLifecycleCampaign,
  type SelectCampaignInput,
} from "../server/lifecycle/selectCampaign";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../server/lifecycle/unsubscribeToken";
import { interpolate, resolveCampaignCopy } from "../server/lifecycle/copy";
import {
  escapeHtml,
  renderLifecycleEmailHtml,
} from "../server/lifecycle/templates";

function baseInput(
  overrides: Partial<SelectCampaignInput> = {},
): SelectCampaignInput {
  return {
    isEligibleAudience: true,
    optedOut: false,
    isPaid: false,
    alreadySentToday: false,
    alreadySent: [],
    daysSinceSignup: 1,
    daysLeft: 6,
    expiredDays: null,
    phase: "trialing",
    hasClasses: false,
    hasPeople: false,
    firstValueReached: false,
    ...overrides,
  };
}

describe("isLifecycleAudience", () => {
  it("rejects missing email, opt-out, paid, and admin", () => {
    const base = {
      email: "a@b.com",
      optedOut: false,
      isPaid: false,
      membershipRoles: [] as string[],
      ownsPersonalParish: false,
    };
    expect(isLifecycleAudience(base)).toBe(true);
    expect(isLifecycleAudience({ ...base, email: null })).toBe(false);
    expect(isLifecycleAudience({ ...base, optedOut: true })).toBe(false);
    expect(isLifecycleAudience({ ...base, isPaid: true })).toBe(false);
    expect(isLifecycleAudience({ ...base, isAdmin: true })).toBe(false);
  });

  it("includes personal owners and empty memberships", () => {
    expect(
      isLifecycleAudience({
        email: "a@b.com",
        optedOut: false,
        isPaid: false,
        membershipRoles: ["PERSONAL_OWNER"],
        ownsPersonalParish: false,
      }),
    ).toBe(true);
    expect(
      isLifecycleAudience({
        email: "a@b.com",
        optedOut: false,
        isPaid: false,
        membershipRoles: ["LEAD_CATECHIST"],
        ownsPersonalParish: true,
      }),
    ).toBe(true);
  });

  it("excludes family-only and invited staff without a personal workspace", () => {
    expect(
      isLifecycleAudience({
        email: "a@b.com",
        optedOut: false,
        isPaid: false,
        membershipRoles: ["GUARDIAN"],
        ownsPersonalParish: false,
      }),
    ).toBe(false);
    expect(
      isLifecycleAudience({
        email: "a@b.com",
        optedOut: false,
        isPaid: false,
        membershipRoles: ["LEAD_CATECHIST"],
        ownsPersonalParish: false,
      }),
    ).toBe(false);
  });
});

describe("isPaidLifecycleUser", () => {
  it("treats Stripe customer or active-like status as paid", () => {
    expect(isPaidLifecycleUser({ paymentProcessorUserId: "cus_1" })).toBe(true);
    expect(isPaidLifecycleUser({ subscriptionStatus: "active" })).toBe(true);
    expect(isPaidLifecycleUser({ subscriptionStatus: "trialing" })).toBe(false);
    expect(isPaidLifecycleUser({ subscriptionStatus: "deleted" })).toBe(false);
  });
});

describe("computeTrialClock", () => {
  it("uses calendar days for D-3 / D-1 and exact ms for expiry", () => {
    const created = new Date("2026-08-24T15:00:00");
    const fridayMorning = new Date("2026-08-28T07:05:00");
    const clock = computeTrialClock(created, fridayMorning, 7);
    expect(clock.phase).toBe("trialing");
    expect(clock.daysLeft).toBe(3);
    expect(clock.daysSinceSignup).toBe(4);

    const afterEnd = new Date("2026-08-31T15:00:00");
    const expired = computeTrialClock(created, afterEnd, 7);
    expect(expired.phase).toBe("expired");
    expect(expired.expiredDays).toBe(0);
  });

  it("counts win-back D+1 the next calendar day after expiry", () => {
    const created = new Date("2026-08-24T15:00:00");
    const tuesday = new Date("2026-09-01T07:05:00");
    const clock = computeTrialClock(created, tuesday, 7);
    expect(clock.phase).toBe("expired");
    expect(clock.expiredDays).toBe(1);
  });
});

describe("selectLifecycleCampaign", () => {
  it("skips signup day before 24h calendar rollover", () => {
    expect(
      selectLifecycleCampaign(baseInput({ daysSinceSignup: 0, daysLeft: 7 })),
    ).toBeNull();
  });

  it("sends create-class when there is no class", () => {
    expect(selectLifecycleCampaign(baseInput())).toBe("activate_create_class");
  });

  it("sends add-people after a class exists", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({ hasClasses: true, hasPeople: false }),
      ),
    ).toBe("activate_add_people");
  });

  it("sends first action after people exist", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({
          hasClasses: true,
          hasPeople: true,
          firstValueReached: false,
        }),
      ),
    ).toBe("activate_first_action");
  });

  it("sends convert_after_value after first value", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({
          hasClasses: true,
          hasPeople: true,
          firstValueReached: true,
        }),
      ),
    ).toBe("convert_after_value");
  });

  it("gives D-1 priority over activation", () => {
    expect(
      selectLifecycleCampaign(baseInput({ daysLeft: 1, daysSinceSignup: 6 })),
    ).toBe("trial_d1");
  });

  it("gives D-3 priority over activation", () => {
    expect(
      selectLifecycleCampaign(baseInput({ daysLeft: 3, daysSinceSignup: 4 })),
    ).toBe("trial_d3");
  });

  it("does not send two campaigns when already sent today", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({ daysLeft: 1, alreadySentToday: true }),
      ),
    ).toBeNull();
  });

  it("falls through after a campaign was already sent", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({
          daysLeft: 6,
          hasClasses: false,
          alreadySent: ["activate_create_class"],
        }),
      ),
    ).toBeNull();
  });

  it("sends win-back on D+1 / D+3 / D+7 after expiry", () => {
    expect(
      selectLifecycleCampaign(
        baseInput({
          phase: "expired",
          daysLeft: null,
          expiredDays: 1,
          daysSinceSignup: 8,
        }),
      ),
    ).toBe("winback_d1");
    expect(
      selectLifecycleCampaign(
        baseInput({
          phase: "expired",
          daysLeft: null,
          expiredDays: 3,
          daysSinceSignup: 10,
        }),
      ),
    ).toBe("winback_d3");
    expect(
      selectLifecycleCampaign(
        baseInput({
          phase: "expired",
          daysLeft: null,
          expiredDays: 7,
          daysSinceSignup: 14,
        }),
      ),
    ).toBe("winback_d7");
    expect(
      selectLifecycleCampaign(
        baseInput({
          phase: "expired",
          daysLeft: null,
          expiredDays: 2,
          daysSinceSignup: 9,
        }),
      ),
    ).toBeNull();
  });

  it("returns null for ineligible, opted-out, or paid users", () => {
    expect(
      selectLifecycleCampaign(baseInput({ isEligibleAudience: false })),
    ).toBeNull();
    expect(
      selectLifecycleCampaign(baseInput({ optedOut: true, daysLeft: 1 })),
    ).toBeNull();
    expect(
      selectLifecycleCampaign(baseInput({ isPaid: true, daysLeft: 1 })),
    ).toBeNull();
  });
});

describe("resolveCampaignCtaPath", () => {
  it("points activation and D-3 without value at the next step", () => {
    expect(
      resolveCampaignCtaPath("activate_create_class", {
        hasClasses: false,
        hasPeople: false,
        firstValueReached: false,
      }),
    ).toBe("/app/classes/new");
    expect(
      resolveCampaignCtaPath("activate_add_people", {
        hasClasses: true,
        hasPeople: false,
        firstValueReached: false,
        firstClassId: "c1",
      }),
    ).toBe("/app/classes/c1");
    expect(
      resolveCampaignCtaPath("trial_d3", {
        hasClasses: true,
        hasPeople: true,
        firstValueReached: false,
        firstClassId: "c1",
      }),
    ).toBe("/app/classes/c1/attendance");
    expect(
      resolveCampaignCtaPath("trial_d1", {
        hasClasses: true,
        hasPeople: true,
        firstValueReached: true,
        firstClassId: "c1",
      }),
    ).toBe("/app/billing");
  });
});

describe("unsubscribe token", () => {
  it("round-trips and rejects tampering", () => {
    const secret = "test-secret-lifecycle";
    const token = createUnsubscribeToken("user-1", secret);
    expect(verifyUnsubscribeToken(token, secret)).toBe("user-1");
    expect(verifyUnsubscribeToken(token, "other")).toBeNull();
    expect(verifyUnsubscribeToken(token.slice(0, -1) + "x", secret)).toBeNull();
    expect(verifyUnsubscribeToken("", secret)).toBeNull();
  });
});

describe("campaign copy", () => {
  it("interpolates vars and picks trial body by activation state", () => {
    expect(interpolate("Olá, {{name}}", { name: "Maria" })).toBe("Olá, Maria");
    const noClass = resolveCampaignCopy(
      "trial_d3",
      "pt-BR",
      { hasClasses: false, hasPeople: false, firstValueReached: false },
      {
        name: "Maria",
        className: "",
        trialEndsAt: "03/09/2026",
        price: "R$ 9,90",
      },
    );
    expect(noClass.subject).toContain("3 dias");
    expect(noClass.body).toContain("Maria");
    expect(noClass.body).toMatch(/turma/i);
    expect(noClass.cta).toBe("Continuar agora");

    const valued = resolveCampaignCopy(
      "trial_d1",
      "pt-BR",
      { hasClasses: true, hasPeople: true, firstValueReached: true },
      {
        name: "Maria",
        className: "Crisma",
        trialEndsAt: "03/09/2026",
        price: "R$ 9,90",
      },
    );
    expect(valued.cta).toBe("Assinar agora");
    expect(valued.body).toContain("R$ 9,90");
  });

  it("escapes HTML in templates", () => {
    expect(escapeHtml("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    const html = renderLifecycleEmailHtml({
      heading: "Olá",
      body: "Crie a turma",
      ctaLabel: "Criar",
      ctaUrl: "https://catechis.app/app/classes/new",
      footerReason: "motivo",
      unsubscribeLabel: "sair",
      unsubscribeUrl:
        "https://catechis.app/api/lifecycle/unsubscribe?token=abc",
    });
    expect(html).toContain("Criar");
    expect(html).toContain("/api/lifecycle/unsubscribe");
    expect(html).toContain("Catequese Viva");
  });
});

describe("calendarDaysBetween", () => {
  it("ignores time of day", () => {
    expect(
      calendarDaysBetween(
        new Date("2026-08-24T23:00:00"),
        new Date("2026-08-25T01:00:00"),
      ),
    ).toBe(1);
  });
});
