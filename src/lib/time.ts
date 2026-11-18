/** Request-time clock for server components (kept out of render bodies for purity lint). */
export function serverNow() {
  return Date.now();
}
