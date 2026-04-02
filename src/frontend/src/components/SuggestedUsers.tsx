import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import type { AppView } from "../App";
import type { Profile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface SuggestedUsersProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

export default function SuggestedUsers({ navigate }: SuggestedUsersProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || !identity) return;
    const load = async () => {
      try {
        setLoading(true);
        const allProfiles = await actor.getAllProfiles();
        const myProfile = await actor.getCallerUserProfile();
        const suggestions = allProfiles
          .filter((p) => p.username !== myProfile?.username)
          .slice(0, 5);
        setProfiles(suggestions);
      } catch (err) {
        console.error("Failed to load suggested users", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actor, identity]);

  if (loading) {
    return (
      <div className="space-y-4" data-ocid="suggested.loading_state">
        <h3 className="text-sm font-semibold text-foreground">
          Suggested for you
        </h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded bg-muted" />
              <Skeleton className="h-2.5 w-16 rounded bg-muted" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Suggested for you
        </h3>
        <p
          className="text-xs text-muted-foreground"
          data-ocid="suggested.empty_state"
        >
          No suggestions yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Suggested for you
      </h3>
      <div className="space-y-3">
        {profiles.map((profile, idx) => (
          <div
            key={profile.username}
            className="flex items-center gap-3"
            data-ocid={`suggested.item.${idx + 1}`}
          >
            <button
              type="button"
              onClick={() => navigate("user-profile", profile.username)}
              className="flex-1 flex items-center gap-3 text-left min-w-0"
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={profile.profilePicture?.getDirectURL()} />
                <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
                  {profile.username?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile.username}
                </p>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.bio}
                  </p>
                )}
              </div>
            </button>
            <Button
              type="button"
              data-ocid={`suggested.follow.button.${idx + 1}`}
              size="sm"
              variant="secondary"
              className="h-7 px-3 text-xs font-semibold rounded-lg shrink-0"
            >
              Follow
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border mt-6">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {["About", "Help", "Privacy", "Terms"].map((link) => (
            <span
              key={link}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {link}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          © {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
