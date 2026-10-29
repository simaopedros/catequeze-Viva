import { describe, expect, it } from "vitest";
import {
  ageAt,
  DEFAULT_DOCUMENT_REQUIREMENTS as defaults,
  DOCUMENT_STAGES,
  DOCUMENT_TYPES,
  inferDocumentStage,
  requirementsForProfile,
  resolveDocumentRequirements,
  type Rule,
} from "../shared/documents/requirements";
const R = "REQUIRED",
  O = "OPTIONAL",
  N = "NOT_APPLICABLE";
const base = {
  stageKinds: ["CONFIRMATION_TEEN"] as const,
  age: 15,
  documents: [],
};
function resolve(extra: any = {}) {
  return resolveDocumentRequirements({
    ...base,
    stageKinds: [...base.stageKinds],
    ...extra,
  });
}
describe("Documentos por etapa, apenas avisos", () => {
  it("preserva exatamente as 42 células aprovadas", () => {
    expect(
      DOCUMENT_STAGES.map((s) => DOCUMENT_TYPES.map((t) => defaults[s][t])),
    ).toEqual([
      [O, N, R, N, N, O],
      [R, N, R, O, O, O],
      [O, R, R, N, N, O],
      [O, R, R, N, R, O],
      [R, N, N, O, O, O],
      [O, R, N, O, R, O],
      [N, O, O, N, N, O],
    ]);
  });
  it("usa aniversário completo na data de referência, inclusive 18 anos", () => {
    expect(ageAt("2008-10-29", new Date("2026-10-28T12:00:00Z"))).toBe(17);
    expect(ageAt("2008-10-29", new Date("2026-10-29T12:00:00Z"))).toBe(18);
    expect(resolve({ age: 17 }).missing).toContain("CONSENT_FORM");
    for (const age of [18, 50, null]) {
      expect(resolve({ age }).requirements.CONSENT_FORM).toBe(N);
      expect(resolve({ age }).missing).not.toContain("CONSENT_FORM");
    }
    expect(ageAt(null)).toBeNull();
    expect(ageAt("invalid")).toBeNull();
  });
  it("aplica paróquia acima de diocese acima do padrão", () => {
    const diocese: Rule = {
      scope: "DIOCESE",
      stageKind: "CONFIRMATION_TEEN",
      documentType: "BAPTISM_CERTIFICATE",
      requirement: N,
    };
    const parish: Rule = { ...diocese, scope: "PARISH", requirement: O };
    expect(resolve().requirements.BAPTISM_CERTIFICATE).toBe(R);
    expect(resolve({ rules: [diocese] }).requirements.BAPTISM_CERTIFICATE).toBe(
      N,
    );
    for (const rules of [
      [parish, diocese],
      [diocese, parish],
    ])
      expect(resolve({ rules }).requirements.BAPTISM_CERTIFICATE).toBe(O);
  });
  it("carta pastoral só vira pendência em Crisma com padrinho de outra paróquia", () => {
    expect(resolve().requirements.PASTORAL_LETTER).toBe(O);
    expect(
      resolve({ sponsors: [{ fromOtherParish: false }] }).missing,
    ).not.toContain("PASTORAL_LETTER");
    for (const stage of ["CONFIRMATION_TEEN", "CONFIRMATION_ADULT"])
      expect(
        resolve({ stageKinds: [stage], sponsors: [{ fromOtherParish: true }] })
          .missing,
      ).toContain("PASTORAL_LETTER");
    expect(
      resolve({
        stageKinds: ["BAPTISM_CHILD"],
        sponsors: [{ fromOtherParish: true }],
      }).missing,
    ).not.toContain("PASTORAL_LETTER");
  });
  it("reutiliza documentos e aceita PENDING/VERIFIED; REJECTED exige reenvio", () => {
    for (const status of ["PENDING", "VERIFIED"])
      expect(
        resolve({
          stageKinds: ["FIRST_EUCHARIST", "CONFIRMATION_TEEN"],
          documents: [{ type: "BAPTISM_CERTIFICATE", status }],
        }).missing,
      ).not.toContain("BAPTISM_CERTIFICATE");
    expect(
      resolve({
        documents: [{ type: "BAPTISM_CERTIFICATE", status: "REJECTED" }],
      }).missing,
    ).toContain("BAPTISM_CERTIFICATE");
    expect(
      resolve({
        documents: [
          { type: "BAPTISM_CERTIFICATE", status: "REJECTED" },
          { type: "BAPTISM_CERTIFICATE", status: "PENDING" },
        ],
      }).missing,
    ).not.toContain("BAPTISM_CERTIFICATE");
  });
  it("sem matrícula ativa não cobra; une exigências das turmas ENROLLED", () => {
    const profile = {
      birthDate: "2012-01-01",
      enrollments: [
        {
          status: "CONCLUDED",
          class: { documentStageKind: "FIRST_EUCHARIST" },
        },
      ],
    };
    expect(requirementsForProfile(profile).missing).toEqual([]);
    expect(
      requirementsForProfile({
        ...profile,
        enrollments: [
          { status: "ENROLLED", class: { documentStageKind: "BAPTISM_CHILD" } },
          {
            status: "ENROLLED",
            class: { documentStageKind: "FIRST_EUCHARIST" },
          },
        ],
      }).missing,
    ).toEqual(["BIRTH_CERTIFICATE", "BAPTISM_CERTIFICATE", "CONSENT_FORM"]);
  });
  it.each([
    ["PRÉ-CATEQUESE", 8, "PRE_CATECHESIS"],
    ["Iniciação infantil", 8, "PRE_CATECHESIS"],
    ["Batismo", 10, "BAPTISM_CHILD"],
    ["Batismo", 18, "RICA_ADULT"],
    ["RICA", 25, "RICA_ADULT"],
    ["Catecumenato", 25, "RICA_ADULT"],
    ["Primeira Comunhão", 11, "FIRST_EUCHARIST"],
    ["Eucaristia", 11, "FIRST_EUCHARIST"],
    ["CRISMA", 17, "CONFIRMATION_TEEN"],
    ["Confirmação", 18, "CONFIRMATION_ADULT"],
    ["Perseverança", 15, "PERSEVERANCE"],
    ["Pós-sacramento", 20, "PERSEVERANCE"],
    ["Turma livre", 9, null],
  ])("infere %s com idade %s", (name, age, stage) => {
    expect(inferDocumentStage({ stage: { name } }, age)).toBe(stage);
    expect(inferDocumentStage({ sacrament: { name } }, age)).toBe(stage);
  });
  it("configuração explícita vence inferência", () =>
    expect(
      inferDocumentStage(
        { documentStageKind: "PERSEVERANCE", sacrament: { name: "Batismo" } },
        9,
      ),
    ).toBe("PERSEVERANCE"));
});

it("mantém tipos opcionais de uma turma não reconhecida na união de turmas", () => {
  const profile = {
    birthDate: "2010-01-01",
    enrollments: [
      { status: "ENROLLED", class: { documentStageKind: "PRE_CATECHESIS" } },
      {
        status: "ENROLLED",
        class: { stage: { name: "Nome livre sem correspondência" } },
      },
    ],
  };
  const result = requirementsForProfile(profile);
  expect(result.requirements.BAPTISM_CERTIFICATE).toBe("OPTIONAL");
  expect(result.missing).toEqual(["CONSENT_FORM"]);
});
