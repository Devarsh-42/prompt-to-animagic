import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Download } from "lucide-react";

interface VideoPreviewProps {
  videoUrl?: string;
  code?: string;
}

const VideoPreview = ({ videoUrl, code }: VideoPreviewProps) => {
  const hasVideo = !!videoUrl;

  return (
    <section aria-labelledby="preview" className="mx-auto mt-8 w-full max-w-3xl">
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-medium">Preview</h2>

          {hasVideo ? (
            <div className="overflow-hidden rounded-md border">
              <video
                src={videoUrl}
                controls
                className="h-auto w-full bg-secondary"
                aria-label="Generated Manim video preview"
              />
            </div>
          ) : (
            <div className="relative grid place-items-center rounded-md border bg-gradient-to-b from-background to-secondary/40 p-10 text-center">
              <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" style={{ background: "var(--gradient-primary)" }} />
              <p className="max-w-md text-sm text-muted-foreground">
                Your video will appear here after generation. Paste a prompt and click Generate.
              </p>
            </div>
          )}

          {code && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Manim Python code</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "manim_scene.py";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-1 h-4 w-4" /> Download
                </Button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-md border bg-secondary/40 p-3 text-xs">
                <code>
                  {code}
                </code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default VideoPreview;
