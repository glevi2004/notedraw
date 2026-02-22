import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import SceneDemo from '@/sections/SceneDemo';
import Features from '@/sections/Features';
import Testimonials from '@/sections/Testimonials';
import CTA from '@/sections/CTA';
import Footer from '@/sections/Footer';

export default function LandingStandalonePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <SceneDemo />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
