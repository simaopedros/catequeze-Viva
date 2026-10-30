/** Campo invisível deve permanecer vazio. O servidor valida novamente em cada envio. */
export function passesHoneypot(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}
