import { Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-start gap-6 py-12 md:py-16">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight max-w-4xl leading-tight">
            Memory for AI Agents
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button 
              size="lg" 
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-11 text-sm font-medium"
            >
              <Download className="w-4 h-4 mr-2" />
              Download for macOS
            </Button>
            
            <button className="flex items-center gap-1 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full border border-border hover:bg-secondary">
              <ChevronDown className="w-4 h-4" />
              Other platforms
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
