import { useState, useRef, useCallback } from "react";
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
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

const TYPE_STYLES: Record<ContentType, { bg: string; text: string; label: string }> = {
  text: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Text" },
  audio: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Audio" },
  video: { bg: "bg-violet-500/10", text: "text-violet-400", label: "Video" },
};

interface UploadZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ file, onFileSelect, disabled }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      setError(null);
      const type = detectContentType(f.name);
      if (!type) {
        setError(`Unsupported file type. Allowed: ${ALL_EXTENSIONS.join(", ")}`);
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        setError("File too large. Maximum size is 500 MB.");
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const contentType = file ? detectContentType(file.name) : null;
  const typeStyle = contentType ? TYPE_STYLES[contentType] : null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${
            dragActive
              ? "border-violet-400 bg-violet-500/10"
              : file
                ? "border-slate-600 bg-slate-800/50"
                : "border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALL_EXTENSIONS.join(",")}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        {file ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              {typeStyle && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                  {typeStyle.label}
                </span>
              )}
            </div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-sm text-slate-400">{formatFileSize(file.size)}</p>
            <p className="text-xs text-slate-500">Click or drop to replace</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-700/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Text, Audio, or Video files up to 500 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
