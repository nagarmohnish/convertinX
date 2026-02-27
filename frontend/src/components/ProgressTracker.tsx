import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileAudio, Languages, AudioLines, Package,
  Check, X, Loader2, Clock,
} from "lucide-react";
import type { ProgressUpdate, JobStatus } from "../types";

interface ProgressTrackerProps {
  jobStatus: JobStatus;
  wsProgress: ProgressUpdate | null;
  uploadProgress: number;
  uploading: boolean;
}

const PIPELINE_STEPS = [
  { key: "uploading", label: "Upload", Icon: Upload },
  { key: "transcribing", label: "Transcribe", Icon: FileAudio },
  { key: "translating", label: "Translate", Icon: Languages },
  { key: "synthesizing", label: "Synthesize", Icon: AudioLines },
  { key: "finalizing", label: "Finalize", Icon: Package },
];

function resolveActiveStep(
  uploading: boolean,
  jobStatus: JobStatus,
  wsStep: string | undefined,
): number {
  if (uploading) return 0;
  if (jobStatus === "completed") return PIPELINE_STEPS.length;
  if (jobStatus === "failed") return -1;

  const step = wsStep?.toLowerCase() ?? "";
  if (step.includes("transcrib")) return 1;
  if (step.includes("translat")) return 2;
  if (step.includes("synthe") || step.includes("tts") || step.includes("dub") || step.includes("speech")) return 3;
  if (step.includes("final") || step.includes("burn") || step.includes("merg") || step.includes("assembl") || step.includes("render")) return 4;
  if (step.includes("upload")) return 0;
  if (step.includes("extract")) return 0;

  return jobStatus === "queued" ? -0.5 : 1;
}

function useElapsedTime(running: boolean) {
  const [start] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [running, start]);

  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressTracker({
  jobStatus,
  wsProgress,
  uploadProgress,
  uploading,
}: ProgressTrackerProps) {
  const activeIdx = resolveActiveStep(uploading, jobStatus, wsProgress?.step);
  const isFailed = jobStatus === "failed";
  const isComplete = jobStatus === "completed";
  const pct = uploading
    ? uploadProgress
    : isComplete
      ? 1
      : (wsProgress?.progress ?? 0);

  const isRunning = !isComplete && !isFailed;
  const elapsed = useElapsedTime(isRunning);

  const statusLabel = uploading
    ? "Uploading file..."
    : isComplete
      ? "Localization complete"
      : isFailed
        ? wsProgress?.detail || "Processing failed"
        : wsProgress?.detail || (jobStatus === "queued" ? "Waiting in queue..." : "Processing...");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-surface/60 border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon status={isFailed ? "failed" : isComplete ? "completed" : "processing"} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-1 truncate">
              {isComplete
                ? "All done!"
                : isFailed
                  ? "Something went wrong"
                  : uploading
                    ? "Uploading"
                    : wsProgress?.step ?? "Processing"}
            </p>
            <p className="text-[12px] text-text-3 mt-0.5 truncate">{statusLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[12px] font-mono text-text-4 tabular-nums">
              <Clock className="w-3 h-3" strokeWidth={2} />
              {elapsed}
            </span>
          )}
          {!isFailed && (
            <span className={`
              text-[14px] font-bold tabular-nums
              ${isComplete ? "text-green" : "text-text-2"}
            `}>
              {Math.round(pct * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5">
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden relative">
          {jobStatus === "queued" && !uploading ? (
            <div className="h-full w-[30%] rounded-full bg-text-4 progress-indeterminate" />
          ) : (
            <motion.div
              className={`h-full rounded-full ${
                isFailed ? "bg-red" : isComplete ? "bg-green" : "progress-shimmer"
              }`}
              initial={{ width: "2%" }}
              animate={{ width: `${Math.max(pct * 100, 2)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          )}
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="px-5 py-4">
        <div className="flex items-stretch gap-1">
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = isComplete || i < activeIdx;
            const isActive = !isComplete && !isFailed && Math.floor(activeIdx) === i;
            const isFailedStep = isFailed && i === 0 && activeIdx === -1;

            return (
              <div key={step.key} className="flex items-stretch flex-1 min-w-0 gap-1">
                <motion.div
                  animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                  className={`
                    flex items-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-400 w-full justify-center
                    ${isDone
                      ? "bg-green-muted text-green"
                      : isActive
                        ? "bg-accent-muted text-accent-2 shadow-sm shadow-accent/5"
                        : isFailedStep
                          ? "bg-red-muted text-red"
                          : "bg-surface-2/40 text-text-4"
                    }
                  `}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 shrink-0 animate-spin" strokeWidth={2.5} />
                  ) : isFailedStep ? (
                    <X className="w-3 h-3 shrink-0" strokeWidth={3} />
                  ) : (
                    <step.Icon className="w-3 h-3 shrink-0 opacity-50" strokeWidth={2} />
                  )}
                  <span className="truncate hidden sm:inline">{step.label}</span>
                </motion.div>

                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center px-0.5 shrink-0">
                    <div className={`w-1.5 h-px transition-colors duration-300 ${isDone ? "bg-green/40" : "bg-border"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: "processing" | "completed" | "failed" }) {
  const config = {
    completed: { bg: "bg-green-muted", border: "border-green/15", content: <Check className="w-4 h-4 text-green" strokeWidth={2.5} /> },
    failed: { bg: "bg-red-muted", border: "border-red/15", content: <X className="w-4 h-4 text-red" strokeWidth={2.5} /> },
    processing: {
      bg: "bg-accent-muted",
      border: "border-accent/15",
      content: <Loader2 className="w-4 h-4 text-accent-2 animate-spin" strokeWidth={2.5} />,
    },
  }[status];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${config.bg} ${config.border}`}
    >
      {config.content}
    </motion.div>
  );
}
