import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://bc43c809d611e07b12f97ee826cfa3b6@o4511547183792128.ingest.us.sentry.io/4511547190935552",
  environment: process.env.NODE_ENV || "production",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
