import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/share(.*)",
  "/api/share(.*)",
  "/api/collab/files(.*)",
]);

// Webhook routes accept POST from external servers (Clerk/Svix) — exclude from CSRF check.
const isWebhookRoute = createRouteMatcher(["/api/webhooks/(.*)"]);

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF protection: for state-mutating requests on authenticated API routes, verify
 * that the Origin header (always set by browsers for cross-origin requests) matches
 * the request host. This blocks cross-site form-submission and credentialed-fetch
 * attacks even if Clerk's SameSite=Lax cookie is sent by the browser.
 *
 * Exclusions:
 *  - Public routes (no auth, no sensitive state)
 *  - Webhook routes (POST from external servers with different origins)
 *  - Requests with no Origin header (same-origin requests, curl, server-to-server)
 */
function csrfCheck(req: Request): NextResponse | null {
  if (!MUTATION_METHODS.has(req.method)) return null;

  const origin = req.headers.get("origin");
  if (!origin) return null; // no Origin = same-origin or non-browser; allow

  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (originHost !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  if (!isWebhookRoute(req)) {
    const csrfError = csrfCheck(req);
    if (csrfError) return csrfError;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
