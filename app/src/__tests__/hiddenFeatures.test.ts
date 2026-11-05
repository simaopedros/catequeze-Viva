import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HIDDEN_FEATURE_KEYS,
  HIDDEN_FEATURES,
  featureForPath,
  filterHiddenNavItems,
  isFeatureHidden,
  isHiddenFeaturePath,
  shouldRedirectHiddenAppPath,
  shouldShowConfiguredNavItem,
} from "../shared/hiddenFeatures";
import { filterLaunchHidden, getVisibleNavigation } from "../shared/navigation";

const KEPT_PATHS = [
  "/app/classes",
  "/app/classes/turma-1",
  "/app/classes/turma-1/meetings",
  "/app/meetings/encontro-1",
  "/app/classes/turma-1/attendance",
  "/app/catechumens",
  "/app/catechumens/aluno-1",
  "/app/families",
  "/app/families/familia-1",
  "/app/messages",
  "/app/messages?c=conversa",
  "/app/sacramental-journeys",
  "/app/sacramental-journeys/jornada-1",
  "/app/inscricoes",
  "/app/inscricoes/campanha-1/conferencia",
  "/app/inscricoes/campanha-1/documentos",
  "/app/calendar",
  "/app/reports",
  "/app/catechetical-years",
  "/app/journey-templates",
  "/app/announcements",
  "/app/content-library",
  "/app/content-library?activities=1",
];

describe("hiddenFeatures defaults", () => {
  it("hides all 11 features by default", () => {
    expect(HIDDEN_FEATURE_KEYS).toHaveLength(11);
    for (const key of HIDDEN_FEATURE_KEYS) {
      expect(HIDDEN_FEATURES[key]).toBe(true);
      expect(isFeatureHidden(key)).toBe(true);
    }
  });

  it("does not hide turmas, encontros, presença, matrículas, família, mensagens, Sacramentos or Inscrições", () => {
    for (const path of KEPT_PATHS) {
      expect(isHiddenFeaturePath(path)).toBe(false);
      expect(shouldRedirectHiddenAppPath(path)).toBe(false);
    }
  });
});

describe("path matcher", () => {
  it("maps dynamic formation, communities and activity paths", () => {
    expect(featureForPath("/app/formation")).toBe("formation");
    expect(featureForPath("/app/formation/track-1")).toBe("formation");
    expect(featureForPath("/app/formation/track-1?tab=roster")).toBe(
      "formation",
    );
    expect(isHiddenFeaturePath("/app/formation/track-1")).toBe(true);
    expect(shouldRedirectHiddenAppPath("/app/formation/track-1/")).toBe(true);

    expect(featureForPath("/app/communities/comunidade-1")).toBe("communities");
    expect(isHiddenFeaturePath("/app/communities/comunidade-1")).toBe(true);

    expect(featureForPath("/app/activities")).toBe("activities");
    expect(featureForPath("/app/activities/atividade-1")).toBe("activities");
    expect(shouldRedirectHiddenAppPath("/app/activities/atividade-1")).toBe(
      true,
    );
  });

  it("keeps social /app/comunidade distinct from parish /app/communities", () => {
    expect(featureForPath("/app/comunidade")).toBe("social");
    expect(featureForPath("/app/comunidade/post")).toBe("social");
    expect(featureForPath("/app/communities")).toBe("communities");
    expect(featureForPath("/comunidade")).toBe(null);
    expect(featureForPath("/comunidade/p/slug")).toBe(null);
  });

  it("hides class formation under Inscrições without hiding the rest of the flow", () => {
    expect(featureForPath("/app/inscricoes/campanha-1/formacao")).toBe(
      "formation",
    );
    expect(
      shouldRedirectHiddenAppPath("/app/inscricoes/campanha-1/formacao"),
    ).toBe(true);
    expect(isHiddenFeaturePath("/app/inscricoes")).toBe(false);
    expect(isHiddenFeaturePath("/app/inscricoes/campanha-1/documentos")).toBe(
      false,
    );
  });

  it("recognizes parked routes for AI, official library, campaigns, tasks and collaborative sessions", () => {
    expect(featureForPath("/app/ai-hub")).toBe("ai");
    expect(featureForPath("/app/ai-planner")).toBe("ai");
    expect(featureForPath("/app/my-ai-generations/abc")).toBe("ai");
    expect(featureForPath("/app/official-library")).toBe("officialLibrary");
    expect(featureForPath("/app/message-campaigns")).toBe("messageCampaigns");
    expect(featureForPath("/app/tasks/1")).toBe("tasks");
    expect(featureForPath("/app/collaborative-planner")).toBe(
      "collaborativeSessions",
    );
    expect(shouldRedirectHiddenAppPath("/app/ai-hub?mode=create-meeting")).toBe(
      true,
    );
  });

  it("hides the Arquivos nav path but does not redirect /app/documents", () => {
    expect(featureForPath("/app/documents")).toBe("files");
    expect(featureForPath("/app/documents/doc-1")).toBe("files");
    expect(isHiddenFeaturePath("/app/documents")).toBe(true);
    expect(shouldRedirectHiddenAppPath("/app/documents")).toBe(false);
    expect(shouldRedirectHiddenAppPath("/app/documents/doc-1")).toBe(false);
  });

  it("does not treat Sacramentos or Anos Catequéticos as the itinerary route", () => {
    expect(featureForPath("/app/sacramental-journeys")).toBe(null);
    expect(featureForPath("/app/journey-templates")).toBe(null);
    expect(featureForPath("/app/catechetical-years")).toBe(null);
    expect(isFeatureHidden("itinerary")).toBe(true);
  });
});

describe("nav filter", () => {
  const items = [
    { to: "/app/classes", iconKey: "classes" },
    { to: "/app/formation", iconKey: "formation" },
    { to: "/app/official-library", iconKey: "official_library" },
    { to: "/app/comunidade", iconKey: "community" },
    { to: "/app/ai-hub", iconKey: "ai_hub" },
    { to: "/app/documents", iconKey: "documents" },
    { to: "/app/activities", iconKey: "activities" },
    { to: "/app/communities", iconKey: "communities" },
    { to: "/app/sacramental-journeys", iconKey: "sacraments" },
    { to: "/app/inscricoes", iconKey: "registrations" },
    { to: "/app/messages", iconKey: "messages" },
  ];

  it("drops parked nav items and keeps Sacramentos, Inscrições, turmas and mensagens", () => {
    const visible = filterHiddenNavItems(items).map((item) => item.to);
    expect(visible).toEqual([
      "/app/classes",
      "/app/sacramental-journeys",
      "/app/inscricoes",
      "/app/messages",
    ]);
    expect(
      shouldShowConfiguredNavItem({
        to: "/app/formation",
        iconKey: "formation",
      }),
    ).toBe(false);
  });

  it("removes the parked items from the coordinator sidebar", () => {
    const nav = getVisibleNavigation({
      role: "PARISH_COORDINATOR",
      isAdmin: false,
      workspaceType: "PARISH",
    });
    const paths = nav.all.map((item) => item.to);
    expect(paths).toContain("/app/classes");
    expect(paths).toContain("/app/sacramental-journeys");
    expect(paths).toContain("/app/messages");
    expect(paths).not.toContain("/app/formation");
    expect(paths).not.toContain("/app/official-library");
    expect(paths).not.toContain("/app/comunidade");
    expect(paths).not.toContain("/app/communities");
    expect(paths).not.toContain("/app/documents");
    expect(paths).not.toContain("/app/ai-hub");
    expect(filterLaunchHidden(nav.all)).toEqual(nav.all);
  });
});

describe("env override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('treats "none" as show every feature', () => {
    vi.stubEnv("REACT_APP_HIDDEN_FEATURES", "none");
    for (const key of HIDDEN_FEATURE_KEYS) {
      expect(isFeatureHidden(key)).toBe(false);
    }
    expect(isHiddenFeaturePath("/app/formation/track-1")).toBe(false);
    expect(shouldRedirectHiddenAppPath("/app/communities/1")).toBe(false);
    expect(
      filterHiddenNavItems([
        { to: "/app/formation", iconKey: "formation" },
        { to: "/app/classes", iconKey: "classes" },
      ]).map((item) => item.to),
    ).toEqual(["/app/formation", "/app/classes"]);
  });

  it("replaces the default set with the comma list", () => {
    vi.stubEnv("VITE_HIDDEN_FEATURES", "formation, activities");
    expect(isFeatureHidden("formation")).toBe(true);
    expect(isFeatureHidden("activities")).toBe(true);
    expect(isFeatureHidden("files")).toBe(false);
    expect(isFeatureHidden("communities")).toBe(false);
    expect(shouldRedirectHiddenAppPath("/app/formation/abc")).toBe(true);
    expect(shouldRedirectHiddenAppPath("/app/communities/abc")).toBe(false);
  });

  it("prefers VITE_HIDDEN_FEATURES over REACT_APP_HIDDEN_FEATURES", () => {
    vi.stubEnv("VITE_HIDDEN_FEATURES", "none");
    vi.stubEnv("REACT_APP_HIDDEN_FEATURES", "social");
    expect(isFeatureHidden("social")).toBe(false);
    expect(isFeatureHidden("formation")).toBe(false);
  });
});
