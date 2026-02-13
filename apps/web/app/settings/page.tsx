import { redirect } from "next/navigation";

export default async function SettingsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (workspaceId) {
    redirect(`/settings/workspace/settings?workspaceId=${workspaceId}`);
  }

  redirect("/settings/workspace/settings");
}
