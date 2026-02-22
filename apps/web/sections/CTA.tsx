import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTA() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
          Start drawing your ideas.
        </h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          Diagrams, notes, and AI — all in one place. Free to get started.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-11 text-sm font-medium"
            asChild
          >
            <a href="/dashboard">
              Sign up for free
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-6 h-11 text-sm font-medium"
            asChild
          >
            <a href="#demo">
              Try the demo
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
