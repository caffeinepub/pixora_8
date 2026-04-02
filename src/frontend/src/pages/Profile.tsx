import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Post, Profile as ProfileType } from "../backend";
import PostModal from "../components/PostModal";
import ProfileHeader from "../components/ProfileHeader";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface ProfilePageProps {
  principal?: string;
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

interface PostMeta {
  likeCount: bigint;
  hasLiked: boolean;
}

export default function Profile({ principal, navigate }: ProfilePageProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState<bigint>(0n);
  const [followingCount, setFollowingCount] = useState<bigint>(0n);
  const [isFollowing, setIsFollowing] = useState(false);
  const [postMeta, setPostMeta] = useState<Record<string, PostMeta>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const myPrincipalStr = identity?.getPrincipal().toString();
  const isOwnProfile = !principal || principal === myPrincipalStr;

  const targetPrincipal = useMemo(() => {
    if (isOwnProfile) return identity?.getPrincipal() ?? null;
    if (principal) {
      try {
        return Principal.fromText(principal);
      } catch {
        return null;
      }
    }
    return null;
  }, [isOwnProfile, identity, principal]);

  useEffect(() => {
    if (!actor || !targetPrincipal) return;

    const load = async () => {
      setLoading(true);
      try {
        const [profileData, userPosts, followerCnt, followingCnt] =
          await Promise.all([
            actor.getUserProfile(targetPrincipal),
            actor.getPostsByUser(targetPrincipal),
            actor.getFollowerCount(targetPrincipal),
            actor.getFollowingCount(targetPrincipal),
          ]);

        const sortedPosts = userPosts.sort((a, b) =>
          Number(b.timestamp - a.timestamp),
        );

        let followingState = false;
        if (!isOwnProfile) {
          followingState = await actor.isFollowing(targetPrincipal);
        }

        setProfile(profileData);
        setPosts(sortedPosts);
        setFollowerCount(followerCnt);
        setFollowingCount(followingCnt);
        setIsFollowing(followingState);

        // Load post meta
        const metaEntries = await Promise.all(
          sortedPosts.map(async (post) => {
            const [likeCount, hasLiked] = await Promise.all([
              actor.getLikeCount(post.id),
              actor.hasLiked(post.id),
            ]);
            return [post.id.toString(), { likeCount, hasLiked }] as const;
          }),
        );
        setPostMeta(Object.fromEntries(metaEntries));
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [actor, targetPrincipal, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!actor || !targetPrincipal) return;
    try {
      await actor.toggleFollow(targetPrincipal);
      const newFollowing = !isFollowing;
      setIsFollowing(newFollowing);
      setFollowerCount((prev) =>
        newFollowing ? prev + 1n : prev > 0n ? prev - 1n : 0n,
      );
    } catch {
      toast.error("Failed to update follow status");
    }
  };

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto" data-ocid="profile.loading_state">
        <div className="flex items-start gap-6 py-4">
          <Skeleton className="w-20 h-20 rounded-full bg-muted" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-5 w-32 rounded bg-muted" />
            <div className="flex gap-5">
              <Skeleton className="h-8 w-14 rounded bg-muted" />
              <Skeleton className="h-8 w-14 rounded bg-muted" />
              <Skeleton className="h-8 w-14 rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        postCount={posts.length}
        followerCount={followerCount}
        followingCount={followingCount}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
      />

      <div className="border-t border-border my-4" />

      {posts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="profile.posts.empty_state"
        >
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3 opacity-60">
            <span className="text-xl">📷</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? "Share your first photo!" : "No posts yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1" data-ocid="profile.posts.table">
          {posts.map((post, idx) => (
            <motion.button
              type="button"
              key={post.id.toString()}
              data-ocid={`profile.posts.item.${idx + 1}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className="aspect-square relative overflow-hidden rounded-sm bg-muted group cursor-pointer"
              onClick={() => {
                setSelectedPost(post);
                setModalOpen(true);
              }}
            >
              <img
                src={post.image.getDirectURL()}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </motion.button>
          ))}
        </div>
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedPost(null);
          }}
          likeCount={postMeta[selectedPost.id.toString()]?.likeCount ?? 0n}
          hasLiked={postMeta[selectedPost.id.toString()]?.hasLiked ?? false}
          navigate={navigate}
          onLikeToggled={handleLikeToggled}
        />
      )}
    </div>
  );
}
