import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, Play, Loader2, Code2, Video } from "lucide-react";
import { toast } from "sonner";

interface VideoPreviewProps {
  videoUrl: string | null;
  code: string | null;
  isGenerating: boolean;
}

const VideoPreview = ({ videoUrl, code, isGenerating }: VideoPreviewProps) => {
  const [activeTab, setActiveTab] = useState<"video" | "code">("video");

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard!");
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = `manim_animation_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Video download started!");
    }
  };

  // Show loading state while generating
  if (isGenerating) {
    return (
      <section className="mx-auto mt-8 w-full max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px]">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-purple-500/20" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Generating Your Animation</h3>
                <p className="text-muted-foreground max-w-md">
                  AI is analyzing your prompt and creating beautiful Manim code.
                  This usually takes 30-60 seconds.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
                <span>Processing with Manim...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Show empty state when no content is available
  if (!videoUrl && !code) {
    return (
      <section className="mx-auto mt-8 w-full max-w-4xl">
        <Card className="border-dashed">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px] text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Ready to Create</h3>
                <p className="text-muted-foreground max-w-md">
                  Enter an algorithm or data structure problem above to generate your first animation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Generated Animation
            </CardTitle>
            <div className="flex items-center gap-2">
              {videoUrl && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Video className="h-3 w-3 mr-1" />
                  Video Ready
                </Badge>
              )}
              {code && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Code2 className="h-3 w-3 mr-1" />
                  Code Generated
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "video" | "code")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="video" disabled={!videoUrl}>
                <Video className="h-4 w-4 mr-2" />
                Video Preview
              </TabsTrigger>
              <TabsTrigger value="code" disabled={!code}>
                <Code2 className="h-4 w-4 mr-2" />
                Generated Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-6">
              {videoUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      poster="/api/placeholder/800/450"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={downloadVideo} size="lg" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download Video
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No video generated</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="mt-6">
              {code ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Manim Python Code</h3>
                    <Button onClick={copyCode} variant="outline" size="sm" className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </Button>
                  </div>
                  <ScrollArea className="h-96 w-full rounded-md border">
                    <pre className="p-4 text-sm">
                      <code className="language-python">{code}</code>
                    </pre>
                  </ScrollArea>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>To run this code manually:</strong></p>
                    <code className="bg-muted px-2 py-1 rounded">
                      python -m manim -pql yourfile.py SceneName
                    </code>
                  </div>
                </div>
              ) : (
                <div className="h-96 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Code2 className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No code generated</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
};

export default VideoPreview;
