import type { Job, ContentType } from "../types";
import { getLanguageName, getLanguageFlag } from "../utils/languages";

interface ResultsPanelProps {
  job: Job;
}

export default function ResultsPanel({ job }: ResultsPanelProps) {
  if (!job.results) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Results</h2>

      {Object.entries(job.results).map(([lang, files]) => (
        <div
          key={lang}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{getLanguageFlag(lang)}</span>
            <h3 className="text-white font-medium">{getLanguageName(lang)}</h3>
          </div>

          {/* Video Player */}
          {files.video_file && (
            <video
              controls
              className="w-full rounded-xl bg-black"
              src={files.video_file}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {/* Audio Player */}
          {files.audio_file && !files.video_file && (
            <audio controls className="w-full" src={files.audio_file}>
              Your browser does not support the audio tag.
            </audio>
          )}

          {/* Text Preview */}
          {files.preview && (
            <div className="bg-slate-900/50 rounded-xl p-4 max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {files.preview}
              </p>
            </div>
          )}

          {/* Download Buttons */}
          <div className="flex flex-wrap gap-2">
            {files.video_file && (
              <DownloadButton
                href={files.video_file}
                label="Video"
                icon="video"
              />
            )}
            {files.audio_file && (
              <DownloadButton
                href={files.audio_file}
                label="Audio"
                icon="audio"
              />
            )}
            {files.subtitle_file && (
              <DownloadButton
                href={files.subtitle_file}
                label="Subtitles"
                icon="text"
              />
            )}
            {files.text_file && (
              <DownloadButton
                href={files.text_file}
                label="Text"
                icon="text"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DownloadButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "video" | "audio" | "text";
}) {
  const colors = {
    video: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",
    audio: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
    text: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  }[icon];

  return (
    <a
      href={href}
      download
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${colors}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </a>
  );
}
