import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasWorkspaceMembership } from '@/lib/auth';
import LandingPage from '@/sections/LandingPage';

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function Page({ searchParams }: PageProps) {
  const { userId } = await auth();
  const forceLanding = searchParams?.landing === 'true';

  if (userId && !forceLanding) {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/');
    }

    const isOnboarded = await hasWorkspaceMembership(user.id);
    redirect(isOnboarded ? '/dashboard' : '/onboarding');
  }

  return <LandingPage />;
}
