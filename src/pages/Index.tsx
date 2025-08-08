import { useState, useRef } from "react";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import PromptForm from "@/components/PromptForm";
import VideoPreview from "@/components/VideoPreview";

const Index = () => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [code, setCode] = useState<string | undefined>(undefined);
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="DSA Video Visualizer | Manim-powered Explanations"
        description="Turn DSA prompts into crisp Manim videos. Paste a LeetCode problem and get an AI-generated visualization."
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "DSA Video Visualizer",
          url: "/",
          potentialAction: {
            "@type": "SearchAction",
            target: "/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />

      <HeroSection onCTAClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })} />

      <main>
        <div ref={formRef}>
          <PromptForm
            onSuccess={(url, generatedCode) => {
              setVideoUrl(url);
              setCode(generatedCode);
            }}
          />
        </div>
        <VideoPreview videoUrl={videoUrl} code={code} />

        <section className="mx-auto my-16 w-full max-w-4xl px-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <article className="rounded-lg border bg-card p-5 shadow-sm">
              <h3 className="font-medium">1. Prompt</h3>
              <p className="mt-1 text-sm text-muted-foreground">Paste a DSA problem statement or describe the visualization you need.</p>
            </article>
            <article className="rounded-lg border bg-card p-5 shadow-sm">
              <h3 className="font-medium">2. Generate</h3>
              <p className="mt-1 text-sm text-muted-foreground">We ask the AI for Manim code tailored to your prompt and render it.</p>
            </article>
            <article className="rounded-lg border bg-card p-5 shadow-sm">
              <h3 className="font-medium">3. Watch & Share</h3>
              <p className="mt-1 text-sm text-muted-foreground">Preview the result, download the Python, and share the video.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
