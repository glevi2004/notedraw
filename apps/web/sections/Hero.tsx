import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-start gap-6 py-12 md:py-16">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight max-w-4xl leading-tight">
            Think visually. Notes meet diagrams.
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl">
            Draw diagrams, add rich notes, and let AI help you think — all on one infinite canvas.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-11 text-sm font-medium"
              asChild
            >
              <a href="#demo">
                Try the demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6 h-11 text-sm font-medium"
              asChild
            >
              <a href="/dashboard">
                Get started
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
