import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser, hasWorkspaceMembership } from '@/lib/auth';
import { DashboardClient } from './components/DashboardClient';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const isOnboarded = await hasWorkspaceMembership(user.id);
  if (!isOnboarded) {
    redirect('/onboarding');
  }

  return (
    <Suspense fallback={null}>
      <DashboardClient />
    </Suspense>
  );
}
