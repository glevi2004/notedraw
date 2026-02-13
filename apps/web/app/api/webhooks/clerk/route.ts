import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ensureDefaultWorkspaceForUser } from "@/lib/auth";

function deriveWorkspaceName(args: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const display =
    args.firstName ||
    args.lastName ||
    args.email?.split("@")[0] ||
    "My";
  return `${display}'s Workspace`;
}

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let event: WebhookEvent;
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return new Response("Error occurred", { status: 400 });
  }

  const eventType = event.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = event.data;
    const email = email_addresses[0]?.email_address || null;

    try {
      const user = await db.user.create({
        data: {
          clerkId: id,
          email,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

      await ensureDefaultWorkspaceForUser(
        user.id,
        deriveWorkspaceName({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }),
      );
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = event.data;
    const email = email_addresses[0]?.email_address || null;

    try {
      const user = await db.user.upsert({
        where: { clerkId: id },
        create: {
          clerkId: id,
          email,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
        update: {
          email,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

      await ensureDefaultWorkspaceForUser(
        user.id,
        deriveWorkspaceName({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }),
      );
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Error updating user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = event.data;

    try {
      await db.user.delete({
        where: { clerkId: id },
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
