import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
export const runtime = "nodejs";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * GET /api/cron/cleanup
 *
 * Daily maintenance job — scheduled via vercel.json crons at 02:00 UTC.
 * Protected by a CRON_SECRET environment variable that Vercel automatically
 * sets as `Authorization: Bearer <secret>` on cron-triggered requests.
 *
 * Tasks:
 *   1. Expire PENDING WorkspaceInvitations whose expiresAt is in the past.
 *   2. Delete expired/revoked ShareSnapshot rows and their Vercel Blob objects.
 *   3. Revoke CollabRoom records that have been inactive for > 30 days.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

  const results = {
    invitationsExpired: 0,
    snapshotsDeleted: 0,
    collabRoomsArchived: 0,
    errors: [] as string[],
  };

  // ── 1. Expire overdue PENDING invitations ──────────────────────────────
  try {
    const { count } = await db.workspaceInvitation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    results.invitationsExpired = count;
  } catch (err) {
    results.errors.push(`invitations: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Delete expired/revoked ShareSnapshots and their Blob objects ────
  try {
    const staleSnapshots = await db.shareSnapshot.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null } },
        ],
      },
      select: { id: true, blobPath: true },
    });

    for (const snapshot of staleSnapshots) {
      try {
        await del(snapshot.blobPath);
      } catch {
        // Blob may already be gone — proceed with DB row deletion anyway
      }
      await db.shareSnapshot.delete({ where: { id: snapshot.id } });
      results.snapshotsDeleted += 1;
    }
  } catch (err) {
    results.errors.push(`snapshots: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Archive collab rooms inactive for > 30 days ─────────────────────
  try {
    const { count } = await db.collabRoom.updateMany({
      where: {
        revokedAt: null,
        lastActiveAt: { lt: thirtyDaysAgo },
      },
      data: { revokedAt: now },
    });
    results.collabRoomsArchived = count;
  } catch (err) {
    results.errors.push(`collabRooms: ${err instanceof Error ? err.message : String(err)}`);
  }

  const hasErrors = results.errors.length > 0;
  return NextResponse.json(
    { ok: !hasErrors, ...results },
    { status: hasErrors ? 207 : 200 },
  );
}
