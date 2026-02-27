import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Film, Headphones, Subtitles, FileText, PartyPopper, ExternalLink } from "lucide-react";
import type { Job, ResultFiles } from "../types";
import { getLanguageName, getLanguageFlag } from "../utils/languages";

interface ResultsPanelProps {
  job: Job;
}

export default function ResultsPanel({ job }: ResultsPanelProps) {
  const results = job.results;
  if (!results) return null;

  const langs = Object.keys(results);
  const [activeLang, setActiveLang] = useState(langs[0] ?? "");
  const activeFiles = results[activeLang];

  if (!activeFiles) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-surface/60 border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-green-muted border border-green/15 flex items-center justify-center shrink-0">
          <PartyPopper className="w-4.5 h-4.5 text-green" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text-1">Your files are ready</p>
          <p className="text-[12px] text-text-3 mt-0.5">
            {langs.length} language{langs.length > 1 ? "s" : ""} translated
          </p>
        </div>
      </div>

      {/* Language tabs */}
      {langs.length > 1 && (
        <div className="px-4 pt-4">
          <div className="flex gap-1 p-1 rounded-xl bg-surface-2/60 overflow-x-auto">
            {langs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 flex-1 justify-center z-10 min-w-0"
              >
                {activeLang === lang && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-surface-3 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2 truncate">
                  <span className={`
                    w-5 h-3.5 rounded-[3px] flex items-center justify-center text-[8px] font-bold tracking-wider shrink-0
                    ${activeLang === lang ? "bg-accent/20 text-accent-2" : "bg-surface-3 text-text-4"}
                  `}>
                    {getLanguageFlag(lang)}
                  </span>
                  <span className={`truncate ${activeLang === lang ? "text-text-1" : "text-text-3"}`}>
                    {getLanguageName(lang)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single language header */}
      {langs.length === 1 && (
        <div className="px-5 pt-4 flex items-center gap-2.5">
          <span className="w-7 h-5 rounded-[4px] bg-accent/20 text-accent-2 flex items-center justify-center text-[9px] font-bold tracking-wider">
            {getLanguageFlag(activeLang)}
          </span>
          <span className="text-[14px] font-semibold text-text-1">{getLanguageName(activeLang)}</span>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLang}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="p-4"
        >
          <ResultContent files={activeFiles} />
        </motion.div>
      </AnimatePresence>

      {/* Downloads */}
      <div className="px-4 pb-4">
        <DownloadBar files={activeFiles} lang={activeLang} />
      </div>
    </motion.div>
  );
}

function ResultContent({ files }: { files: ResultFiles }) {
  if (files.video_file) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black/30 border border-border">
        <video controls className="w-full block" src={files.video_file}>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (files.audio_file) {
    return (
      <div className="rounded-xl bg-surface-2/60 border border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <Headphones className="w-4 h-4 text-amber" strokeWidth={1.5} />
          <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider">Audio Preview</span>
        </div>
        <audio controls className="w-full" src={files.audio_file}>
          Your browser does not support the audio tag.
        </audio>
        {/* Transcript if available */}
        {files.transcript && files.transcript.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[11px] font-bold text-text-4 uppercase tracking-wider mb-2">Transcript</p>
            <p className="text-[13px] text-text-2 leading-relaxed">
              {files.transcript.join(" ")}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (files.preview) {
    return (
      <div className="rounded-xl bg-surface-2/60 border border-border p-5 max-h-52 overflow-y-auto">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-4 h-4 text-green" strokeWidth={1.5} />
          <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider">Translation Preview</span>
        </div>
        <p className="text-[13px] text-text-2 whitespace-pre-wrap leading-relaxed">
          {files.preview}
        </p>
      </div>
    );
  }

  return null;
}

function DownloadBar({ files, lang }: { files: ResultFiles; lang: string }) {
  const downloads: { href: string; label: string; Icon: typeof Film }[] = [];

  if (files.video_file) downloads.push({ href: files.video_file, label: "Video", Icon: Film });
  if (files.audio_file) downloads.push({ href: files.audio_file, label: "Audio", Icon: Headphones });
  if (files.subtitle_file) downloads.push({ href: files.subtitle_file, label: "Subtitles", Icon: Subtitles });
  if (files.text_file) downloads.push({ href: files.text_file, label: "Text", Icon: FileText });

  if (downloads.length === 0) return null;

  return (
    <div className="flex gap-2">
      {downloads.map((dl) => (
        <a
          key={dl.label}
          href={dl.href}
          download={`${lang}_${dl.label.toLowerCase()}`}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-semibold
            bg-surface-2/60 border border-border text-text-3
            hover:text-text-1 hover:border-border-2 hover:bg-surface-3 hover:shadow-sm
            transition-all duration-200 flex-1 justify-center active:scale-[0.98]"
        >
          <dl.Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
          {dl.label}
          <Download className="w-3 h-3 ml-auto text-text-4" strokeWidth={2} />
        </a>
      ))}
    </div>
  );
}
