import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";

interface OnboardingPageProps {
  onComplete: () => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBytes, setAvatarBytes] =
    useState<Uint8Array<ArrayBuffer> | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    const buf = await file.arrayBuffer();
    setAvatarBytes(new Uint8Array(buf) as Uint8Array<ArrayBuffer>);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    setLoading(true);
    try {
      let profilePicture: ExternalBlob;
      if (avatarBytes) {
        profilePicture = ExternalBlob.fromBytes(avatarBytes);
      } else {
        // Use a transparent 1x1 pixel as placeholder
        const placeholder = new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
          65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51,
          0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]);
        profilePicture = ExternalBlob.fromBytes(placeholder);
      }

      await actor.saveCallerUserProfile({
        username: username.trim(),
        bio: bio.trim(),
        profilePicture,
      });

      toast.success("Welcome to Pixora!");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl avatar-fallback-gradient mb-4">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Set up your profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tell the world who you are
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              data-ocid="onboarding.upload_button"
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="w-20 h-20 border-2 border-border">
                <AvatarImage src={avatarPreview ?? undefined} />
                <AvatarFallback className="avatar-fallback-gradient text-white text-xl font-semibold">
                  {username ? username[0].toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <span className="text-xs text-primary">Upload photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label
              htmlFor="username"
              className="text-foreground text-sm font-medium"
            >
              Username
            </Label>
            <Input
              id="username"
              data-ocid="onboarding.input"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              maxLength={30}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label
              htmlFor="bio"
              className="text-foreground text-sm font-medium"
            >
              Bio{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="bio"
              data-ocid="onboarding.textarea"
              placeholder="Tell something about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
              rows={3}
              maxLength={150}
            />
          </div>

          <Button
            type="submit"
            data-ocid="onboarding.submit_button"
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            disabled={loading || !username.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating profile...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
