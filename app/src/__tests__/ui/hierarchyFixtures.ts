import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Bundle = Record<string, unknown>;

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../../i18n/locales/pt-BR");

function loadBundle(name: string): Bundle {
  return JSON.parse(readFileSync(join(localesDir, `${name}.json`), "utf8")) as Bundle;
}

const hierarchyPt = loadBundle("hierarchy");
const calendarPt = loadBundle("calendar");
const commonPt = loadBundle("common");
const reportsPt = loadBundle("reports");
const yearsPt = loadBundle("catecheticalYears");

function lookup(bundle: Bundle, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Bundle)) {
      return (acc as Bundle)[part];
    }
    return undefined;
  }, bundle);
}

const bundles: Record<string, Bundle> = {
  hierarchy: hierarchyPt as Bundle,
  calendar: calendarPt as Bundle,
  common: commonPt as Bundle,
  reports: reportsPt as Bundle,
  catecheticalYears: yearsPt as Bundle,
};

export function tFromBundle(bundle: Bundle) {
  return (key: string, opts?: Record<string, unknown>) => {
    let nsBundle = bundle;
    let lookupKey = key;
    if (key.includes(":")) {
      const [ns, rest] = key.split(":") as [string, string];
      nsBundle = bundles[ns] || bundle;
      lookupKey = rest;
    }
    const value = lookup(nsBundle, lookupKey);
    if (opts?.returnObjects) return value ?? key;
    if (typeof value !== "string") {
      return typeof opts?.defaultValue === "string" ? opts.defaultValue : key;
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      opts && name in opts ? String(opts[name]) : `{{${name}}}`,
    );
  };
}

const translators: Record<
  string,
  (key: string, opts?: Record<string, unknown>) => unknown
> = {};

export function mockUseTranslation(ns?: string) {
  const key = ns || "common";
  if (!translators[key]) {
    translators[key] = tFromBundle(bundles[key] || (commonPt as Bundle));
  }
  return {
    t: translators[key],
    i18n: { language: "pt-BR", changeLanguage: async () => undefined },
  };
}

export const DIOCESE_RESOURCE = {
  id: "res-dir-1",
  title: "Diretório diocesano 2026",
  summary: "Normas da catequese na arquidiocese",
  body: "Os encontros sigam o itinerário oficial.",
  kind: "DIRECTORY",
  status: "PUBLISHED",
  ownerType: "DIOCESE",
  inheritancePolicy: "LOCKED",
  inherited: true,
  origin: {
    ownerType: "DIOCESE",
    ownerId: "dio-1",
    policy: "LOCKED",
    inherited: true,
    adoptionStatus: "INHERITED",
    sourceId: null,
    labelKey: "origin.diocese",
  },
  adoption: null,
  version: 2,
};

export const SUGGESTED_RESOURCE = {
  ...DIOCESE_RESOURCE,
  id: "res-sub-1",
  title: "Subsídio Eucaristia — Encontro 7",
  kind: "SUBSIDY",
  inheritancePolicy: "SUGGESTED",
  origin: {
    ...DIOCESE_RESOURCE.origin,
    policy: "SUGGESTED",
    adoptionStatus: null,
  },
};

export const ADAPTED_STALE_RESOURCE = {
  ...SUGGESTED_RESOURCE,
  id: "res-adapted-1",
  title: "Subsídio Eucaristia — cópia local",
  adoption: { status: "ADAPTED", copiedVersion: 1 },
  version: 3,
};

export const DRAFT_PARISH_RESOURCE = {
  id: "res-local-1",
  title: "Regulamento interno",
  summary: "Avisos do pároco",
  body: "",
  kind: "POLICY",
  status: "DRAFT",
  ownerType: "PARISH",
  inheritancePolicy: "SUGGESTED",
  inherited: false,
  origin: {
    ownerType: "PARISH",
    ownerId: "parish-1",
    policy: "SUGGESTED",
    inherited: false,
    adoptionStatus: null,
    sourceId: null,
    labelKey: "origin.parish",
  },
  adoption: null,
  version: 1,
};

export const PUBLISHED_ANNOUNCEMENT = {
  id: "ann-1",
  title: "Início da catequese 2026",
  body: "Matrículas até 20 de setembro.",
  audience: "coordinators",
  status: "PUBLISHED",
  requireAck: true,
  ownerType: "DIOCESE",
  inheritancePolicy: "REQUIRED_EXTENDABLE",
  inherited: true,
  acknowledged: false,
  origin: {
    ownerType: "DIOCESE",
    inherited: true,
    policy: "REQUIRED_EXTENDABLE",
  },
  _count: { acknowledgements: 3 },
};

export const DRAFT_ANNOUNCEMENT = {
  ...PUBLISHED_ANNOUNCEMENT,
  id: "ann-draft",
  title: "Rascunho paroquial",
  body: "Texto ainda não publicado.",
  status: "DRAFT",
  inherited: false,
  ownerType: "PARISH",
  origin: { ownerType: "PARISH", inherited: false, policy: "LOCAL" },
  acknowledged: false,
  _count: { acknowledgements: 0 },
};

export const FORMATION_TRACK = {
  id: "track-1",
  name: "Formação inicial de catequistas",
  description: "Trilha diocesana obrigatória no primeiro ano.",
  kind: "INITIAL",
  hours: 40,
  ownerType: "DIOCESE",
  inheritancePolicy: "SUGGESTED",
  inherited: true,
  myEnrollment: null,
  _count: { sessions: 1, enrollments: 12 },
  sessions: [
    {
      id: "sess-1",
      title: "Encontro 1 — Identidade do catequista",
      startsAt: "2026-09-12T19:00:00.000Z",
    },
  ],
};

export const ENROLLED_TRACK = {
  ...FORMATION_TRACK,
  myEnrollment: { status: "ENROLLED" },
};

export const PUBLISHED_ITINERARY = {
  id: "itin-1",
  name: "Eucaristia 2 anos",
  description: "Itinerário oficial da diocese",
  status: "PUBLISHED",
  ownerType: "DIOCESE",
  inheritancePolicy: "REQUIRED_EXTENDABLE",
  inherited: true,
  origin: { ownerType: "DIOCESE", inherited: true },
  stages: [{ id: "st-1", name: "Primeiro ano", order: 0 }],
  _count: { years: 1 },
};

export const DRAFT_ITINERARY = {
  id: "itin-draft-1",
  name: "Crisma 3 anos",
  description: "Rascunho da paróquia",
  status: "DRAFT",
  ownerType: "PARISH",
  inheritancePolicy: "SUGGESTED",
  inherited: false,
  origin: { ownerType: "PARISH", inherited: false },
  stages: [{ id: "st-d1", name: "Ano 1", order: 0 }],
  _count: { years: 0 },
};

export const ADOPTION_REPORT = {
  dioceseId: "dio-1",
  publishedResources: 4,
  publishedItineraries: 2,
  formationTracks: 3,
  formationEnrollments: 18,
  parishes: [
    {
      id: "parish-1",
      name: "Paróquia São José (TESTE)",
      type: "PARISH",
      classCount: 3,
      memberCount: 12,
      officialAdoptions: 2,
      itineraryAdoptions: 1,
    },
    {
      id: "parish-2",
      name: "Paróquia Santa Maria (TESTE)",
      type: "PARISH",
      classCount: 1,
      memberCount: 4,
      officialAdoptions: 0,
      itineraryAdoptions: 0,
    },
  ],
};

export const REPORTS_OVERVIEW = {
  classReports: [
    {
      id: "class-1",
      parishId: "parish-1",
      name: "Crisma 2026",
      totalEnrolled: 12,
      totalMeetings: 8,
      presentCount: 70,
      absentCount: 10,
      attendanceRate: 88,
    },
  ],
};

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
