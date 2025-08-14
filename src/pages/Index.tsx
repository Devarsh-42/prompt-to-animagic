import React, { useRef, useState } from "react";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import PromptForm from "@/components/PromptForm";
import VideoPreview from "@/components/VideoPreview";
import { AuthModal } from "@/components/AuthModal"; // <-- changed to named import
import AccountModal from "@/components/AccountModal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const Index = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, signOut } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    setVideoUrl(null);
    setGeneratedCode(null);
    setIsGenerating(true);
  };

  const handleSuccess = (url: string, code?: string) => {
    setVideoUrl(url || null);
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
        title="AlgoCanvas"
        description="See algorithms come to life."
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">AlgoCanvas</h1>
          </div>

          <div className="flex items-center space-x-4">
            {!user && (
              <Button onClick={() => setAuthModalOpen(true)}>Sign in</Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-haspopup="menu"
                    aria-expanded="false"
                    className="flex items-center gap-3 rounded-full hover:bg-white/5 px-2 py-1"
                    title={user.email}
                  >
                    <Avatar size={36} name={user.email || user.id} className="ring-1 ring-white/10" />
                    <span className="text-sm text-white/90 hidden sm:inline">{user.email?.split("@")[0]}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setAccountOpen(true)}>My Account</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <HeroSection onCTAClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })} />

        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div ref={formRef} className="w-full">
            <PromptForm
              onStart={handleStart}
              onProgress={(status) => console.log(status)}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>

          <div className="w-full">
            <VideoPreview videoUrl={videoUrl} code={generatedCode} isGenerating={isGenerating} />
          </div>
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <AccountModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
      />
    </div>
  );
};

export default Index;
