// Body-parser limits are pinned here so they don't ride on body-parser's
// implicit default and can be tightened per environment without code changes.
// The app has no upload feature today; 100kb is generous for all current
// REST and GraphQL payloads.

export const BODY_PARSER_JSON_OPTIONS = {
  limit: process.env.BODY_LIMIT_JSON ?? "100kb",
};

export const BODY_PARSER_URLENCODED_OPTIONS = {
  extended: true as const,
  limit: process.env.BODY_LIMIT_URLENCODED ?? "100kb",
  parameterLimit: Number(process.env.URLENCODED_PARAMETER_LIMIT ?? "1000"),
};
