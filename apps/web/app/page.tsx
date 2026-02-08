import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import DesktopEditorDemo from '@/sections/DesktopEditorDemo';
import Features from '@/sections/Features';
import Testimonials from '@/sections/Testimonials';
import Changelog from '@/sections/Changelog';
import CTA from '@/sections/CTA';
import Footer from '@/sections/Footer';

export default function HomePage() {
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
