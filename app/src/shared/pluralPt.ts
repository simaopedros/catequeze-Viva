/** "1 turma", "0 turmas", "3 turmas" — pt-BR only treats exactly one as singular in copy. */
export function pluralPt(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
