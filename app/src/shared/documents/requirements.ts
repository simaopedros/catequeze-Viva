/** Advisory requirements only. Never use these results to gate completion. */
export const DOCUMENT_TYPES = [
  "BIRTH_CERTIFICATE",
  "BAPTISM_CERTIFICATE",
  "CONSENT_FORM",
  "MARRIAGE_CERTIFICATE",
  "PASTORAL_LETTER",
  "OTHER",
] as const;
export const DOCUMENT_STAGES = [
  "PRE_CATECHESIS",
  "BAPTISM_CHILD",
  "FIRST_EUCHARIST",
  "CONFIRMATION_TEEN",
  "RICA_ADULT",
  "CONFIRMATION_ADULT",
  "PERSEVERANCE",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentStageKind = (typeof DOCUMENT_STAGES)[number];
export type Requirement = "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE";
const R = "REQUIRED",
  O = "OPTIONAL",
  N = "NOT_APPLICABLE";
const row = (...values: Requirement[]) =>
  Object.fromEntries(
    DOCUMENT_TYPES.map((type, i) => [type, values[i]]),
  ) as Record<DocumentType, Requirement>;
export const DEFAULT_DOCUMENT_REQUIREMENTS: Record<
  DocumentStageKind,
  Record<DocumentType, Requirement>
> = {
  PRE_CATECHESIS: row(O, N, R, N, N, O),
  BAPTISM_CHILD: row(R, N, R, O, O, O),
  FIRST_EUCHARIST: row(O, R, R, N, N, O),
  CONFIRMATION_TEEN: row(O, R, R, N, R, O),
  RICA_ADULT: row(R, N, N, O, O, O),
  CONFIRMATION_ADULT: row(O, R, N, O, R, O),
  PERSEVERANCE: row(N, O, O, N, N, O),
};
export function ageAt(
  birthDate: Date | string | null | undefined,
  date = new Date(),
): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (!Number.isFinite(birth.getTime()) || birth > date) return null;
  return (
    date.getUTCFullYear() -
    birth.getUTCFullYear() -
    Number(
      date.getUTCMonth() < birth.getUTCMonth() ||
        (date.getUTCMonth() === birth.getUTCMonth() &&
          date.getUTCDate() < birth.getUTCDate()),
    )
  );
}
export function inferDocumentStage(
  cls: {
    documentStageKind?: DocumentStageKind | null;
    stage?: { name: string } | null;
    sacrament?: { name: string } | null;
  },
  age: number | null,
): DocumentStageKind | null {
  if (cls.documentStageKind) return cls.documentStageKind;
  const name = `${cls.sacrament?.name ?? ""} ${cls.stage?.name ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/perseveranca|pos[ -]?sacramento/.test(name)) return "PERSEVERANCE";
  if (
    /\brica\b|catecumenato|adult/.test(name) &&
    !/crisma|confirmacao/.test(name)
  )
    return "RICA_ADULT";
  if (/crisma|confirmacao/.test(name))
    return age !== null && age >= 18
      ? "CONFIRMATION_ADULT"
      : "CONFIRMATION_TEEN";
  if (/batismo/.test(name))
    return age !== null && age >= 18 ? "RICA_ADULT" : "BAPTISM_CHILD";
  if (/eucaristia|primeira comunhao/.test(name)) return "FIRST_EUCHARIST";
  if (/pre[ -]?catequese|iniciacao|infantil/.test(name))
    return "PRE_CATECHESIS";
  return null;
}
export type Rule = {
  scope: "PARISH" | "DIOCESE";
  stageKind: DocumentStageKind;
  documentType: DocumentType;
  requirement: Requirement;
};
export function resolveDocumentRequirements(input: {
  stageKinds: (DocumentStageKind | null)[];
  age: number | null;
  sponsors?: { fromOtherParish: boolean }[];
  rules?: Rule[];
  documents?: { type: string; status: string }[];
}) {
  const requirements = {} as Record<DocumentType, Requirement>;
  for (const type of DOCUMENT_TYPES) {
    const values = input.stageKinds.map((stage) => {
      if (!stage) return O;
      const overrides = (input.rules ?? []).filter(
        (r) => r.stageKind === stage && r.documentType === type,
      );
      let value =
        overrides.find((r) => r.scope === "PARISH")?.requirement ??
        overrides.find((r) => r.scope === "DIOCESE")?.requirement ??
        DEFAULT_DOCUMENT_REQUIREMENTS[stage][type];
      if (type === "CONSENT_FORM" && (input.age === null || input.age >= 18))
        value = N;
      if (
        type === "PASTORAL_LETTER" &&
        value === R &&
        !input.sponsors?.some((s) => s.fromOtherParish)
      )
        value = O;
      return value;
    });
    requirements[type] = !values.length
      ? O
      : values.includes(R)
        ? R
        : values.includes(O)
          ? O
          : N;
  }
  const missing = DOCUMENT_TYPES.filter(
    (type) =>
      requirements[type] === R &&
      !input.documents?.some(
        (d) => d.type === type && ["PENDING", "VERIFIED"].includes(d.status),
      ),
  );
  return { requirements, missing };
}
export function requirementsForProfile(
  profile: any,
  rules: Rule[] = [],
  date = new Date(),
) {
  const age = ageAt(profile.birthDate, date);
  const stageKinds = (profile.enrollments ?? [])
    .filter((e: any) => e.status === "ENROLLED")
    .map((e: any) => inferDocumentStage(e.class, age));
  return resolveDocumentRequirements({
    stageKinds,
    age,
    sponsors: profile.sponsors,
    rules,
    documents: profile.documents,
  });
}
