"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  CreditCard,
  Download,
  FileUp,
  FolderOpen,
  Logs,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/app/dashboard/components/DashboardSidebar";

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  needsWorkspace?: boolean;
}

const workspaceItems: SettingsNavItem[] = [
  {
    title: "Settings",
    href: "/settings/workspace/settings",
    icon: Settings,
    needsWorkspace: true,
  },
  {
    title: "Members",
    href: "/settings/workspace/members",
    icon: Users,
    needsWorkspace: true,
  },
  {
    title: "Teams & Collections",
    href: "/settings/workspace/teams-collections",
    icon: FolderOpen,
    needsWorkspace: true,
  },
  {
    title: "Workspace export",
    href: "/settings/workspace/export",
    icon: Download,
    needsWorkspace: true,
  },
  {
    title: "Workspace import",
    href: "/settings/workspace/import",
    icon: FileUp,
    needsWorkspace: true,
  },
  {
    title: "Logs",
    href: "/settings/workspace/logs",
    icon: Logs,
    needsWorkspace: true,
  },
  {
    title: "AI",
    href: "/settings/workspace/ai",
    icon: Bot,
    needsWorkspace: true,
  },
];

const subscriptionItems: SettingsNavItem[] = [
  {
    title: "Billing",
    href: "/settings/subscription/billing",
    icon: Wallet,
    needsWorkspace: true,
  },
  {
    title: "Manage Subscription",
    href: "/settings/subscription/manage-subscription",
    icon: CreditCard,
    needsWorkspace: true,
  },
];

const accountItems: SettingsNavItem[] = [
  {
    title: "Profile",
    href: "/settings/account/profile",
    icon: User,
  },
  {
    title: "Preferences",
    href: "/settings/account/preferences",
    icon: Settings,
  },
];

function SettingsNavSection({
  title,
  items,
  pathname,
  workspaceId,
}: {
  title: string;
  items: SettingsNavItem[];
  pathname: string;
  workspaceId: string | null;
}) {
  return (
    <div className="space-y-1">
      <h3 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {items.map((item) => {
        const targetHref =
          item.needsWorkspace && workspaceId
            ? `${item.href}?workspaceId=${workspaceId}`
            : item.href;
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={targetHref}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  return (
    <DashboardSidebar
      mode="settings"
      settingsNav={
        <div className="space-y-6">
          <div className="px-3 pt-1">
            <h2 className="text-base font-semibold text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Workspace and account configuration
            </p>
          </div>

          <SettingsNavSection
            title="Workspace Settings"
            items={workspaceItems}
            pathname={pathname}
            workspaceId={workspaceId}
          />

          <SettingsNavSection
            title="Subscription"
            items={subscriptionItems}
            pathname={pathname}
            workspaceId={workspaceId}
          />

          <SettingsNavSection
            title="User Account"
            items={accountItems}
            pathname={pathname}
            workspaceId={workspaceId}
          />
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-8">
          {children}
        </div>
      </div>
    </DashboardSidebar>
  );
}
