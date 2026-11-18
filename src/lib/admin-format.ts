export const dh = (n: number | undefined | null) =>
  n === undefined || n === null
    ? "—"
    : `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(n)} DH`;

export const dateTime = (ts: number) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(ts));

export const dateOnly = (ts: number) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Africa/Casablanca" }).format(new Date(ts));

/** yyyy-mm-dd for <input type="date"> */
export const toDateInput = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : "");
export const fromDateInput = (s: string, endOfDay = false) =>
  s ? new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime() : undefined;
