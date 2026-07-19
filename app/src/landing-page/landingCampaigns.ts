export type LandingHeroVisual = "product" | "management" | "ai" | "attendance";

export type LandingCampaignConfig = {
  namespace: "landing" | "landingSistema" | "landingIa" | "landingPresenca";
  campaign: "general" | "management" | "ai" | "attendance";
  path: "/" | "/sistema" | "/ia" | "/presenca";
  promise:
    | "integrated-journey"
    | "coordination"
    | "meeting-preparation"
    | "mobile-attendance";
  heroVisual: LandingHeroVisual;
  demonstration: "integrated" | "dashboard" | "ai-planner" | "attendance-sheet";
  objections: readonly string[];
  cta: { destination: "/signup"; commitment: "7-days-no-card" };
};

export const landingCampaigns = {
  general: {
    namespace: "landing",
    campaign: "general",
    path: "/",
    promise: "integrated-journey",
    heroVisual: "product",
    demonstration: "integrated",
    objections: ["setup-time", "ease-of-use", "data-safety"],
    cta: { destination: "/signup", commitment: "7-days-no-card" },
  },
  management: {
    namespace: "landingSistema",
    campaign: "management",
    path: "/sistema",
    promise: "coordination",
    heroVisual: "management",
    demonstration: "dashboard",
    objections: ["team-adoption", "visibility", "migration"],
    cta: { destination: "/signup", commitment: "7-days-no-card" },
  },
  ai: {
    namespace: "landingIa",
    campaign: "ai",
    path: "/ia",
    promise: "meeting-preparation",
    heroVisual: "ai",
    demonstration: "ai-planner",
    objections: ["human-review", "catholic-references", "time-to-result"],
    cta: { destination: "/signup", commitment: "7-days-no-card" },
  },
  attendance: {
    namespace: "landingPresenca",
    campaign: "attendance",
    path: "/presenca",
    promise: "mobile-attendance",
    heroVisual: "attendance",
    demonstration: "attendance-sheet",
    objections: ["offline-use", "history", "justifications"],
    cta: { destination: "/signup", commitment: "7-days-no-card" },
  },
} as const satisfies Record<string, LandingCampaignConfig>;
