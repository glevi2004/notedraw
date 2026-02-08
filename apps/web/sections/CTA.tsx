import { Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTA() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-6">
          Try Cursor today.
        </h2>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
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
    </section>
  );
}
