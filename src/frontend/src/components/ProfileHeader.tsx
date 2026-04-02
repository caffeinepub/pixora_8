import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Profile } from "../backend";
import { ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";

interface ProfileHeaderProps {
  profile: Profile | null;
  isOwnProfile: boolean;
  postCount: number;
  followerCount: bigint;
  followingCount: bigint;
  isFollowing: boolean;
  onFollowToggle: () => Promise<void>;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  postCount,
  followerCount,
  followingCount,
  isFollowing,
  onFollowToggle,
}: ProfileHeaderProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState(profile?.username ?? "");
  const [editBio, setEditBio] = useState(profile?.bio ?? "");
  const [editAvatarBytes, setEditAvatarBytes] =
    useState<Uint8Array<ArrayBuffer> | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const username = profile?.username ?? "";
  const avatarUrl = profile?.profilePicture?.getDirectURL();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarPreview(URL.createObjectURL(file));
    const buf = await file.arrayBuffer();
    setEditAvatarBytes(new Uint8Array(buf) as Uint8Array<ArrayBuffer>);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !editUsername.trim()) return;
    setSaving(true);
    try {
      let profilePicture: ExternalBlob;
      if (editAvatarBytes) {
        profilePicture = ExternalBlob.fromBytes(editAvatarBytes);
      } else if (profile?.profilePicture) {
        profilePicture = profile.profilePicture;
      } else {
        const placeholder = new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
          65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51,
          0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]);
        profilePicture = ExternalBlob.fromBytes(placeholder);
      }

      await actor.updateProfile(
        editUsername.trim(),
        editBio.trim(),
        profilePicture,
      );

      await queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      toast.success("Profile updated!");
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleFollowToggle = async () => {
    setFollowLoading(true);
    try {
      await onFollowToggle();
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-6 py-4" data-ocid="profile.section">
        {/* Avatar */}
        <Avatar className="w-20 h-20 border-2 border-border shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="avatar-fallback-gradient text-white text-2xl font-bold">
            {username?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">
              {username || "Unknown"}
            </h2>
            {isOwnProfile ? (
              <Button
                data-ocid="profile.edit_button"
                size="sm"
                variant="secondary"
                className="h-8 px-4 text-xs rounded-lg font-semibold"
                onClick={() => {
                  setEditUsername(profile?.username ?? "");
                  setEditBio(profile?.bio ?? "");
                  setEditAvatarPreview(null);
                  setEditAvatarBytes(null);
                  setEditOpen(true);
                }}
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Edit Profile
              </Button>
            ) : (
              <Button
                data-ocid="profile.follow.button"
                size="sm"
                className={`h-8 px-4 text-xs rounded-lg font-semibold ${
                  isFollowing
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 mb-2">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{postCount}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">
                {followerCount.toString()}
              </p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">
                {followingCount.toString()}
              </p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          data-ocid="profile.edit.modal"
          className="bg-card border-border rounded-2xl max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2">
              <label className="relative cursor-pointer group">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src={editAvatarPreview ?? avatarUrl} />
                  <AvatarFallback className="avatar-fallback-gradient text-white text-lg font-bold">
                    {editUsername?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs">Change</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  data-ocid="profile.edit.upload_button"
                />
              </label>
              <span className="text-xs text-muted-foreground">
                Click to change photo
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Username</Label>
              <Input
                data-ocid="profile.edit.input"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-muted border-border text-foreground rounded-xl h-10"
                maxLength={30}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Bio</Label>
              <Textarea
                data-ocid="profile.edit.textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="bg-muted border-border text-foreground rounded-xl resize-none"
                rows={3}
                maxLength={150}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                data-ocid="profile.edit.cancel_button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="profile.edit.save_button"
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                disabled={saving || !editUsername.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
