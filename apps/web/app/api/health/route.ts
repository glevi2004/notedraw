import { NextResponse } from "next/server";
export const runtime = "nodejs";

/**
 * GET /api/health
 *
 * Lightweight liveness probe for uptime monitoring (Betterstack, UptimeRobot, etc.).
 * Returns the deployed git commit SHA so you can confirm which version is running.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
