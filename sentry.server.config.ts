// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  enabled: process.env.NODE_ENV === "production",
  dsn:
    process.env.NODE_ENV === "production"
      ? "https://361a2627721a565f9127135576315591@o4511150275756032.ingest.de.sentry.io/4511150280278096"
      : undefined,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  beforeSend(event, hint) {
    // Filter out Sentry's own internal OTel postEvent noise (known issue in @sentry/nextjs v10)
    const message =
      hint?.originalException instanceof Error
        ? hint.originalException.message
        : String(hint?.originalException ?? "");
    if (message.includes("postEvent") && message.includes("Method not found")) {
      return null;
    }
    return event;
  },
});
