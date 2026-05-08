export interface DiveEnvironment {
  /** Default DVS endpoint for all launchDive calls. Per-call baseUrl overrides this. */
  baseUrl?: string;
  /** Default user agent (Android only; ignored on iOS). */
  userAgent?: string;
}

let currentEnvironment: DiveEnvironment = {};

/**
 * Configure the default DVS endpoint used by all subsequent launchDive calls.
 * Call once at app startup (or whenever the active environment changes).
 * Per-call `baseUrl` in launchDive options overrides this default.
 */
export function configureDiveEnvironment(env: DiveEnvironment): void {
  currentEnvironment = { ...env };
}

export function getDiveEnvironment(): DiveEnvironment {
  return { ...currentEnvironment };
}

/** @internal — merges per-call value with global default; normalises trailing slash. */
export function resolveBaseUrl(perCall?: string): string | undefined {
  // Treat empty string the same as absent so callers can safely pass `options.baseUrl ?? ''`
  const raw = (perCall || undefined) ?? currentEnvironment.baseUrl;
  return raw ? raw.replace(/\/+$/, '') : undefined;
}

/** @internal */
export function resolveUserAgent(perCall?: string): string | undefined {
  return perCall ?? currentEnvironment.userAgent;
}
