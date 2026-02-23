import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 md:px-8 pt-36 pb-14">
      <div className="flex flex-col items-center gap-y-4 text-center">
        {/* Main Headline */}
        <h1
          className="text-4xl font-medium lg:text-6xl"
          style={{ letterSpacing: '-1.28px', lineHeight: 1.25 }}
        >
          AI Powered Canvas
        </h1>

        {/* Separator */}
        <hr className="w-[40%] border-t border-border m-0" />

        {/* Description */}
        <p className="text-[15px] opacity-50 lg:text-[22px] max-w-2xl mt-[-8px]">
          Draw diagrams, add rich notes, and let AI help you think —
          <br className="hidden lg:block" /> all on one infinite canvas.
        </p>

        {/* Single CTA */}
        <Button
          className="inline-flex h-10 lg:h-11 items-center rounded-md bg-foreground px-6 text-sm text-background hover:bg-foreground/90"
          asChild
        >
          <a href="/dashboard">Get Started</a>
        </Button>
      </div>
    </section>
  );
}
