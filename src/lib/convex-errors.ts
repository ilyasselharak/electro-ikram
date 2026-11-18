import { ConvexError } from "convex/values";

export type ErrorData = { code?: string; message?: string; [k: string]: unknown };

/** Extracts structured data from a ConvexError (or a generic error). */
export function errorData(err: unknown): ErrorData {
  if (err instanceof ConvexError) {
    const d = err.data as unknown;
    if (typeof d === "string") return { message: d };
    if (d && typeof d === "object") return d as ErrorData;
  }
  if (err instanceof Error) return { message: err.message };
  return {};
}

export function errorMessage(err: unknown, fallback = "Une erreur est survenue.") {
  const d = errorData(err);
  if (d.message && !d.message.includes("Server Error")) return d.message;
  return fallback;
}
