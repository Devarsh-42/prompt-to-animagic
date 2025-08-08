import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface PromptFormProps {
  onStart?: () => void;
  onProgress?: (status: string) => void;
  onSuccess?: (videoUrl: string, code?: string) => void;
  onError?: (message: string) => void;
}

const PromptForm = ({ onStart, onProgress, onSuccess, onError }: PromptFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gemini-1.5-pro");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const simulateProgress = async () => {
    const steps = [
      { p: 25, s: "Generating Manim code with AI" },
      { p: 60, s: "Rendering frames" },
      { p: 85, s: "Encoding video" },
      { p: 100, s: "Finalizing" },
    ];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 700));
      setProgress(step.p);
      setStatus(step.s);
      onProgress?.(step.s);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please paste a problem statement or prompt.");
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatus("Starting generation");
    onStart?.();

    try {
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

      if (!url || !key) {
        throw new Error("Supabase not connected");
      }

      onProgress?.("Generating Manim code with AI");
      setStatus("Generating Manim code with AI");
      setProgress(30);

      const res = await fetch(`${url}/functions/v1/generate-manim-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ prompt, model }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setStatus("Rendering video");
      setProgress(70);

      const data = await res.json();
      const videoUrl = data.videoUrl as string | undefined;
      const code = data.code as string | undefined;

      setStatus("Done");
      setProgress(100);

      if (videoUrl) {
        toast.success("Video ready!");
        onSuccess?.(videoUrl, code);
      } else {
        toast.info("Received response, but no video URL. Showing preview placeholder.");
        onSuccess?.("", code);
      }
    } catch (err: any) {
      await simulateProgress();
      const msg =
        "Backend not connected yet. Click the Supabase button (top-right) to connect, then try again.";
      toast.warning(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
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
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{status}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="hero" className="flex-1" disabled={loading}>
                Generate video
              </Button>
              <Button type="button" variant="outline" onClick={() => setPrompt("")}>Clear</Button>
            </div>

            <p id="how-it-works" className="mt-2 text-xs text-muted-foreground">
              We generate Manim Python code from your prompt using the selected model, then render and stream the video back.
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default PromptForm;
