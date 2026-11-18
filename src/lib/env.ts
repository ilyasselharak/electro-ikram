import { z } from "zod";

/**
 * Validates public environment variables at startup so a misconfigured
 * deployment fails loudly instead of rendering broken pages.
 * Server-side secrets (Cloudinary, Resend, JWT keys) live on the Convex
 * deployment and are validated there when used.
 */
const schema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.url({ message: "NEXT_PUBLIC_CONVEX_URL must be the Convex deployment URL" }),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}\nSee .env.example.`,
  );
}

export const env = parsed.data;
