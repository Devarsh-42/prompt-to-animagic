import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { generateManimCode } from "@/lib/gemini";
import { executeManimCode } from "@/lib/manimExecutor";
import { uploadVideoToSupabase } from "@/lib/videoStorage";

interface PromptFormProps {
  onStart?: () => void;
  onProgress?: (status: string) => void;
  onSuccess?: (videoUrl: string, code?: string) => void;
  onError?: (message: string) => void;
}

const PromptForm = ({ onStart, onProgress, onSuccess, onError }: PromptFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash-exp");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please paste a problem statement or prompt.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatus("Starting generation");
    onStart?.();

    const maxRetries = 2;
    let currentAttempt = 0;

    while (currentAttempt <= maxRetries) {
      try {
        // Step 1: Generate Manim code with AI
        const attemptMsg = currentAttempt > 0 ? ` (Attempt ${currentAttempt + 1})` : "";
        setStatus(`Generating Manim code with AI${attemptMsg}`);
        setProgress(15);
        onProgress?.(`Generating Manim code with AI${attemptMsg}`);

        const result = await generateManimCode(prompt, model);
        
        if (!result.code) {
          throw new Error("No code generated");
        }

        setStatus("Code generated, preparing video rendering");
        setProgress(25);
        onProgress?.("Code generated, preparing video rendering");

        // Step 2: Execute Manim code and generate video
        const videoResult = await executeManimCode(
          result.code,
          (videoProgress, videoStatus) => {
            // Reserve 25% for upload to Supabase
            const overallProgress = 25 + (videoProgress * 0.50);
            setProgress(overallProgress);
            setStatus(videoStatus);
            onProgress?.(videoStatus);
          }
        );

        console.log('Video execution result:', videoResult);

        if (!videoResult.success) {
          const errorMessage = videoResult.error || "Video generation failed";
          console.error('Video generation failed:', errorMessage);
          
          if (currentAttempt < maxRetries && (
            errorMessage.includes("TypeError") || 
            errorMessage.includes("SyntaxError") ||
            errorMessage.includes("move_to")
          )) {
            console.log(`Retrying due to syntax error. Attempt ${currentAttempt + 1} of ${maxRetries}`);
            currentAttempt++;
            continue;
          }
          
          if (result.code) {
            toast.error(`Video generation failed: ${errorMessage}. Showing code instead.`);
            onSuccess?.("", result.code);
            setLoading(false);
            return;
          }
          
          throw new Error(errorMessage);
        }

        // Step 3: Upload video to Supabase (this is the key part!)
        if (videoResult.videoUrl) {
          setStatus("Downloading video from server...");
          setProgress(75);
          onProgress?.("Downloading video from server...");

          try {
            // Fetch the video file from local server
            console.log('Fetching video from:', videoResult.videoUrl);
            const videoResponse = await fetch(videoResult.videoUrl);
            
            if (!videoResponse.ok) {
              throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
            }
            
            const videoBlob = await videoResponse.blob();
            console.log('Video blob size:', videoBlob.size, 'bytes');
            
            if (videoBlob.size === 0) {
              throw new Error('Downloaded video file is empty');
            }

            setStatus("Uploading to cloud storage...");
            setProgress(85);
            onProgress?.("Uploading to cloud storage...");
            
            const fileName = `animation_${Date.now()}.mp4`;
            
            // Extract title from prompt (first 50 characters)
            const title = prompt.substring(0, 50).trim() + (prompt.length > 50 ? '...' : '');
            
            console.log('Uploading to Supabase with metadata:', { title, fileName });
            
            const uploadResult = await uploadVideoToSupabase(videoBlob, fileName, {
              title,
              prompt,
              code: result.code
            });

            if (uploadResult) {
              setProgress(95);
              setStatus("Upload successful, finalizing...");
              
              console.log('Upload successful:', uploadResult);
              
              // Small delay to show completion
              setTimeout(() => {
                setProgress(100);
                setStatus("Video ready in cloud storage!");
                toast.success("Video generated and saved to your account!");
                onSuccess?.(uploadResult.video_url, result.code);
                setLoading(false);
              }, 500);
            } else {
              console.warn('Upload failed, falling back to local video');
              toast.warning("Video generated but upload failed. Showing local version.");
              setProgress(100);
              onSuccess?.(videoResult.videoUrl, result.code);
              setLoading(false);
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Upload failed: ${uploadError.message}. Showing local version.`);
            setProgress(100);
            onSuccess?.(videoResult.videoUrl, result.code);
            setLoading(false);
          }
        } else {
          toast.info("Code generated successfully. Showing code preview.");
          setProgress(100);
          onSuccess?.("", result.code);
          setLoading(false);
        }
        
        return; // Exit the retry loop on success

      } catch (error: unknown) {
        console.error(`Error in video generation (attempt ${currentAttempt + 1}):`, error);
        
        if (currentAttempt < maxRetries) {
          currentAttempt++;
          continue;
        }
        
        const msg = error instanceof Error ? error.message : "Failed to generate video";
        toast.error(`${msg} (after ${maxRetries + 1} attempts)`);
        onError?.(msg);
        setLoading(false);
        return;
      }
    }
  };

  return (
    <section aria-labelledby="generator" className="mx-auto mt-8 w-full max-w-4xl"> {/* adjusted to match VideoPreview */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt">Problem statement or prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste a LeetCode problem statement or describe the algorithm you want visualized..."
                className="min-h-[220px] resize-y" /* taller consistent height */
              />
            </div>

            <div className="grid gap-2">
              <Label>AI model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Latest)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{status}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" disabled={loading}>
                {loading ? "Generating..." : "Generate video"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPrompt("")} disabled={loading}>
                Clear
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              We generate Manim Python code from your prompt, then execute it to create and render the animation video.
              Videos are automatically saved to your cloud storage account.
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default PromptForm;
