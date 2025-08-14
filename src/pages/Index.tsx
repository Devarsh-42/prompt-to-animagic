import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import PromptForm from "@/components/PromptForm";
import VideoPreview from "@/components/VideoPreview";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    setVideoUrl(null);
    setGeneratedCode(null);
    setIsGenerating(true);
  };

  const handleSuccess = (url: string, code?: string) => {
    setVideoUrl(url);
    setGeneratedCode(code || null);
    setIsGenerating(false);
  };

  const handleError = (message: string) => {
    console.error(message);
    setIsGenerating(false);
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
      <SEO
        title="Prompt to Animagic - AI-Powered Algorithm Visualizations"
        description="Transform any algorithm or data structure problem into stunning Manim animations using AI. Generate educational videos instantly."
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Prompt to Animagic</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-white text-sm">
                Welcome, {user.email}
              </span>
            )}
            <Button onClick={handleAuthAction} variant="outline">
              {user ? 'Sign Out' : 'Sign In'}
            </Button>
          </div>
        </div>

        <HeroSection onCTAClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })} />

        <main>
          <div ref={formRef}>
            {user ? (
              <>
                <PromptForm
                  onStart={handleStart}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
                <VideoPreview
                  videoUrl={videoUrl}
                  code={generatedCode}
                  isGenerating={isGenerating}
                />
              </>
            ) : (
              <div className="text-center mt-12">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Sign in to start generating videos
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Create an account to generate and save your algorithm visualizations.
                  </p>
                  <Button onClick={() => setAuthModalOpen(true)} className="w-full">
                    Get Started
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default Index;
