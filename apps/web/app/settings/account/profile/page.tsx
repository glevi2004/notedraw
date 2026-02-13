"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function ProfileSettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const fullName = user?.fullName || user?.username || "User";
  const email = user?.emailAddresses[0]?.emailAddress || "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account information and sign-in identity.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex items-center justify-center text-lg font-semibold">
            {fullName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{fullName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => user?.reload()}>
            Refresh profile
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-destructive/30 bg-card p-6 space-y-2">
        <h2 className="text-sm font-medium text-foreground">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          Account deletion workflow will be wired to Clerk account removal in a
          dedicated confirmation flow.
        </p>
        <Button variant="destructive" disabled>
          Delete account (coming soon)
        </Button>
      </section>
    </div>
  );
}
