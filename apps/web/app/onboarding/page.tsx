import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser, hasWorkspaceMembership } from "@/lib/auth";
import { OnboardingWorkspaceForm } from "./OnboardingWorkspaceForm";

function deriveWorkspaceName(args: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const displayName =
    args.firstName ||
    args.lastName ||
    args.email?.split("@")[0] ||
    "My";
  return `${displayName}'s Workspace`;
}

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const isOnboarded = await hasWorkspaceMembership(user.id);
  if (isOnboarded) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWorkspaceForm
      initialWorkspaceName={deriveWorkspaceName({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      })}
    />
  );
}
