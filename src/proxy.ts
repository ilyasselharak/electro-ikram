import type { NextFetchEvent, NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isAuthRoute = createRouteMatcher(["/admin(.*)", "/api(.*)"]);
const isAdminPublicRoute = createRouteMatcher(["/admin/login", "/admin/forgot-password"]);

/** Admin pages and the auth API, with the admin session kept in cookies. */
async function adminProxy(request: NextRequest, event: NextFetchEvent) {
  let redirect: Response | undefined;

  const response = await convexAuthNextjsMiddleware(
    async (req, { convexAuth }) => {
      const { pathname } = req.nextUrl;
      // Auth API proxy is handled by convexAuthNextjsMiddleware itself.
      if (pathname.startsWith("/api")) return;

      const authenticated = await convexAuth.isAuthenticated();
      if (isAdminPublicRoute(req)) {
        if (authenticated) redirect = nextjsMiddlewareRedirect(req, "/admin");
      } else if (!authenticated) {
        redirect = nextjsMiddlewareRedirect(req, `/admin/login?next=${encodeURIComponent(pathname)}`);
      }
      // Role checks happen in Convex on every admin query/mutation.
      return redirect;
    },
    { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
  )(request, event);

  // When it refreshes or clears the session, Convex Auth replaces our response
  // with NextResponse.next(), losing the redirect: keep it, with its cookies.
  if (redirect && response && response !== redirect) {
    for (const cookie of response.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
    return redirect;
  }
  return response;
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // The storefront keeps customer sessions in the browser, not in cookies, so
  // it only needs language routing.
  return isAuthRoute(request) ? adminProxy(request, event) : intlMiddleware(request);
}

export const config = {
  // Everything except Next internals, metadata routes and static files.
  matcher: ["/((?!_next|_vercel|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)", "/api/auth"],
};
