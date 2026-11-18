import createIntlMiddleware from "next-intl/middleware";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminPublicRoute = createRouteMatcher(["/admin/login", "/admin/forgot-password"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const { pathname } = request.nextUrl;

    // Auth API proxy is handled by convexAuthNextjsMiddleware itself.
    if (pathname.startsWith("/api")) return;

    if (isAdminRoute(request)) {
      const authenticated = await convexAuth.isAuthenticated();
      if (isAdminPublicRoute(request)) {
        if (authenticated) return nextjsMiddlewareRedirect(request, "/admin");
        return;
      }
      if (!authenticated) {
        return nextjsMiddlewareRedirect(request, `/admin/login?next=${encodeURIComponent(pathname)}`);
      }
      // Role checks happen in Convex on every admin query/mutation.
      return;
    }

    return intlMiddleware(request);
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  // Everything except Next internals, metadata routes and static files.
  matcher: ["/((?!_next|_vercel|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)", "/api/auth"],
};
