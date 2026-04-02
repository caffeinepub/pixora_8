import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Comment, Post } from "../backend";
import { useActor } from "../hooks/useActor";

interface PostModalProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  likeCount: bigint;
  hasLiked: boolean;
  navigate: (view: AppView, profilePrincipal?: string) => void;
  onLikeToggled: (postId: bigint, liked: boolean, newCount: bigint) => void;
}

export default function PostModal({
  post,
  open,
  onClose,
  likeCount,
  hasLiked,
  navigate,
  onLikeToggled,
}: PostModalProps) {
  const { actor } = useActor();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!post || !actor || !open) return;
    const load = async () => {
      setCommentsLoading(true);
      try {
        const data = await actor.getComments(post.id);
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setCommentsLoading(false);
      }
    };
    load();
  }, [post, actor, open]);

  const handleLike = async () => {
    if (!actor || !post) return;
    const newLiked = !hasLiked;
    const newCount = newLiked ? likeCount + 1n : likeCount - 1n;
    onLikeToggled(post.id, newLiked, newCount < 0n ? 0n : newCount);
    try {
      await actor.toggleLike(post.id);
    } catch {
      onLikeToggled(post.id, hasLiked, likeCount);
      toast.error("Failed to toggle like");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !post || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await actor.addComment(post.id, commentText.trim());
      const updated = await actor.getComments(post.id);
      setComments(updated);
      setCommentText("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="post.modal"
        className="max-w-3xl p-0 bg-card border-border overflow-hidden rounded-2xl gap-0"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex flex-col md:flex-row h-full">
          {/* Image side */}
          <div className="md:w-1/2 bg-muted flex items-center justify-center shrink-0 min-h-48">
            <img
              src={post.image.getDirectURL()}
              alt={post.caption}
              className="w-full h-full object-cover max-h-[70vh]"
            />
          </div>

          {/* Right side */}
          <div className="md:w-1/2 flex flex-col min-h-0 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("user-profile", post.author.toString());
                }}
                className="flex items-center gap-2.5"
              >
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
                    {post.authorUsername?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground">
                  {post.authorUsername}
                </span>
              </button>
              <button
                type="button"
                data-ocid="post.modal.close_button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-3 space-y-3">
                {/* Caption as first item */}
                {post.caption && (
                  <div className="flex gap-2.5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
                        {post.authorUsername?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-foreground mr-1">
                          {post.authorUsername}
                        </span>
                        <span className="text-foreground/90">
                          {post.caption}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(post.timestamp)}
                      </p>
                    </div>
                  </div>
                )}

                {commentsLoading ? (
                  <div
                    className="py-4 text-center"
                    data-ocid="post.comments.loading_state"
                  >
                    <p className="text-xs text-muted-foreground">
                      Loading comments...
                    </p>
                  </div>
                ) : comments.length === 0 ? (
                  <div
                    className="py-4 text-center"
                    data-ocid="post.comments.empty_state"
                  >
                    <p className="text-xs text-muted-foreground">
                      No comments yet. Be the first!
                    </p>
                  </div>
                ) : (
                  comments.map((comment, idx) => (
                    <div
                      key={comment.id.toString()}
                      className="flex gap-2.5"
                      data-ocid={`post.comment.item.${idx + 1}`}
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
                          {comment.authorUsername?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold text-foreground mr-1">
                            {comment.authorUsername}
                          </span>
                          <span className="text-foreground/90">
                            {comment.text}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(comment.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Actions + comment input */}
            <div className="shrink-0 border-t border-border">
              <div className="px-4 py-2 flex items-center gap-4">
                <button
                  type="button"
                  data-ocid="post.modal.like.button"
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors",
                    hasLiked
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Heart
                    className={cn("w-5 h-5", hasLiked && "fill-current")}
                  />
                  <span>{likeCount.toString()}</span>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={handleComment}
                className="px-4 pb-4 flex items-center gap-2"
              >
                <Input
                  ref={commentInputRef}
                  data-ocid="post.comment.input"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-9 bg-muted border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  data-ocid="post.comment.submit_button"
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={!commentText.trim() || submitting}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatRelativeTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const now = Date.now();
  const diff = Math.floor((now - ms) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
