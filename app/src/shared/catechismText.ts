/**
 * The Catechism dataset uses the Vatican's Portuguese text, written in the
 * pre-1990-agreement European spelling. These rules only change spelling
 * (silent consonants, "connosco", "facto"), never wording.
 */
const SPELLING_RULES: Array<[RegExp, string]> = [
  [
    /\bac(ç|t)(ão|ões|o|os|a|as|ual|uais|ualmente|uar|ivo|ivos|iva|ivas|ividade|ividades|ivamente|ivar|ivação)\b/gi,
    "a$1$2",
  ],
  [/\b(in|re|e|ex)?activ/gi, "$1ativ"],
  [/\bbaptis/gi, "batis"],
  [/\bobjectiv/gi, "objetiv"],
  [/\bcolectiv/gi, "coletiv"],
  [/\befectiv/gi, "efetiv"],
  [/\bafectiv/gi, "afetiv"],
  [/\bprotecç/gi, "proteç"],
  [/\bdirecç/gi, "direç"],
  [/\bcorrecç/gi, "correç"],
  [/\bselecç/gi, "seleç"],
  [/\bredacç/gi, "redaç"],
  [/\binfecç/gi, "infeç"],
  [/\badopç/gi, "adoç"],
  [/\bexcepç/gi, "exceç"],
  [/\bexact/gi, "exat"],
  [/\bsector/gi, "setor"],
  [/\bprojecto/gi, "projeto"],
  [/\bconnosco\b/gi, "conosco"],
  [/\bfacto\b/gi, "fato"],
  [/\bfactos\b/gi, "fatos"],
  [/\bcontacto/gi, "contato"],
];

function keepCase(original: string, replacement: string): string {
  if (original[0] && original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function toBrazilianSpelling(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SPELLING_RULES) {
    out = out.replace(pattern, (match, ...groups) => {
      const replaced = match.replace(
        new RegExp(pattern.source, pattern.flags.replace("g", "")),
        replacement,
      );
      void groups;
      return keepCase(match, replaced.toLowerCase());
    });
  }
  return out;
}

export function catechismDisplayText(text: string, locale: string): string {
  return locale.toLowerCase().startsWith("pt-br")
    ? toBrazilianSpelling(text)
    : text;
}

/**
 * Imported entries store the first ~250 characters of the paragraph as the
 * "question". Detect that and present it as a preview instead.
 */
export function catechismPreview(entry: {
  question?: string | null;
  answer?: string | null;
}): { title: string; isExcerpt: boolean } {
  const question = (entry.question || "").trim();
  const answer = (entry.answer || "").trim();
  const isExcerpt =
    Boolean(question) &&
    answer.startsWith(question) &&
    answer.length > question.length;
  if (!isExcerpt) return { title: question || answer, isExcerpt: false };
  const cut = question.lastIndexOf(" ");
  const base = cut > 40 ? question.slice(0, cut) : question;
  return { title: `${base.replace(/[\s,;:.]+$/, "")}…`, isExcerpt: true };
}
