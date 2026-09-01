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

const SENTRY_DSN = (import.meta.env.REACT_APP_SENTRY_DSN as string | undefined)?.trim();

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_QUERY_RE = /([?&](token|key|code|session|access_token)=)[^&#\s]+/gi;

function scrubString(value: string): string {
  return value.replace(EMAIL_RE, "[email]").replace(TOKEN_QUERY_RE, "$1[redacted]");
}

/** Strip PII (emails, tokens in URLs, request bodies) before events leave the browser. */
function scrubEvent<T extends Record<string, any>>(input: T): T {
  const event = input as Record<string, any>;
  if (event.user) {
    event.user = { id: event.user.id };
  }
  if (event.request?.url) event.request.url = scrubString(event.request.url);
  if (event.request?.data) delete event.request.data;
  if (event.message) event.message = scrubString(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubString(exception.value);
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubString(crumb.message);
    if (crumb.data?.url) crumb.data.url = scrubString(String(crumb.data.url));
  }
  return event as T;
}

async function initSentryDeferred() {
  if (!SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || "production",
      sendDefaultPii: false,
      beforeSend: (event) => scrubEvent(event),
      beforeBreadcrumb: (crumb) => {
        if (crumb.message) crumb.message = scrubString(crumb.message);
        if (crumb.data?.url) crumb.data.url = scrubString(String(crumb.data.url));
        return crumb;
      },
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
