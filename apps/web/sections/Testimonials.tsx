import { Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatar?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "The difference between batches is night and day, adoption jumped from single digits to over 80%. It's spreading like wildfire, the best developers are using Cursor.",
    author: "Diana Hu",
    role: "General Partner",
    company: "Y Combinator"
  },
  {
    quote: "Without a doubt, the most valuable AI tool I currently pay for is Cursor. It's fast, autocompletes exactly when and where you need it, handles brackets properly, has sensible keyboard shortcuts, and supports bring-your-own-model... every aspect is polished.",
    author: "shadcn",
    role: "Creator of shadcn/ui"
  },
  {
    quote: "The best LLM applications provide an 'autonomy slider': you decide how much autonomy to give the AI. In Cursor, you can use Tab completion, directed editing with Cmd+K, or enable fully autonomous agent mode.",
    author: "Andrej Karpathy",
    role: "CEO",
    company: "Eureka Labs"
  },
  {
    quote: "Cursor grew quickly at Stripe from a few hundred extremely enthusiastic employees to over a thousand. We invest more in R&D and software creation than any other project, and making that process more efficient and productive has significant economic returns.",
    author: "Stripe Engineering",
    role: "Engineering Team"
  },
  {
    quote: "Can officially say it. I hate coding by feel. I love coding with Cursor Tab completion. It's insane. Being a programmer is genuinely becoming more fun.",
    author: "Developer",
    role: "Software Engineer"
  },
  {
    quote: "You no longer have to scroll through pages of documentation, but focus more on what you actually want to happen. We're only touching 1% of what's possible, and models like GPT-5 shine brightest in interactive experiences like Cursor.",
    author: "AI Researcher",
    role: "ML Engineer"
  }
];

export default function Testimonials() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Trust Badge */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-foreground">
            Trusted by millions of professional developers every day.
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
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
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
