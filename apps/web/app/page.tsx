import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasWorkspaceMembership } from '@/lib/auth';
import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import DesktopEditorDemo from '@/sections/DesktopEditorDemo';
import Features from '@/sections/Features';
import Testimonials from '@/sections/Testimonials';
import Changelog from '@/sections/Changelog';
import CTA from '@/sections/CTA';
import Footer from '@/sections/Footer';

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function LandingPage({ searchParams }: PageProps) {
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

  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <DesktopEditorDemo />
        <Features />
        <Testimonials />
        <Changelog />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
