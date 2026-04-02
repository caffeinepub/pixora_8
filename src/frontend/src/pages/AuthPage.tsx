import { Button } from "@/components/ui/button";
import { Camera, Heart, Loader2, MessageCircle, Users } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthPage() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === "logging-in";

  const features = [
    { icon: Camera, label: "Share moments" },
    { icon: Heart, label: "Like & connect" },
    { icon: MessageCircle, label: "Comment freely" },
    { icon: Users, label: "Follow creators" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl avatar-fallback-gradient mb-5 shadow-glow">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Pixora
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Share your world, one pixel at a time
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="pixora-card p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Login button */}
        <Button
          data-ocid="auth.primary_button"
          className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
          onClick={() => login()}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Get Started"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by Internet Identity — no passwords needed
        </p>
      </motion.div>
    </div>
  );
}
