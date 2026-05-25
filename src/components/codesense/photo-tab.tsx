import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { ScannerOverlay } from "./scanner";
import { Upload, X, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 10 * 1024 * 1024;

export function PhotoTab({
  loading,
  onAnalyze,
}: {
  loading: boolean;
  onAnalyze: (dataUrl: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    if (!ALLOWED.includes(f.type) && !f.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      toast.error("Unsupported format. Use JPG, PNG, WEBP, or HEIC.");
      return;
    }
    if (f.size > MAX) {
      toast.error("File too large (max 10 MB).");
      return;
    }
    setFile(f);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const clear = () => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-card transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        {preview ? (
          <>
            <img src={preview} alt="Code preview" className="max-h-[400px] w-full object-contain" />
            <Button
              size="icon" variant="secondary"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute right-3 top-3 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <Upload className="size-7" />
            </div>
            <div>
              <p className="font-mono text-sm">Drop an image of code, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG · PNG · WEBP · HEIC · up to 10 MB</p>
            </div>
          </div>
        )}
        <ScannerOverlay active={loading} direction="horizontal" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          {file && <><ImageIcon className="size-3.5" /> {file.name}</>}
        </div>
        <Button onClick={() => preview && onAnalyze(preview)} disabled={!preview || loading} className="font-mono">
          <Sparkles className="mr-2 size-4" /> {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>
    </div>
  );
}
