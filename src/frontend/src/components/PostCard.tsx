import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Post } from "../backend";
import { useActor } from "../hooks/useActor";

interface PostCardProps {
  post: Post;
  likeCount: bigint;
  hasLiked: boolean;
  commentCount: number;
  firstComment?: string;
  navigate: (view: AppView, profilePrincipal?: string) => void;
  onOpenModal: (post: Post) => void;
  onLikeToggled: (postId: bigint, liked: boolean, newCount: bigint) => void;
}

export default function PostCard({
  post,
  likeCount,
  hasLiked,
  commentCount,
  firstComment,
  navigate,
  onOpenModal,
  onLikeToggled,
}: PostCardProps) {
  const { actor } = useActor();
  const [likeAnimating, setLikeAnimating] = useState(false);

  const formattedTime = formatRelativeTime(post.timestamp);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actor) return;
    setLikeAnimating(true);
    const newLiked = !hasLiked;
    const newCount = newLiked ? likeCount + 1n : likeCount - 1n;
    onLikeToggled(post.id, newLiked, newCount < 0n ? 0n : newCount);
    try {
      await actor.toggleLike(post.id);
    } catch {
      onLikeToggled(post.id, hasLiked, likeCount);
      toast.error("Failed to toggle like");
    } finally {
      setTimeout(() => setLikeAnimating(false), 300);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  return (
    <div
      data-ocid="feed.post.card"
      className="pixora-card overflow-hidden animate-fade-in cursor-pointer group"
    >
      {/* Post header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          type="button"
          data-ocid="feed.post.author.button"
          onClick={() => navigate("user-profile", post.author.toString())}
          className="flex items-center gap-2.5 min-w-0"
        >
          <Avatar className="w-9 h-9 shrink-0 border border-border">
            <AvatarImage src={undefined} />
            <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
              {post.authorUsername?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {post.authorUsername}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {formattedTime}
            </p>
          </div>
        </button>
        <button
          type="button"
          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Post image - clickable to open modal */}
      <button
        type="button"
        className="relative overflow-hidden bg-muted mx-3 rounded-xl w-[calc(100%-1.5rem)] block"
        onClick={() => onOpenModal(post)}
      >
        <img
          src={post.image.getDirectURL()}
          alt={post.caption || "Post image"}
          className="w-full object-cover max-h-[420px] transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
      </button>

      {/* Actions row */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-ocid="feed.post.like.button"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-all",
                hasLiked
                  ? "text-destructive"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-transform",
                  likeAnimating && "scale-125",
                  hasLiked && "fill-current",
                )}
              />
              <span>{likeCount.toString()}</span>
            </button>
            <button
              type="button"
              data-ocid="feed.post.comment.button"
              onClick={() => onOpenModal(post)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{commentCount}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Caption + comment preview */}
        {(post.caption || firstComment) && (
          <div className="mt-2 pb-3">
            {post.caption && (
              <p className="text-sm text-foreground">
                <span className="font-semibold mr-1">
                  {post.authorUsername}
                </span>
                <span className="text-foreground/90">{post.caption}</span>
              </p>
            )}
            {firstComment && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {firstComment}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
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
