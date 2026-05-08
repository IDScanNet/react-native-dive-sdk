export interface DiveEnvironment {
    /** Default DVS endpoint for all launchDive calls. Per-call baseUrl overrides this. */
    baseUrl?: string;
    /** Default user agent (Android only; ignored on iOS). */
    userAgent?: string;
}
/**
 * Configure the default DVS endpoint used by all subsequent launchDive calls.
 * Call once at app startup (or whenever the active environment changes).
 * Per-call `baseUrl` in launchDive options overrides this default.
 */
export declare function configureDiveEnvironment(env: DiveEnvironment): void;
export declare function getDiveEnvironment(): DiveEnvironment;
/** @internal — merges per-call value with global default; normalises trailing slash. */
export declare function resolveBaseUrl(perCall?: string): string | undefined;
/** @internal */
export declare function resolveUserAgent(perCall?: string): string | undefined;
//# sourceMappingURL=environment.d.ts.map