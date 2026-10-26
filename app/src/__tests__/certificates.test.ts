import { describe, expect, it } from "vitest";
import { buildCertificateHtml, escapeHtml } from "../shared/certificates";

describe("certificates", () => {
  it("escapes user-provided text", () => {
    expect(escapeHtml(`<b>"Ana" & 'Rui'</b>`)).toBe(
      "&lt;b&gt;&quot;Ana&quot; &amp; &#39;Rui&#39;&lt;/b&gt;",
    );
  });

  it("renders title, paragraphs and signatures without raw HTML injection", () => {
    const html = buildCertificateHtml({
      lang: "pt-BR",
      heading: "Paróquia São José",
      title: "Declaração de matrícula",
      paragraphs: ["Declaramos que <script>x</script> Maria está matriculada."],
      placeAndDate: "São Paulo, 26 de outubro de 2026.",
      signatures: [
        { name: "Ana", role: "Catequista" },
        { name: "", role: "Pároco" },
      ],
    });
    expect(html).toContain("<h1>Declaração de matrícula</h1>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt; Maria");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("<span>Catequista</span>");
    expect(html).toContain("<span>Pároco</span>");
    expect(html).toContain('lang="pt-BR"');
  });
});
