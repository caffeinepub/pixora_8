import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import { ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";

interface UploadProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

export default function Upload({ navigate }: UploadProps) {
  const { actor } = useActor();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array<ArrayBuffer> | null>(
    null,
  );
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    const buf = await file.arrayBuffer();
    setImageBytes(new Uint8Array(buf) as Uint8Array<ArrayBuffer>);
    setDone(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    const buf = await file.arrayBuffer();
    setImageBytes(new Uint8Array(buf) as Uint8Array<ArrayBuffer>);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageBytes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !imageBytes) return;

    setUploading(true);
    setProgress(0);

    try {
      const blob = ExternalBlob.fromBytes(imageBytes).withUploadProgress(
        (pct) => setProgress(pct),
      );
      await actor.createPost(blob, caption.trim());
      setDone(true);
      setProgress(100);
      toast.success("Post shared!");
      setTimeout(() => {
        navigate("feed");
      }, 1200);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-6">New Post</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image upload area */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm font-medium">Photo</Label>
            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-2xl overflow-hidden bg-muted border border-border"
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-[400px] object-contain"
                  />
                  <button
                    type="button"
                    data-ocid="upload.remove_image.button"
                    onClick={handleRemoveImage}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors group"
                  data-ocid="upload.dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <ImagePlus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Drop photo here
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        or click to browse
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-ocid="upload.upload_button"
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm font-medium">
              Caption{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              data-ocid="upload.textarea"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/300
            </p>
          </div>

          {/* Upload progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
                data-ocid="upload.loading_state"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-muted" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Done state */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-sm text-green-400"
                data-ocid="upload.success_state"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Posted successfully! Redirecting...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            data-ocid="upload.submit_button"
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            disabled={!imageBytes || uploading || done}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : done ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Shared!
              </>
            ) : (
              "Share Post"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
