import { describe, expect, it } from "vitest";
import {
  buildLegacyContentDocument,
  contentDocumentToPlainText,
  createEmptyContentDocument,
  createMeetingSkeletonDocument,
  htmlToContentDocument,
  isBlankContentDocument,
  isUnmodifiedMeetingSkeleton,
  markdownToContentDocument,
  MEETING_SECTION_TITLES,
  parseContentDocument,
  plainTextToContentDocument,
} from "../shared/contentDocument";

describe("contentDocument", () => {
  it("builds a document from legacy fields in the expected order", () => {
    const document = buildLegacyContentDocument({
      theme: "Os sacramentos",
      pastoralObjective: "Ajudar a turma a compreender os sinais da graça.",
      openingPrayer: "Senhor, abre nosso coração.",
      mainContent: "Texto principal do encontro.",
      dynamic: "Dinâmica em grupo.",
      materials: "Bíblia e cartolina.",
      activity: "Responder perguntas.",
      familyTask: "Conversar em casa sobre o batismo.",
      closingPrayer: "Obrigado, Senhor.",
      estimatedTime: 75,
      tags: "sacramentos, batismo",
      biblicalRef: "Jo 3,5",
      catechismRef: "CIC §1213",
    });

    const labels = document.content
      .filter((node) => node.type === "heading")
      .map((node) => node.content?.[0]?.text);

    expect(labels).toEqual([
      "Resumo do encontro",
      "Oração inicial",
      "Conteúdo principal",
      "Dinâmica",
      "Atividade",
      "Materiais",
      "Compromisso com a família",
      "Oração final",
      "Referências",
    ]);
  });

  it("parses stored content documents safely", () => {
    const empty = createEmptyContentDocument();
    expect(parseContentDocument(JSON.stringify(empty))).toEqual(empty);
    expect(parseContentDocument("{invalid")).toBeNull();
    expect(parseContentDocument(null)).toBeNull();
  });

  it("creates a pastoral meeting skeleton with named sections", () => {
    const skeleton = createMeetingSkeletonDocument();
    const headings = skeleton.content
      .filter((node) => node.type === "heading")
      .map((node) => node.content?.[0]?.text);

    expect(headings).toEqual([...MEETING_SECTION_TITLES]);
    expect(isUnmodifiedMeetingSkeleton(skeleton)).toBe(true);
    expect(isBlankContentDocument(skeleton)).toBe(false);
    expect(isBlankContentDocument(createEmptyContentDocument())).toBe(true);
  });

  it("detects when the skeleton has been edited", () => {
    const skeleton = createMeetingSkeletonDocument();
    const edited = {
      ...skeleton,
      content: [
        ...skeleton.content,
        { type: "paragraph", content: [{ type: "text", text: "Anotação" }] },
      ],
    };
    expect(isUnmodifiedMeetingSkeleton(edited)).toBe(false);
  });

  it("converts plain text paragraphs into a document", () => {
    const document = plainTextToContentDocument(
      "Primeiro parágrafo.\n\nSegundo parágrafo.",
    );
    expect(document.content.map((node) => node.content?.[0]?.text)).toEqual([
      "Primeiro parágrafo.",
      "Segundo parágrafo.",
    ]);
    expect(contentDocumentToPlainText(document)).toContain(
      "Primeiro parágrafo.",
    );
  });

  it("converts markdown headings and lists", () => {
    const document = markdownToContentDocument(
      "# Batismo\n\n## Acolhida\n\nTexto introdutório.\n\n- Bíblia\n- Velas\n\n1. Orar\n2. Cantar\n",
    );
    const headings = document.content
      .filter((node) => node.type === "heading")
      .map((node) => ({
        level: node.attrs?.level,
        text: node.content?.[0]?.text,
      }));
    expect(headings).toEqual([
      { level: 1, text: "Batismo" },
      { level: 2, text: "Acolhida" },
    ]);
    expect(document.content.some((node) => node.type === "bulletList")).toBe(
      true,
    );
    expect(document.content.some((node) => node.type === "orderedList")).toBe(
      true,
    );
  });

  it("converts HTML headings and lists", () => {
    const document = htmlToContentDocument(
      "<h1>Encontro</h1><p>Texto &amp; oração</p><ul><li>Um</li><li>Dois</li></ul>",
    );
    expect(document.content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
    expect(contentDocumentToPlainText(document)).toContain("Texto & oração");
    expect(document.content.some((node) => node.type === "bulletList")).toBe(
      true,
    );
  });
});
