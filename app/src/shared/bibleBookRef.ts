/** Match a typed Bible reference ("João", "Jo") to a stored book ("São João"). */
export function bibleBookMatchesRef(
  book: { name?: string | null; abbreviation?: string | null },
  raw: string,
): boolean {
  const needle = (raw || "").trim().toLowerCase();
  if (!needle) return false;
  const name = (book.name || "").trim().toLowerCase();
  const abbr = (book.abbreviation || "").trim().toLowerCase();
  if (name === needle || abbr === needle) return true;
  if (
    name === `são ${needle}` ||
    name === `sao ${needle}` ||
    name === `st. ${needle}` ||
    name === `st ${needle}`
  ) {
    return true;
  }
  return name.endsWith(` ${needle}`);
}
