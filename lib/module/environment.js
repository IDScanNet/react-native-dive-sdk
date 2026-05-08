"use strict";

let currentEnvironment = {};

/**
 * Configure the default DVS endpoint used by all subsequent launchDive calls.
 * Call once at app startup (or whenever the active environment changes).
 * Per-call `baseUrl` in launchDive options overrides this default.
 */
export function configureDiveEnvironment(env) {
  currentEnvironment = {
    ...env
  };
}
export function getDiveEnvironment() {
  return {
    ...currentEnvironment
  };
}

/** @internal — merges per-call value with global default; normalises trailing slash. */
export function resolveBaseUrl(perCall) {
  // Treat empty string the same as absent so callers can safely pass `options.baseUrl ?? ''`
  const raw = (perCall || undefined) ?? currentEnvironment.baseUrl;
  return raw ? raw.replace(/\/+$/, '') : undefined;
}

/** @internal */
export function resolveUserAgent(perCall) {
  return perCall ?? currentEnvironment.userAgent;
}
//# sourceMappingURL=environment.js.map