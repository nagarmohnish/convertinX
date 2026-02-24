import type { ProgressUpdate, JobStatus } from "../types";

interface ProgressTrackerProps {
  jobStatus: JobStatus;
  wsProgress: ProgressUpdate | null;
  uploadProgress: number;
  uploading: boolean;
}

export default function ProgressTracker({
  jobStatus,
  wsProgress,
  uploadProgress,
  uploading,
}: ProgressTrackerProps) {
  // Upload phase
  if (uploading) {
    return (
      <ProgressCard
        label="Uploading file..."
        detail={`${Math.round(uploadProgress * 100)}%`}
        progress={uploadProgress}
        status="processing"
      />
    );
  }

  if (!wsProgress && jobStatus === "queued") {
    return (
      <ProgressCard
        label="Queued"
        detail="Waiting to start processing..."
        progress={0}
        status="queued"
      />
    );
  }

  if (jobStatus === "failed") {
    return (
      <ProgressCard
        label="Failed"
        detail={wsProgress?.detail || "An error occurred"}
        progress={0}
        status="failed"
      />
    );
  }

  if (jobStatus === "completed") {
    return (
      <ProgressCard
        label="Completed"
        detail="Your files are ready for download!"
        progress={1}
        status="completed"
      />
    );
  }

  // Processing phase
  const pct = wsProgress?.progress ?? 0;
  return (
    <ProgressCard
      label={wsProgress?.step ?? "Processing..."}
      detail={wsProgress?.detail ?? ""}
      progress={pct}
      status="processing"
    />
  );
}

function ProgressCard({
  label,
  detail,
  progress,
  status,
}: {
  label: string;
  detail: string;
  progress: number;
  status: "queued" | "processing" | "completed" | "failed";
}) {
  const barColor = {
    queued: "bg-slate-500",
    processing: "bg-gradient-to-r from-violet-500 to-indigo-500",
    completed: "bg-emerald-500",
    failed: "bg-red-500",
  }[status];

  const iconBg = {
    queued: "bg-slate-500/20 text-slate-400",
    processing: "bg-violet-500/20 text-violet-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
  }[status];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {status === "completed" ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : status === "failed" ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 ${status === "processing" ? "animate-spin" : "animate-pulse"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{label}</p>
          {detail && <p className="text-sm text-slate-400">{detail}</p>}
        </div>
        {status === "processing" && progress > 0 && (
          <span className="text-sm font-mono text-violet-400">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor} ${
            status === "queued" ? "animate-pulse" : ""
          }`}
          style={{ width: `${Math.max(progress * 100, status === "queued" ? 5 : 0)}%` }}
        />
      </div>
    </div>
  );
}
