import * as Sentry from "@sentry/node";

let initialised = false;

export const initSentry = (): void => {
  if (initialised) return;
  initialised = true;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0"),
    sendDefaultPii: false,
  });
};

export { Sentry };
