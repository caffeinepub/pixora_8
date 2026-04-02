import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Home, LogOut, PlusSquare, Search, User } from "lucide-react";
import type { AppView } from "../App";
import type { Profile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import SuggestedUsers from "./SuggestedUsers";

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

export default function Layout({
  children,
  currentView,
  navigate,
}: LayoutProps) {
  const { identity, clear } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<Profile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor,
    staleTime: 1000 * 60 * 5,
  });

  const userProfile = profileQuery.data;
  const username = userProfile?.username ?? "";

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const navItems = [
    { view: "feed" as AppView, icon: Home, label: "Home" },
    { view: "upload" as AppView, icon: PlusSquare, label: "Upload" },
    { view: "profile" as AppView, icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* LEFT SIDEBAR (desktop) */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-60 pixora-sidebar z-40">
        {/* Logo */}
        <div className="px-5 py-6">
          <button
            type="button"
            data-ocid="nav.link"
            onClick={() => navigate("feed")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl avatar-fallback-gradient flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-base">P</span>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Pixora
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ view, icon: Icon, label }) => (
            <button
              type="button"
              key={view}
              data-ocid={`nav.${view}.link`}
              onClick={() => navigate(view)}
              className={cn(
                "nav-item w-full text-left",
                currentView === view && "nav-item-active",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage
                src={
                  userProfile?.profilePicture
                    ? userProfile.profilePicture.getDirectURL()
                    : undefined
                }
              />
              <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
                {username ? username[0].toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {username || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {identity?.getPrincipal().toString().slice(0, 8)}...
              </p>
            </div>
            <button
              type="button"
              data-ocid="nav.logout.button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-60 lg:mr-72">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-30">
          <button
            type="button"
            onClick={() => navigate("feed")}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg avatar-fallback-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-foreground">Pixora</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              data-ocid="nav.mobile.logout.button"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop search bar */}
        <div className="hidden lg:flex items-center gap-3 px-6 pt-5 pb-2">
          <div className="flex-1 relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-ocid="nav.search_input"
              placeholder="Search Pixora..."
              className="w-full pl-9 pr-4 h-10 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 lg:px-6 py-4 pb-24 lg:pb-8">{children}</div>
      </main>

      {/* RIGHT SIDEBAR (desktop) */}
      <aside className="hidden lg:flex flex-col fixed top-0 right-0 h-screen w-72 pixora-sidebar z-40 px-4 py-6 overflow-y-auto">
        <SuggestedUsers navigate={navigate} />
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 px-5 py-3 rounded-2xl bg-card border border-border shadow-card backdrop-blur">
          {navItems.map(({ view, icon: Icon, label }) => (
            <button
              type="button"
              key={view}
              data-ocid={`mobile.nav.${view}.button`}
              onClick={() => navigate(view)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-150",
                currentView === view
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
