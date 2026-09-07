/**
 * Browser troubleshooting logs.
 *
 * Set DEBUG_LOGGING to true when you need F12 console details again
 * (sentence generation, cache hits, correct answers, etc.).
 * Keep this false in production so players cannot read the answer in DevTools.
 */
export const DEBUG_LOGGING = false;

export function debugLog(...args: unknown[]): void {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}

export function debugWarn(...args: unknown[]): void {
  if (DEBUG_LOGGING) {
    console.warn(...args);
  }
}
