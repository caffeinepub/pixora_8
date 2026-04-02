import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import { Search as SearchIcon, Users2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Post, Profile } from "../backend";
import PostModal from "../components/PostModal";
import { useActor } from "../hooks/useActor";

interface SearchProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

interface UserResult {
  principal: Principal;
  profile: Profile;
  isFollowing: boolean;
}

interface PostMeta {
  likeCount: bigint;
  hasLiked: boolean;
}

export default function Search({ navigate }: SearchProps) {
  const { actor } = useActor();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMeta, setPostMeta] = useState<Record<string, PostMeta>>({});
  const [searching, setSearching] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>(
    {},
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search
  useEffect(() => {
    if (!actor || !debouncedQuery) {
      setUsers([]);
      setPosts([]);
      setPostMeta({});
      return;
    }

    const run = async () => {
      setSearching(true);
      try {
        const [userResults, postResults] = await Promise.all([
          actor.searchUsers(debouncedQuery),
          actor.searchPosts(debouncedQuery),
        ]);

        // Fetch follow state for each user
        const usersWithFollow = await Promise.all(
          userResults.map(async ([principal, profile]) => {
            try {
              const following = await actor.isFollowing(principal);
              return { principal, profile, isFollowing: following };
            } catch {
              return { principal, profile, isFollowing: false };
            }
          }),
        );

        setUsers(usersWithFollow);
        setPosts(postResults);

        // Fetch post meta in parallel
        if (postResults.length > 0) {
          const metaEntries = await Promise.all(
            postResults.map(async (post) => {
              try {
                const [likeCount, hasLiked] = await Promise.all([
                  actor.getLikeCount(post.id),
                  actor.hasLiked(post.id),
                ]);
                return [post.id.toString(), { likeCount, hasLiked }] as const;
              } catch {
                return [
                  post.id.toString(),
                  { likeCount: 0n, hasLiked: false },
                ] as const;
              }
            }),
          );
          setPostMeta(Object.fromEntries(metaEntries));
        } else {
          setPostMeta({});
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearching(false);
      }
    };

    run();
  }, [actor, debouncedQuery]);

  const handleFollowToggle = useCallback(
    async (user: UserResult) => {
      if (!actor) return;
      const key = user.principal.toString();
      setFollowLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await actor.toggleFollow(user.principal);
        setUsers((prev) =>
          prev.map((u) =>
            u.principal.toString() === key
              ? { ...u, isFollowing: !u.isFollowing }
              : u,
          ),
        );
      } catch {
        toast.error("Failed to update follow");
      } finally {
        setFollowLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [actor],
  );

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

  const openPost = (post: Post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search input */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          data-ocid="search.input"
          placeholder="Search people, posts, captions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 bg-card border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Empty prompt */}
      {!debouncedQuery && !searching && (
        <motion.div
          key="empty-prompt"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="search.empty_state"
        >
          <div className="w-16 h-16 rounded-2xl avatar-fallback-gradient flex items-center justify-center mb-4 opacity-60">
            <SearchIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Discover Pixora
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Search for people by username or posts by caption and hashtag.
          </p>
        </motion.div>
      )}

      {/* Loading skeletons */}
      {searching && (
        <div data-ocid="search.loading_state" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="pixora-card px-4 py-3 flex items-center gap-3"
            >
              <Skeleton className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28 rounded bg-muted" />
                <Skeleton className="h-2.5 w-44 rounded bg-muted" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Results tabs */}
      {!searching && debouncedQuery && (
        <Tabs defaultValue="people">
          <TabsList className="w-full bg-card border border-border rounded-xl mb-4">
            <TabsTrigger
              value="people"
              data-ocid="search.people_tab"
              className="flex-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              People
              {users.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {users.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              data-ocid="search.posts_tab"
              className="flex-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              Posts
              {posts.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {posts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* People tab */}
          <TabsContent value="people">
            {users.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="search.people.empty_state"
              >
                <Users2 className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No people found for &ldquo;{debouncedQuery}&rdquo;
                </p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-2">
                  {users.map((user, idx) => (
                    <motion.div
                      key={user.principal.toString()}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.25 }}
                      data-ocid={`search.people.item.${idx + 1}`}
                      className="pixora-card px-4 py-3 flex items-center gap-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate("user-profile", user.principal.toString())
                        }
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage
                            src={
                              user.profile.profilePicture
                                ? user.profile.profilePicture.getDirectURL()
                                : undefined
                            }
                          />
                          <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
                            {user.profile.username?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {user.profile.username}
                          </p>
                          {user.profile.bio && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.profile.bio}
                            </p>
                          )}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={user.isFollowing ? "outline" : "default"}
                        data-ocid={`search.follow.button.${idx + 1}`}
                        disabled={followLoading[user.principal.toString()]}
                        onClick={() => handleFollowToggle(user)}
                        className="shrink-0 rounded-lg text-xs h-8 px-3"
                      >
                        {user.isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Posts tab */}
          <TabsContent value="posts">
            {posts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="search.posts.empty_state"
              >
                <SearchIcon className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No posts found for &ldquo;{debouncedQuery}&rdquo;
                </p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-3 gap-1.5">
                  {posts.map((post, idx) => (
                    <motion.button
                      type="button"
                      key={post.id.toString()}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.035, duration: 0.25 }}
                      data-ocid={`search.posts.item.${idx + 1}`}
                      onClick={() => openPost(post)}
                      className="aspect-square relative overflow-hidden rounded-lg bg-muted group cursor-pointer"
                    >
                      <img
                        src={post.image.getDirectURL()}
                        alt={post.caption}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                      {post.caption && (
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white truncate">
                            {post.caption}
                          </p>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Post modal */}
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
