import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { getUserVideos, VideoRecord } from "@/lib/videoStorage"; // <-- import correct type
import { Video, Code2 } from "lucide-react";
import { toast } from "sonner";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const [videos, setVideos] = useState<VideoRecord[]>([]); // <-- typed instead of any[]
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserVideos();
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load your videos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
          <DialogDescription>
            {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Your generated videos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : videos.length === 0 ? (
                <div className="text-sm text-muted-foreground">No saved videos yet.</div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {videos.map((v: VideoRecord) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-20 bg-black rounded overflow-hidden">
                            {v.video_url ? (
                              <img src="/api/thumbnail-placeholder.png" alt={v.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                <Video className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{v.title || "Untitled"}</div>
                            <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {v.video_url && (
                            <a href={v.video_url} target="_blank" rel="noreferrer" className="text-sm underline">
                              View
                            </a>
                          )}
                          {v.code && (
                            <a
                              href={`data:text/plain;charset=utf-8,${encodeURIComponent(v.code)}`}
                              download={`${(v.title || "animation").replace(/\s+/g, "_")}.py`}
                              className="text-sm underline flex items-center gap-1"
                            >
                              <Code2 className="h-4 w-4" /> Code
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { signOut(); onClose(); }}>Sign out</Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountModal;