import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import { Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Profile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface FriendsProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

interface UserEntry {
  principal: Principal;
  profile: Profile | null;
  isFollowing: boolean;
}

function UserRow({
  user,
  idx,
  ocidScope,
  navigate,
  onFollowToggle,
  followLoading,
  showUnfollowOnly,
}: {
  user: UserEntry;
  idx: number;
  ocidScope: string;
  navigate: (view: AppView, profilePrincipal?: string) => void;
  onFollowToggle: (user: UserEntry) => void;
  followLoading: Record<string, boolean>;
  showUnfollowOnly?: boolean;
}) {
  const key = user.principal.toString();
  const name = user.profile?.username ?? `${key.slice(0, 8)}...`;
  const bio = user.profile?.bio ?? "";
  const avatarSrc = user.profile?.profilePicture
    ? user.profile.profilePicture.getDirectURL()
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: idx * 0.04, duration: 0.25 }}
      data-ocid={`${ocidScope}.item.${idx + 1}`}
      className="pixora-card px-4 py-3 flex items-center gap-3"
    >
      <button
        type="button"
        onClick={() => navigate("user-profile", key)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
            {name[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {name}
          </p>
          {bio && (
            <p className="text-xs text-muted-foreground truncate">{bio}</p>
          )}
        </div>
      </button>
      <Button
        size="sm"
        variant={user.isFollowing || showUnfollowOnly ? "outline" : "default"}
        data-ocid={`${ocidScope}.toggle.${idx + 1}`}
        disabled={followLoading[key]}
        onClick={() => onFollowToggle(user)}
        className="shrink-0 rounded-lg text-xs h-8 px-3"
      >
        {user.isFollowing || showUnfollowOnly ? "Unfollow" : "Follow"}
      </Button>
    </motion.div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="pixora-card px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28 rounded bg-muted" />
            <Skeleton className="h-2.5 w-44 rounded bg-muted" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function Friends({ navigate }: FriendsProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const [following, setFollowing] = useState<UserEntry[]>([]);
  const [suggestions, setSuggestions] = useState<UserEntry[]>([]);

  const [followingLoading, setFollowingLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>(
    {},
  );

  const myPrincipal = identity?.getPrincipal();

  // Load following
  useEffect(() => {
    if (!actor || !myPrincipal) return;
    const load = async () => {
      setFollowingLoading(true);
      try {
        const principals = await actor.getFollowing(myPrincipal);
        const entries = await Promise.all(
          principals.map(async (p) => {
            const profile = await actor.getUserProfile(p);
            return { principal: p, profile, isFollowing: true };
          }),
        );
        setFollowing(entries);
      } catch (err) {
        console.error("Failed to load following", err);
      } finally {
        setFollowingLoading(false);
      }
    };
    load();
  }, [actor, myPrincipal]);

  // Load suggestions
  useEffect(() => {
    if (!actor) return;
    const load = async () => {
      setSuggestionsLoading(true);
      try {
        const results = await actor.getSuggestedUsers();
        const entries = results.map(([p, profile]) => ({
          principal: p,
          profile,
          isFollowing: false,
        }));
        setSuggestions(entries);
      } catch (err) {
        console.error("Failed to load suggestions", err);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    load();
  }, [actor]);

  const handleFollowingToggle = useCallback(
    async (user: UserEntry) => {
      if (!actor) return;
      const key = user.principal.toString();
      setFollowLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await actor.toggleFollow(user.principal);
        // Unfollow removes from following list
        setFollowing((prev) =>
          prev.filter((u) => u.principal.toString() !== key),
        );
      } catch {
        toast.error("Failed to unfollow");
      } finally {
        setFollowLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [actor],
  );

  const handleSuggestionFollow = useCallback(
    async (user: UserEntry) => {
      if (!actor) return;
      const key = user.principal.toString();
      setFollowLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await actor.toggleFollow(user.principal);
        // Remove from suggestions after following
        setSuggestions((prev) =>
          prev.filter((u) => u.principal.toString() !== key),
        );
      } catch {
        toast.error("Failed to follow");
      } finally {
        setFollowLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [actor],
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Friends</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          People you follow and who to follow next.
        </p>
      </div>

      <Tabs defaultValue="following">
        <TabsList className="w-full bg-card border border-border rounded-xl mb-4">
          <TabsTrigger
            value="following"
            data-ocid="friends.following_tab"
            className="flex-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            Following
            {!followingLoading && following.length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {following.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="suggestions"
            data-ocid="friends.suggestions_tab"
            className="flex-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            Suggestions
          </TabsTrigger>
        </TabsList>

        {/* Following tab */}
        <TabsContent value="following">
          {followingLoading ? (
            <div data-ocid="friends.following.loading_state">
              <ListSkeleton />
            </div>
          ) : following.length === 0 ? (
            <div data-ocid="friends.following.empty_state">
              <EmptyState message="You're not following anyone yet. Discover people to follow!" />
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-2">
                {following.map((user, idx) => (
                  <UserRow
                    key={user.principal.toString()}
                    user={user}
                    idx={idx}
                    ocidScope="friends.following"
                    navigate={navigate}
                    onFollowToggle={handleFollowingToggle}
                    followLoading={followLoading}
                    showUnfollowOnly
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Suggestions tab */}
        <TabsContent value="suggestions">
          {suggestionsLoading ? (
            <div data-ocid="friends.suggestions.loading_state">
              <ListSkeleton />
            </div>
          ) : suggestions.length === 0 ? (
            <div data-ocid="friends.suggestions.empty_state">
              <EmptyState message="No suggestions right now. Check back later!" />
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-2">
                {suggestions.map((user, idx) => (
                  <UserRow
                    key={user.principal.toString()}
                    user={user}
                    idx={idx}
                    ocidScope="friends.suggestions"
                    navigate={navigate}
                    onFollowToggle={handleSuggestionFollow}
                    followLoading={followLoading}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
