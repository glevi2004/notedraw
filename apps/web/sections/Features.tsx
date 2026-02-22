import { PenTool, Sparkles, Users } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <PenTool className="w-5 h-5" />,
    title: 'Draw and think together',
    description:
      'An infinite canvas powered by Excalidraw where you can sketch diagrams and attach rich notes to any element. Perfect for brainstorming, planning, and documentation.',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'AI-powered scene assistant',
    description:
      'Ask AI to help organize your diagrams, suggest improvements, or explain what your scene represents. It can even add and rearrange elements for you.',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Collaborate in real-time',
    description:
      'Share a link and work together on the same canvas. See cursors, edits, and changes as they happen — no setup required.',
  },
];

export default function Features() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Everything you need to think visually
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notedraw combines freehand drawing, structured notes, and AI into one seamless workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl border border-border hover:border-border/80 transition-all duration-300 hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              {/* Placeholder for screenshot */}
              <div className="mt-4 rounded-lg bg-secondary/50 border border-border/50 aspect-video flex items-center justify-center">
                <span className="text-xs text-muted-foreground">App screenshot coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
