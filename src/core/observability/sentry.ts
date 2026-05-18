import * as Sentry from "@sentry/node";

// Single source of truth for backend error reporting.
//
// initSentry() is called at the very top of app.ts (before `express()` is
// instantiated) because @sentry/node patches global http/https modules and
// must run before any module that captures those references. Calling it
// later silently breaks instrumentation.
//
// When SENTRY_DSN is unset the SDK is initialised in "DSN-less" mode: it
// installs no transport and drops every event, so local dev and CI never
// ship a single byte to Sentry. This lets us write `Sentry.captureException`
// throughout the codebase without env-guarding every call site.

let initialised = false;

export const initSentry = (): void => {
  if (initialised) return;
  initialised = true;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE,
    // Performance tracing is expensive — turn on selectively and tune
    // tracesSampleRate per environment. Default off to stay inside the
    // free-tier 10k events/month budget.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0"),
    // Send less PII by default. Errors keep stack traces; we never want
    // request bodies (may contain reset tokens, passwords) in error events.
    sendDefaultPii: false,
  });
};

export { Sentry };
