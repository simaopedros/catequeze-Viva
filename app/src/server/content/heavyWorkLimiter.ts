/**
 * Bounds CPU/memory-heavy request-path work (PDF/DOCX extraction) so a burst of
 * uploads cannot starve the event loop. Callers beyond the queue limit fail
 * fast with a retryable error instead of piling up in memory.
 */
export class HeavyWorkRejectedError extends Error {
  constructor(
    public readonly reason: 'busy' | 'timeout',
    message: string,
  ) {
    super(message);
    this.name = 'HeavyWorkRejectedError';
  }
}

export type HeavyWorkLimiterOptions = {
  /** Jobs allowed to run at the same time. */
  concurrency: number;
  /** Jobs allowed to wait for a slot before new callers are rejected. */
  maxQueue: number;
  /** Per-job wall-clock budget once it starts. */
  timeoutMs: number;
};

export function createHeavyWorkLimiter(options: HeavyWorkLimiterOptions) {
  let running = 0;
  const waiting: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (running < options.concurrency) {
      running += 1;
      return Promise.resolve();
    }
    if (waiting.length >= options.maxQueue) {
      return Promise.reject(
        new HeavyWorkRejectedError('busy', 'Servidor ocupado a processar outros ficheiros. Tente novamente em instantes.'),
      );
    }
    return new Promise((resolve) => {
      waiting.push(() => {
        running += 1;
        resolve();
      });
    });
  };

  const release = () => {
    running -= 1;
    const next = waiting.shift();
    if (next) next();
  };

  return {
    async run<T>(work: () => Promise<T>): Promise<T> {
      await acquire();
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          work(),
          new Promise<T>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new HeavyWorkRejectedError('timeout', 'O processamento do ficheiro demorou demasiado. Tente um ficheiro menor.'),
                ),
              options.timeoutMs,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
        release();
      }
    },
    stats() {
      return { running, waiting: waiting.length };
    },
  };
}

/** Shared limiter for document text extraction in HTTP handlers. */
export const documentExtractionLimiter = createHeavyWorkLimiter({
  concurrency: 2,
  maxQueue: 8,
  timeoutMs: 45_000,
});
