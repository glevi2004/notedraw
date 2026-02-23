import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import SceneDemo from '@/sections/SceneDemo';
import Features from '@/sections/Features';
import CTA from '@/sections/CTA';
import Footer from '@/sections/Footer';

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <SceneDemo />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
