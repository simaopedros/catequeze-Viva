// A timed out request may still complete on the server. Acceptance is idempotent.
export async function withTermsTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("terms_timeout")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
