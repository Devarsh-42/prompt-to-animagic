import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Code, Video } from "lucide-react";

interface HeroSectionProps {
  onCTAClick?: () => void;
}

const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  return (
    <section className="text-center py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm border border-white/20 mb-6">
          <Zap className="mr-2 h-4 w-4" />
          Powered by AI and Manim
        </div>

        <h1 className="mb-6 text-4xl md:text-6xl font-bold tracking-tight text-white">
          Transform Algorithms into
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {" "}
            Beautiful Animations
          </span>
        </h1>

        <p className="mb-8 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          Paste any algorithm problem or data structure concept and watch it come
          to life with professional Manim animations powered by AI. Perfect for
          learning, teaching, and presentations.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button
            size="lg"
            className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
            onClick={onCTAClick}
          >
            Start Creating
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
            <Button
            size="lg"
            variant="outline"
            className="bg-black text-white border-white/20 hover:bg-white/10"
            >
            View Examples
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <Code className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
            <h3 className="text-white font-semibold mb-2">
              AI-Powered Generation
            </h3>
            <p className="text-gray-400 text-sm">
              Advanced AI understands your problem and generates clean,
              educational Manim code automatically.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <Video className="h-8 w-8 text-pink-400 mb-4 mx-auto" />
            <h3 className="text-white font-semibold mb-2">Instant Visualization</h3>
            <p className="text-gray-400 text-sm">
              Watch your algorithms come to life with smooth animations, perfect
              for understanding complex concepts.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <Zap className="h-8 w-8 text-blue-400 mb-4 mx-auto" />
            <h3 className="text-white font-semibold mb-2">Ready to Share</h3>
            <p className="text-gray-400 text-sm">
              Get high-quality MP4 videos ready for presentations, social media,
              or educational content.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
