import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AppView } from "../App";
import type { Post } from "../backend";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import { useActor } from "../hooks/useActor";

interface FeedProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

interface PostMeta {
  likeCount: bigint;
  hasLiked: boolean;
  commentCount: number;
  firstComment: string;
}

export default function Feed({ navigate }: FeedProps) {
  const { actor } = useActor();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMeta, setPostMeta] = useState<Record<string, PostMeta>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!actor) return;
    const load = async () => {
      setLoading(true);
      try {
        const allPosts = await actor.getAllPosts();
        const sorted = allPosts.sort((a, b) =>
          Number(b.timestamp - a.timestamp),
        );
        setPosts(sorted);

        // Load meta for all posts in parallel
        const metaEntries = await Promise.all(
          sorted.map(async (post) => {
            const [likeCount, hasLiked, comments] = await Promise.all([
              actor.getLikeCount(post.id),
              actor.hasLiked(post.id),
              actor.getComments(post.id),
            ]);
            const firstComment = comments[0]?.text ?? "";
            return [
              post.id.toString(),
              {
                likeCount,
                hasLiked,
                commentCount: comments.length,
                firstComment,
              } as PostMeta,
            ] as const;
          }),
        );
        setPostMeta(Object.fromEntries(metaEntries));
      } catch (err) {
        console.error("Failed to load feed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actor]);

  const handleLikeToggled = (
    postId: bigint,
    liked: boolean,
    newCount: bigint,
  ) => {
    const key = postId.toString();
    setPostMeta((prev) => ({
      ...prev,
      [key]: { ...prev[key], hasLiked: liked, likeCount: newCount },
    }));
  };

  const openModal = (post: Post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPost(null);
  };

  if (loading) {
    return (
      <div
        className="max-w-xl mx-auto space-y-4"
        data-ocid="feed.loading_state"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="pixora-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <Skeleton className="w-9 h-9 rounded-full bg-muted" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded bg-muted" />
                <Skeleton className="h-2.5 w-16 rounded bg-muted" />
              </div>
            </div>
            <Skeleton className="h-64 mx-3 rounded-xl bg-muted" />
            <div className="px-4 py-3">
              <Skeleton className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div
        className="max-w-xl mx-auto flex flex-col items-center justify-center py-20 text-center"
        data-ocid="feed.empty_state"
      >
        <div className="w-16 h-16 rounded-2xl avatar-fallback-gradient flex items-center justify-center mb-4 opacity-50">
          <span className="text-white text-2xl">📷</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No posts yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Be the first to share something!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto space-y-5">
        <AnimatePresence>
          {posts.map((post, idx) => {
            const meta = postMeta[post.id.toString()] ?? {
              likeCount: 0n,
              hasLiked: false,
              commentCount: 0,
              firstComment: "",
            };
            return (
              <motion.div
                key={post.id.toString()}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                data-ocid={`feed.post.item.${idx + 1}`}
              >
                <PostCard
                  post={post}
                  likeCount={meta.likeCount}
                  hasLiked={meta.hasLiked}
                  commentCount={meta.commentCount}
                  firstComment={meta.firstComment}
                  navigate={navigate}
                  onOpenModal={openModal}
                  onLikeToggled={handleLikeToggled}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          open={modalOpen}
          onClose={closeModal}
          likeCount={postMeta[selectedPost.id.toString()]?.likeCount ?? 0n}
          hasLiked={postMeta[selectedPost.id.toString()]?.hasLiked ?? false}
          navigate={navigate}
          onLikeToggled={handleLikeToggled}
        />
      )}
    </>
  );
}
