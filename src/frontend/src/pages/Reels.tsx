import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Film,
  Heart,
  Loader2,
  MessageCircle,
  PlusCircle,
  Send,
  Share2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import { ExternalBlob } from "../backend";
import type { backendInterface as FullBackend } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface ReelsProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

type Reel = Awaited<ReturnType<FullBackend["getAllReels"]>>[number];
type ReelComment = Awaited<ReturnType<FullBackend["getReelComments"]>>[number];

interface ReelMeta {
  likeCount: bigint;
  hasLiked: boolean;
}

function ReelSkeleton() {
  return (
    <div
      className="relative w-full bg-card rounded-2xl overflow-hidden"
      style={{ height: "calc(100vh - 160px)", minHeight: 400, maxHeight: 760 }}
    >
      <Skeleton className="absolute inset-0 bg-muted" />
      <div className="absolute bottom-6 left-4 right-16 space-y-2">
        <Skeleton className="h-3 w-24 bg-muted/70 rounded" />
        <Skeleton className="h-2.5 w-48 bg-muted/50 rounded" />
      </div>
      <div className="absolute bottom-6 right-4 flex flex-col gap-5 items-center">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-full bg-muted/70" />
        ))}
      </div>
    </div>
  );
}

function ReelCard({
  reel,
  meta,
  onLike,
  onCommentOpen,
  navigate,
}: {
  reel: Reel;
  meta: ReelMeta;
  onLike: (reelId: bigint) => void;
  onCommentOpen: (reel: Reel) => void;
  navigate: (view: AppView, profilePrincipal?: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLike = () => {
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);
    onLike(reel.id);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div
      className="relative w-full bg-black rounded-2xl overflow-hidden flex-shrink-0"
      style={{ height: "calc(100vh - 160px)", minHeight: 400, maxHeight: 760 }}
      data-ocid={`reels.item.${Number(reel.id)}`}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video.getDirectURL()}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none" />

      {/* Bottom left: author + caption */}
      <div className="absolute bottom-6 left-4 right-20 z-10">
        <button
          type="button"
          className="flex items-center gap-2 mb-2 group"
          onClick={() => navigate("user-profile", reel.author.toString())}
        >
          <Avatar className="w-8 h-8 border-2 border-white/80">
            <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-bold">
              {reel.authorUsername[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-white drop-shadow group-hover:underline">
            @{reel.authorUsername}
          </span>
        </button>
        {reel.caption && (
          <p className="text-sm text-white/90 leading-snug line-clamp-3 drop-shadow">
            {reel.caption}
          </p>
        )}
      </div>

      {/* Right side: action buttons */}
      <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          type="button"
          data-ocid="reels.like.toggle"
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={likeAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Heart
              className={cn(
                "w-7 h-7 drop-shadow transition-colors",
                meta.hasLiked
                  ? "fill-red-500 text-red-500"
                  : "text-white fill-none",
              )}
            />
          </motion.div>
          <span className="text-xs text-white font-semibold drop-shadow">
            {Number(meta.likeCount)}
          </span>
        </button>

        {/* Comment */}
        <button
          type="button"
          data-ocid="reels.comment.button"
          onClick={() => onCommentOpen(reel)}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow" />
          <span className="text-xs text-white font-semibold drop-shadow">
            Comments
          </span>
        </button>

        {/* Share */}
        <button
          type="button"
          data-ocid="reels.share.button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <Share2 className="w-7 h-7 text-white drop-shadow" />
          <span className="text-xs text-white font-semibold drop-shadow">
            Share
          </span>
        </button>
      </div>
    </div>
  );
}

function CommentSheet({
  reel,
  open,
  onClose,
}: {
  reel: Reel | null;
  open: boolean;
  onClose: () => void;
}) {
  const { actor: _actor } = useActor();
  const actor = _actor as unknown as FullBackend | null;
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !reel || !actor) return;
    const load = async () => {
      setLoadingComments(true);
      try {
        const data = await actor.getReelComments(reel.id);
        setComments(data);
      } catch {
        toast.error("Failed to load comments.");
      } finally {
        setLoadingComments(false);
      }
    };
    load();
  }, [open, reel, actor]);

  const handlePost = async () => {
    if (!actor || !reel || !commentText.trim()) return;
    setPosting(true);
    try {
      await actor.addReelComment(reel.id, commentText.trim());
      const updated = await actor.getReelComments(reel.id);
      setComments(updated);
      setCommentText("");
      toast.success("Comment added!");
    } catch {
      toast.error("Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-t border-border rounded-t-2xl h-[60vh] flex flex-col"
        data-ocid="reels.comments.sheet"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-foreground text-base">
            Comments
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-2">
          {loadingComments ? (
            <div
              className="space-y-3 py-2"
              data-ocid="reels.comments.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full bg-muted shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20 rounded bg-muted" />
                    <Skeleton className="h-2.5 w-40 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div
              className="py-10 text-center text-muted-foreground text-sm"
              data-ocid="reels.comments.empty_state"
            >
              No comments yet. Be the first!
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {comments.map((c, idx) => (
                <motion.div
                  key={c.id.toString()}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-3"
                  data-ocid={`reels.comment.item.${idx + 1}`}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
                      {c.authorUsername[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      @{c.authorUsername}
                    </p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {c.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
        {/* Comment input */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Input
            data-ocid="reels.comment.input"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePost()}
            className="flex-1 bg-muted border-border rounded-xl text-sm"
            disabled={posting}
          />
          <Button
            size="sm"
            data-ocid="reels.comment.submit_button"
            onClick={handlePost}
            disabled={!commentText.trim() || posting}
            className="rounded-xl px-3"
          >
            {posting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UploadReelDialog({
  onCreated,
}: {
  onCreated: (reel: Reel) => void;
}) {
  const { actor: _actor } = useActor();
  const actor = _actor as unknown as FullBackend | null;
  const [open, setOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setVideoFile(file);
  };

  const handleUpload = async () => {
    if (!actor || !videoFile) return;
    setUploading(true);
    setProgress(0);
    try {
      const buf = await videoFile.arrayBuffer();
      const bytes = new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setProgress(pct),
      );
      const newId = await actor.createReel(blob, caption.trim());
      toast.success("Reel uploaded!");
      // Reload the new reel info
      const allReels = await actor.getAllReels();
      const created = allReels.find((r) => r.id === newId);
      if (created) onCreated(created);
      setOpen(false);
      setVideoFile(null);
      setVideoPreview(null);
      setCaption("");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-xl gap-1.5"
          data-ocid="reels.upload.open_modal_button"
        >
          <PlusCircle className="w-4 h-4" />
          New Reel
        </Button>
      </DialogTrigger>
      <DialogContent
        className="bg-card border-border rounded-2xl max-w-md"
        data-ocid="reels.upload.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Reel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Video picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Video</Label>
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  src={videoPreview}
                  controls
                  muted
                  playsInline
                  className="w-full max-h-60 object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVideoPreview(null);
                    setVideoFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
                data-ocid="reels.upload.dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tap to select video
                </p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
              data-ocid="reels.upload.upload_button"
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Caption
            </Label>
            <Textarea
              data-ocid="reels.upload.textarea"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-muted border-border rounded-xl text-sm resize-none"
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
                data-ocid="reels.upload.loading_state"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-muted" />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            className="w-full rounded-xl"
            data-ocid="reels.upload.submit_button"
            disabled={!videoFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Reel"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Reels({ navigate }: ReelsProps) {
  const { actor: _actor } = useActor();
  const actor = _actor as unknown as FullBackend | null;
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelMeta, setReelMeta] = useState<Record<string, ReelMeta>>({});
  const [loading, setLoading] = useState(true);
  const [commentReel, setCommentReel] = useState<Reel | null>(null);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);

  useEffect(() => {
    if (!actor) return;
    const load = async () => {
      setLoading(true);
      try {
        const all = await actor.getAllReels();
        const sorted = all.sort((a, b) => Number(b.timestamp - a.timestamp));
        setReels(sorted);
        const metaEntries = await Promise.all(
          sorted.map(async (reel) => {
            const [likeCount, hasLiked] = await Promise.all([
              actor.getReelLikeCount(reel.id),
              actor.hasLikedReel(reel.id),
            ]);
            return [reel.id.toString(), { likeCount, hasLiked }] as const;
          }),
        );
        setReelMeta(Object.fromEntries(metaEntries));
      } catch (err) {
        console.error("Failed to load reels", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actor]);

  const handleLike = async (reelId: bigint) => {
    if (!actor) return;
    const key = reelId.toString();
    const prev = reelMeta[key];
    if (!prev) return;
    const newLiked = !prev.hasLiked;
    const newCount = newLiked ? prev.likeCount + 1n : prev.likeCount - 1n;
    // Optimistic update
    setReelMeta((m) => ({
      ...m,
      [key]: { hasLiked: newLiked, likeCount: newCount },
    }));
    try {
      await actor.toggleReelLike(reelId);
    } catch {
      // Revert on failure
      setReelMeta((m) => ({ ...m, [key]: prev }));
      toast.error("Failed to toggle like.");
    }
  };

  const handleCommentOpen = (reel: Reel) => {
    setCommentReel(reel);
    setCommentSheetOpen(true);
  };

  const handleReelCreated = (reel: Reel) => {
    setReels((prev) => [reel, ...prev]);
    setReelMeta((m) => ({
      ...m,
      [reel.id.toString()]: { likeCount: 0n, hasLiked: false },
    }));
  };

  return (
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reels</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Short videos from the community
          </p>
        </div>
        <UploadReelDialog onCreated={handleReelCreated} />
      </div>

      {/* Reel list */}
      {loading ? (
        <div className="space-y-4" data-ocid="reels.loading_state">
          {[1, 2].map((i) => (
            <ReelSkeleton key={i} />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
          data-ocid="reels.empty_state"
        >
          <Film className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No reels yet
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Be the first to share a short video!
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {reels.map((reel, idx) => (
              <motion.div
                key={reel.id.toString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.35 }}
              >
                <ReelCard
                  reel={reel}
                  meta={
                    reelMeta[reel.id.toString()] ?? {
                      likeCount: 0n,
                      hasLiked: false,
                    }
                  }
                  onLike={handleLike}
                  onCommentOpen={handleCommentOpen}
                  navigate={navigate}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Comment sheet */}
      <CommentSheet
        reel={commentReel}
        open={commentSheetOpen}
        onClose={() => {
          setCommentSheetOpen(false);
          setCommentReel(null);
        }}
      />
    </div>
  );
}
