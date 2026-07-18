/**
 * Deferred Sentry bootstrap — keeps Sentry off the critical path.
 * Early errors are buffered until init completes.
 */
type BufferedError = { error: unknown; hint?: unknown };

const earlyErrors: BufferedError[] = [];
let sentryReady = false;

function bufferError(error: unknown, hint?: unknown) {
  if (earlyErrors.length < 20) earlyErrors.push({ error, hint });
}

// Capture uncaught errors before Sentry loads
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (!sentryReady) bufferError(event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (!sentryReady) bufferError(event.reason);
  });
}

function scheduleIdle(cb: () => void) {
  if (typeof window === "undefined") return;
  const ric = (window as any).requestIdleCallback as
    | ((fn: () => void, opts?: { timeout: number }) => void)
    | undefined;
  if (ric) {
    ric(cb, { timeout: 4000 });
  } else {
    window.setTimeout(cb, 2500);
  }
}

async function initSentryDeferred() {
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: "https://bc43c809d611e07b12f97ee826cfa3b6@o4511547183792128.ingest.us.sentry.io/4511547190935552",
      environment: process.env.NODE_ENV || "production",
      integrations: [
        Sentry.browserTracingIntegration(),
        // Replay is heavy — load only after idle and only on errors in production
        ...(process.env.NODE_ENV === "development"
          ? []
          : [
              Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
              }),
            ]),
      ],
      tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.05,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: process.env.NODE_ENV === "development" ? 0 : 0.5,
    });
    sentryReady = true;
    for (const item of earlyErrors.splice(0)) {
      Sentry.captureException(item.error);
    }
  } catch {
    /* Sentry optional */
  }
}

// Do not block first paint — init after load + idle
if (typeof window !== "undefined") {
  if (document.readyState === "complete") {
    scheduleIdle(() => {
      void initSentryDeferred();
    });
  } else {
    window.addEventListener("load", () => {
      scheduleIdle(() => {
        void initSentryDeferred();
      });
    });
  }
}
