import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

interface HeroSectionProps {
  onCTAClick?: () => void;
}

const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <header className="relative overflow-hidden">
      {/* Ambient gradient field (signature moment) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]"
        style={{
          background:
            "radial-gradient(1200px 400px at 50% -10%, hsl(var(--brand-2)/0.25), transparent 60%), radial-gradient(900px 300px at 80% 20%, hsl(var(--brand-1)/0.2), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center">
        <span className="inline-block rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-foreground/80">
          AI + Manim Visuals for DSA
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Transform problem statements into explainer videos
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Paste a LeetCode or custom prompt — we craft Manim code and a clean
          visualization to help you learn and teach algorithms.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="hero" size="lg" onClick={onCTAClick}>
            Start generating <ArrowRight className="ml-1" />
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
