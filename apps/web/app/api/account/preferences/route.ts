import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const preference = await db.userPreference.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json(
      preference || {
        userId: user.id,
        theme: "SYSTEM",
      },
    );
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { theme } = body as { theme?: "SYSTEM" | "LIGHT" | "DARK" };

    if (!theme || !["SYSTEM", "LIGHT", "DARK"].includes(theme)) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    const preference = await db.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        theme,
      },
      update: {
        theme,
      },
    });

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
