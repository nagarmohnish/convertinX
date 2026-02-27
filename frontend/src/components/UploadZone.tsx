import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, Headphones, FileText, X, RefreshCw,
  CloudUpload, Sparkles, FileUp,
} from "lucide-react";
import type { ContentType } from "../types";

const ALLOWED_EXTENSIONS: Record<ContentType, string[]> = {
  text: [".txt", ".srt", ".vtt", ".md", ".html", ".json"],
  audio: [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"],
  video: [".mp4", ".mov", ".avi", ".mkv", ".webm"],
};

const ALL_EXTENSIONS = Object.values(ALLOWED_EXTENSIONS).flat();

function detectContentType(filename: string): ContentType | null {
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  for (const [type, exts] of Object.entries(ALLOWED_EXTENSIONS)) {
    if (exts.includes(ext)) return type as ContentType;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

interface UploadZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear?: () => void;
  disabled?: boolean;
}

export default function UploadZone({ file, onFileSelect, onFileClear, disabled }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      setError(null);
      const type = detectContentType(f.name);
      if (!type) {
        setError("Unsupported format. Try MP4, MP3, WAV, TXT, or SRT files.");
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        setError("File exceeds 500 MB limit.");
        return;
      }
      onFileSelect(f);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile, disabled],
  );

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const contentType = file ? detectContentType(file.name) : null;

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={ALL_EXTENSIONS.join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        className="hidden"
        disabled={disabled}
      />

      {file && contentType ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="group relative rounded-2xl bg-surface/80 border border-border hover:border-border-2 transition-colors overflow-hidden"
        >
          <div className="px-5 py-4 flex items-center gap-4">
            <FileTypeIcon type={contentType} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-text-1 truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] text-text-3 font-mono">{formatFileSize(file.size)}</span>
                <span className="w-1 h-1 rounded-full bg-text-4" />
                <ContentBadge type={contentType} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={disabled}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-text-4 hover:text-text-2 hover:bg-surface-2 transition-all disabled:opacity-30"
                title="Replace file"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              {onFileClear && (
                <button
                  type="button"
                  onClick={onFileClear}
                  disabled={disabled}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-text-4 hover:text-red hover:bg-red-muted transition-all disabled:opacity-30"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Confirmation strip */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-green/40 to-transparent" />
        </motion.div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`
            group relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
            ${disabled ? "opacity-40 pointer-events-none" : ""}
          `}
        >
          {/* Border / glow */}
          <div className={`
            absolute inset-0 rounded-2xl transition-all duration-500 pointer-events-none
            ${dragActive
              ? "bg-accent/[0.06] ring-2 ring-accent/30 ring-inset shadow-[inset_0_0_80px_rgba(139,92,246,0.06)]"
              : "border border-dashed border-border-2 group-hover:border-text-4 group-hover:bg-surface/30"
            }
          `} />

          <div className="relative px-6 py-12 flex flex-col items-center text-center">
            {/* Icon with pulse on drag */}
            <div className="relative mb-5">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300
                ${dragActive
                  ? "bg-accent-muted border-accent/25 shadow-lg shadow-accent/10 scale-110"
                  : "bg-surface-2 border-border group-hover:border-border-2 group-hover:bg-surface-3 group-hover:scale-105"
                }
              `}>
                {dragActive ? (
                  <FileUp className="w-7 h-7 text-accent-2" strokeWidth={1.5} />
                ) : (
                  <CloudUpload className="w-7 h-7 text-text-3 group-hover:text-text-2 transition-colors" strokeWidth={1.5} />
                )}
              </div>
              {dragActive && (
                <div className="absolute inset-0 rounded-2xl border-2 border-accent/30 animate-ping" />
              )}
            </div>

            <p className="text-[15px] font-semibold text-text-1 mb-1.5">
              {dragActive ? "Drop your file here" : "Drop a file or click to browse"}
            </p>
            <p className="text-[13px] text-text-4 mb-6 max-w-[280px]">
              Upload video, audio, or text to translate into any language
            </p>

            {/* Format chips */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <FormatChip icon={Film} label="MP4" color="accent" />
              <FormatChip icon={Headphones} label="MP3" color="amber" />
              <FormatChip icon={FileText} label="TXT" color="green" />
              <span className="text-[11px] text-text-4 font-mono">+15 more</span>
            </div>

            <p className="mt-4 text-[11px] text-text-4 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Up to 500 MB
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-muted border border-red/10 text-[13px] text-red"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormatChip({ icon: Icon, label, color }: { icon: typeof Film; label: string; color: string }) {
  const colors: Record<string, string> = {
    accent: "border-accent/15 text-accent-2",
    amber: "border-amber/15 text-amber",
    green: "border-green/15 text-green",
  };
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2/80 border text-[11px] font-semibold tracking-wider ${colors[color] ?? colors.accent}`}>
      <Icon className="w-3 h-3" strokeWidth={1.5} />
      {label}
    </span>
  );
}

function ContentBadge({ type }: { type: ContentType }) {
  const config: Record<ContentType, { color: string; label: string }> = {
    video: { color: "bg-accent/15 text-accent-2", label: "Video" },
    audio: { color: "bg-amber/15 text-amber", label: "Audio" },
    text: { color: "bg-green/15 text-green", label: "Text" },
  };
  const c = config[type];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.color}`}>
      {c.label}
    </span>
  );
}

function FileTypeIcon({ type }: { type: ContentType }) {
  const config = {
    text: { bg: "bg-green-muted", border: "border-green/15", color: "text-green", Icon: FileText },
    audio: { bg: "bg-amber-muted", border: "border-amber/15", color: "text-amber", Icon: Headphones },
    video: { bg: "bg-accent-muted", border: "border-accent/15", color: "text-accent-2", Icon: Film },
  }[type];

  return (
    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${config.bg} ${config.border}`}>
      <config.Icon className={`w-5 h-5 ${config.color}`} strokeWidth={1.5} />
    </div>
  );
}
