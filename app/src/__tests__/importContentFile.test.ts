import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}));

vi.mock("mammoth", () => ({
  convertToHtml: vi.fn(),
  default: {
    convertToHtml: vi.fn(),
  },
}));

vi.mock("../server/storage/bunnyStorage", () => ({
  isBunnyStorageConfigured: vi.fn(),
  bunnyPutObject: vi.fn(),
  bunnyGetObject: vi.fn(),
  bunnyDeleteObject: vi.fn(),
}));

import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import {
  ContentImportError,
  resolveImportKind,
  titleFromFileName,
} from "../shared/contentImport";
import {
  extractImportedDocument,
  validateImportBuffer,
} from "../server/content/importContentFile";
import { storeContentSourceFile } from "../server/storage/contentSourceStorage";
import {
  isBunnyStorageConfigured,
  bunnyPutObject,
} from "../server/storage/bunnyStorage";

const extractTextMock = vi.mocked(extractText);
const getDocumentProxyMock = vi.mocked(getDocumentProxy);
const mammothConvert = vi.mocked(
  mammoth.convertToHtml || (mammoth as any).default.convertToHtml,
);
const isBunnyConfigured = vi.mocked(isBunnyStorageConfigured);
const bunnyPut = vi.mocked(bunnyPutObject);

describe("resolveImportKind", () => {
  it("maps extensions and MIME types", () => {
    expect(resolveImportKind("roteiro.pdf")).toBe("pdf");
    expect(resolveImportKind("aula.docx")).toBe("docx");
    expect(resolveImportKind("notas.txt")).toBe("txt");
    expect(resolveImportKind("notas.md")).toBe("md");
    expect(resolveImportKind("file.bin", "application/pdf")).toBe("pdf");
    expect(resolveImportKind("file.exe")).toBeNull();
  });
});

describe("titleFromFileName", () => {
  it("strips the extension and trims", () => {
    expect(titleFromFileName("Encontro_Batismo.docx")).toBe("Encontro Batismo");
  });
});

describe("validateImportBuffer", () => {
  it("rejects a non-PDF declared as PDF", () => {
    expect(() => validateImportBuffer(Buffer.from("not-a-pdf"), "pdf")).toThrow(
      ContentImportError,
    );
  });

  it("accepts a PDF signature", () => {
    expect(() =>
      validateImportBuffer(Buffer.from("%PDF-1.4 hello"), "pdf"),
    ).not.toThrow();
  });
});

describe("extractImportedDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentProxyMock.mockResolvedValue({} as any);
    extractTextMock.mockResolvedValue({
      totalPages: 1,
      text: "Texto do PDF",
    } as any);
    mammothConvert.mockResolvedValue({
      value: "<h1>Word</h1><p>Corpo</p>",
    } as any);
    (mammoth as any).convertToHtml = mammothConvert;
    (mammoth as any).default = { convertToHtml: mammothConvert };
  });

  it("extracts a text file", async () => {
    const result = await extractImportedDocument({
      buffer: Buffer.from("Primeiro\n\nSegundo"),
      fileName: "roteiro.txt",
      mimeType: "text/plain",
    });
    expect(result.kind).toBe("txt");
    expect(result.title).toBe("roteiro");
    expect(result.plainText).toContain("Primeiro");
  });

  it("rejects an empty PDF after extraction", async () => {
    extractTextMock.mockResolvedValue({ totalPages: 1, text: "   " } as any);
    await expect(
      extractImportedDocument({
        buffer: Buffer.from("%PDF-1.4"),
        fileName: "scan.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({ code: "EMPTY_TEXT" });
  });

  it("rejects unsupported types", async () => {
    await expect(
      extractImportedDocument({
        buffer: Buffer.from("data"),
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TYPE" });
  });

  it("extracts a Word document via HTML", async () => {
    const result = await extractImportedDocument({
      buffer: Buffer.from("PK\x03\x04word"),
      fileName: "encontro.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.kind).toBe("docx");
    expect(result.plainText).toContain("Word");
    expect(result.plainText).toContain("Corpo");
  });
});

describe("storeContentSourceFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Bunny is not configured", async () => {
    isBunnyConfigured.mockReturnValue(false);
    await expect(
      storeContentSourceFile({
        buffer: Buffer.from("hello"),
        kind: "txt",
        parishId: "parish-1",
      }),
    ).rejects.toMatchObject({ code: "STORAGE_NOT_CONFIGURED", status: 503 });
    expect(bunnyPut).not.toHaveBeenCalled();
  });

  it("puts the original file in Bunny under content-library/", async () => {
    isBunnyConfigured.mockReturnValue(true);
    bunnyPut.mockResolvedValue(undefined);
    const key = await storeContentSourceFile({
      buffer: Buffer.from("hello"),
      kind: "txt",
      parishId: "parish-1",
    });
    expect(key.startsWith("content-library/parish-1/")).toBe(true);
    expect(key.endsWith(".txt")).toBe(true);
    expect(bunnyPut).toHaveBeenCalledWith(
      key,
      expect.any(Buffer),
      "text/plain",
    );
  });
});
