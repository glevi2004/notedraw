import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SettingsShell } from "./components/SettingsShell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <Suspense fallback={null}>
      <SettingsShell>{children}</SettingsShell>
    </Suspense>
  );
}
