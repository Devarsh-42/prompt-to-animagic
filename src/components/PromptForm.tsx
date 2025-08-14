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
  const [model, setModel] = useState("gemini-2.0-flash");
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
            const overallProgress = 25 + (videoProgress * 0.65); // Reserve 10% for upload
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

        // Step 3: Upload video to Supabase
        if (videoResult.videoUrl) {
          setStatus("Uploading video to cloud storage...");
          setProgress(90);
          onProgress?.("Uploading video to cloud storage...");

          try {
            // Fetch the video file from local server
            const videoResponse = await fetch(videoResult.videoUrl);
            if (!videoResponse.ok) {
              throw new Error('Failed to fetch video file');
            }
            
            const videoBlob = await videoResponse.blob();
            const fileName = `animation_${Date.now()}.mp4`;
            
            // Extract title from prompt (first 50 characters)
            const title = prompt.substring(0, 50).trim() + (prompt.length > 50 ? '...' : '');
            
            const uploadResult = await uploadVideoToSupabase(videoBlob, fileName, {
              title,
              prompt,
              code: result.code
            });

            if (uploadResult) {
              setProgress(100);
              setStatus("Video uploaded successfully!");
              toast.success("Video generated and saved successfully!");
              onSuccess?.(uploadResult.video_url, result.code);
            } else {
              toast.warning("Video generated but upload failed. Showing local version.");
              onSuccess?.(videoResult.videoUrl, result.code);
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            toast.warning("Video generated but upload failed. Showing local version.");
            onSuccess?.(videoResult.videoUrl, result.code);
          }
        } else {
          toast.info("Code generated successfully. Showing code preview.");
          onSuccess?.("", result.code);
        }
        
        setLoading(false);
        return;

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
    <section aria-labelledby="generator" className="mx-auto mt-8 w-full max-w-3xl">
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
                className="min-h-32"
              />
            </div>

            <div className="grid gap-2">
              <Label>AI model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">gemini-2.0-flash</SelectItem>
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
              <Button type="submit" variant="hero" className="flex-1" disabled={loading}>
                {loading ? "Generating..." : "Generate video"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPrompt("")} disabled={loading}>
                Clear
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              We generate Manim Python code from your prompt, then execute it to create and render the animation video.
              Videos are automatically saved to your account.
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default PromptForm;
