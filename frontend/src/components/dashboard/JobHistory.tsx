import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../../utils/api";

const TOOL_LABELS: Record<string, string> = {
  translate_text: "Text Translation",
  translate_audio: "Audio Translation",
  translate_video: "Video Translation",
  translate_singing: "Singing Translation",
  tts: "Text to Speech",
  stt: "Speech to Text",
  doc_translate: "Doc Translation",
  image_ocr: "Image OCR",
  audio_separate: "Audio Separation",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  failed: XCircle,
  processing: Loader2,
  queued: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green",
  failed: "text-red",
  processing: "text-amber",
  queued: "text-text-4",
};

export default function JobHistory() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (filter) params.set("tool", filter);

    apiFetch(`/api/dashboard/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs);
        setTotalPages(data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-1 text-[13px] focus:outline-none focus:border-accent/50"
        >
          <option value="">All tools</option>
          {Object.entries(TOOL_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Job table */}
      <div className="rounded-2xl bg-surface/60 border border-border overflow-hidden">
        {loading ? (
          <div className="text-text-4 text-[14px] py-12 text-center">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="text-text-4 text-[14px] py-12 text-center">No jobs found</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-text-4 text-left">
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Step</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const StatusIcon = STATUS_ICONS[job.status] || Clock;
                const statusColor = STATUS_COLORS[job.status] || "text-text-4";
                return (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-surface-2/30">
                    <td className="px-4 py-3 text-text-1 font-medium">
                      {TOOL_LABELS[job.tool] || job.tool}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 ${statusColor}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-4 max-w-[200px] truncate">
                      {job.error_message || job.current_step || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-4">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString()
                        : "—"
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-surface-2 border border-border text-text-3 disabled:opacity-30 hover:text-text-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] text-text-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-surface-2 border border-border text-text-3 disabled:opacity-30 hover:text-text-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
