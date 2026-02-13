"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Link2,
  LogOut,
  Mail,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyUserVisualsUpdated } from "@/lib/sidebar-sync";

function SettingsRow({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="grid gap-5 py-6 border-t border-border md:grid-cols-[260px_1fr]">
      <div>
        <h2
          className={`text-lg font-semibold ${
            danger ? "text-destructive" : "text-foreground"
          }`}
        >
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user } = useUser();
  const clerk = useClerk();
  const [status, setStatus] = useState<string | null>(null);
  const previousImageUrlRef = useRef<string | null | undefined>(undefined);

  const fullName = user?.fullName || user?.username || "User";
  const email = user?.emailAddresses[0]?.emailAddress || "No email";

  useEffect(() => {
    const currentImageUrl = user?.imageUrl ?? null;

    if (previousImageUrlRef.current === undefined) {
      previousImageUrlRef.current = currentImageUrl;
      return;
    }

    if (previousImageUrlRef.current !== currentImageUrl) {
      notifyUserVisualsUpdated(user?.id ?? null);
      previousImageUrlRef.current = currentImageUrl;
    }
  }, [user?.id, user?.imageUrl]);

  const linkedAccounts = useMemo(() => {
    const accounts = (user?.externalAccounts || []) as Array<{
      provider?: string | null;
      emailAddress?: string | null;
    }>;
    if (accounts.length > 0) {
      return accounts.map((account) => ({
        email: account.emailAddress || email,
        provider: account.provider || "unknown",
      }));
    }
    return [{ email, provider: "email" }];
  }, [email, user?.externalAccounts]);

  const openClerkAccountUI = () => {
    const openUserProfile = (clerk as any)?.openUserProfile as
      | (() => void)
      | undefined;
    if (openUserProfile) {
      openUserProfile();
      return;
    }
    setStatus("Account linking will be available soon.");
  };

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account details and sign-in options.
        </p>
      </div>

      <section className="mt-2">
        <SettingsRow
          title="Profile Picture"
          description="Upload a profile picture."
        >
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border bg-secondary flex items-center justify-center text-lg font-semibold text-foreground">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                fullName.slice(0, 1).toUpperCase()
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={openClerkAccountUI}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Profile Name"
          description="Change your profile name."
        >
          <div className="h-12 rounded-lg border border-border bg-background px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-base text-foreground truncate">{fullName}</span>
            </div>
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </div>
        </SettingsRow>

        <SettingsRow
          title="Account email"
          description="Change your account email address."
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-base text-foreground">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{email}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Email changes are currently disabled in this build.
            </p>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Linked accounts"
          description="See your connected sign-in accounts."
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] px-4 py-3 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Email</span>
              <span>Sign-in provider</span>
            </div>
            {linkedAccounts.map((account, index) => (
              <div
                key={`${account.email}-${account.provider}-${index}`}
                className="grid grid-cols-[1fr_auto] items-center px-4 py-4 border-t border-border text-sm"
              >
                <span className="text-foreground truncate">{account.email}</span>
                <span className="text-muted-foreground">{account.provider}</span>
              </div>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow
          title="Connect more sign-in providers"
          description="Link another provider to your account."
        >
          <Button type="button" onClick={openClerkAccountUI}>
            <Link2 className="w-4 h-4 mr-2" />
            Connect sign-in provider
          </Button>
        </SettingsRow>

        <SettingsRow title="Sign out" description="Sign out from this account.">
          <Button
            type="button"
            variant="secondary"
            onClick={() => clerk.signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </SettingsRow>

        <SettingsRow
          title="Delete account"
          description="Deleting your account permanently erases your data. This action is irreversible."
          danger
        >
          <Button type="button" variant="destructive" disabled>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete account (coming soon)
          </Button>
        </SettingsRow>
      </section>

      {status ? (
        <p className="text-sm text-muted-foreground px-1">{status}</p>
      ) : null}
    </div>
  );
}
