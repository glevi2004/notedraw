import { Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "Notedraw changed how our team brainstorms. We sketch ideas on the canvas and attach detailed notes right where they belong — no more switching between a whiteboard and a doc.",
    author: "Sarah K.",
    role: "Product Manager",
    company: "Tech Startup"
  },
  {
    quote: "The AI assistant is surprisingly useful. I asked it to reorganize my architecture diagram and it moved everything into a clean layout in seconds.",
    author: "Marcus T.",
    role: "Software Engineer",
  },
  {
    quote: "I use Notedraw for everything from meeting notes to system design. The combination of freehand drawing and rich notes is exactly what I've been looking for.",
    author: "Elena R.",
    role: "Engineering Lead",
    company: "Design Agency"
  },
  {
    quote: "Real-time collaboration on diagrams without any setup? That alone made it worth switching. My distributed team loves it.",
    author: "James L.",
    role: "Team Lead",
  },
  {
    quote: "As a visual thinker, I need tools that let me sketch freely but also keep structured notes. Notedraw nails both.",
    author: "Priya M.",
    role: "UX Designer",
  },
  {
    quote: "We replaced three separate tools with Notedraw. Diagramming, note-taking, and AI assistance in one place — it just works.",
    author: "David C.",
    role: "CTO",
    company: "SaaS Company"
  }
];

export default function Testimonials() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Trust Badge */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-foreground">
            Loved by teams who think visually.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-border/80 transition-all duration-300 hover:shadow-lg"
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 text-muted-foreground/20">
                <Quote className="w-8 h-8" />
              </div>

              {/* Quote Text */}
              <blockquote className="text-sm text-foreground leading-relaxed mb-6 relative z-10">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                    {testimonial.company && `, ${testimonial.company}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
