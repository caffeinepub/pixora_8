import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Profile } from "./backend";
import Layout from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AuthPage from "./pages/AuthPage";
import Chat from "./pages/Chat";
import Feed from "./pages/Feed";
import Friends from "./pages/Friends";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/Profile";
import Reels from "./pages/Reels";
import Search from "./pages/Search";
import Upload from "./pages/Upload";

export type AppView =
  | "feed"
  | "upload"
  | "profile"
  | "user-profile"
  | "search"
  | "friends"
  | "reels"
  | "chat";

export interface AppState {
  view: AppView;
  profilePrincipal?: string;
}

export default function App() {
  const { identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [appState, setAppState] = useState<AppState>({ view: "feed" });

  const isAuthenticated = !!identity;
  const isInitializing = loginStatus === "logging-in";

  const profileQuery = useQuery<Profile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const profileLoading = actorFetching || profileQuery.isLoading;
  const profileFetched = !!actor && profileQuery.isFetched;
  const userProfile = profileQuery.data;

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const navigate = (view: AppView, profilePrincipal?: string) => {
    setAppState({ view, profilePrincipal });
  };

  // Clear cached data on logout
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  if (isInitializing || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="flex flex-col items-center gap-4"
          data-ocid="app.loading_state"
        >
          <div className="w-12 h-12 rounded-2xl avatar-fallback-gradient flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <Skeleton className="h-2 w-24 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <Toaster />
      </>
    );
  }

  if (showProfileSetup) {
    return (
      <>
        <OnboardingPage
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
          }}
        />
        <Toaster />
      </>
    );
  }

  const renderView = () => {
    switch (appState.view) {
      case "feed":
        return <Feed navigate={navigate} />;
      case "upload":
        return <Upload navigate={navigate} />;
      case "profile":
        return (
          <ProfilePage
            principal={identity?.getPrincipal().toString()}
            navigate={navigate}
          />
        );
      case "user-profile":
        return (
          <ProfilePage
            principal={appState.profilePrincipal}
            navigate={navigate}
          />
        );
      case "search":
        return <Search navigate={navigate} />;
      case "friends":
        return <Friends navigate={navigate} />;
      case "reels":
        return <Reels navigate={navigate} />;
      case "chat":
        return <Chat navigate={navigate} />;
      default:
        return <Feed navigate={navigate} />;
    }
  };

  return (
    <>
      <Layout currentView={appState.view} navigate={navigate}>
        {renderView()}
      </Layout>
      <Toaster />
    </>
  );
}
