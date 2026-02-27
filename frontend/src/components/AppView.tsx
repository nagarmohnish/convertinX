import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Languages, Rocket, Check, RotateCcw, AlertCircle } from "lucide-react";
import Layout from "./Layout";
import UploadZone from "./UploadZone";
import LanguageSelector from "./LanguageSelector";
import ProgressTracker from "./ProgressTracker";
import ResultsPanel from "./ResultsPanel";
import { useWebSocket } from "../hooks/useWebSocket";
import { useUpload } from "../hooks/useUpload";
import type { Job, JobStatus } from "../types";

interface AppViewProps {
  onBack: () => void;
}

export default function AppView({ onBack }: AppViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { submitJob, uploading, uploadProgress } = useUpload();
  const { progress: wsProgress } = useWebSocket(jobId);

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data: Job = await res.json();
          setJob(data);
          if (data.status === "completed" || data.status === "failed") return;
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, wsProgress]);

  const handleSubmit = useCallback(async () => {
    if (!file || targetLanguages.length === 0) return;
    setError(null);
    setJob(null);
    setJobId(null);
    try {
      const result = await submitJob(file, targetLanguages, sourceLanguage);
      setJobId(result.job_id);
    } catch (e: any) {
      setJobId(null);
      setError(
        e.message === "Network error during upload"
          ? "Cannot connect to backend. Make sure the server is running on port 8000."
          : e.message || "Failed to submit job"
      );
    }
  }, [file, targetLanguages, sourceLanguage, submitJob]);

  const handleReset = () => {
    setFile(null);
    setSourceLanguage(null);
    setTargetLanguages([]);
    setJobId(null);
    setJob(null);
    setError(null);
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
  };

  const isProcessing = uploading || (job && (job.status === "queued" || job.status === "processing"));
  const jobStatus: JobStatus = job?.status ?? "queued";
  const canSubmit = file && targetLanguages.length > 0 && !isProcessing;

  // Step: 0=upload, 1=languages, 2=ready, 3=processing
  const currentStep = !file ? 0 : targetLanguages.length === 0 ? 1 : jobId ? 3 : 2;

  return (
    <Layout onBack={onBack}>
      <div className="space-y-6">
        {/* Step progress */}
        <StepIndicator current={currentStep} isComplete={job?.status === "completed"} />

        {/* Step 1: Upload */}
        <StepSection
          step={1}
          label="Upload content"
          icon={Upload}
          active={currentStep === 0}
          done={currentStep > 0}
        >
          <UploadZone
            file={file}
            onFileSelect={setFile}
            onFileClear={handleClearFile}
            disabled={!!isProcessing}
          />
        </StepSection>

        {/* Step 2: Languages */}
        <StepSection
          step={2}
          label="Choose languages"
          icon={Languages}
          active={currentStep === 1}
          done={currentStep > 1}
        >
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguages={targetLanguages}
            onSourceChange={setSourceLanguage}
            onTargetChange={setTargetLanguages}
            disabled={!!isProcessing}
          />
        </StepSection>

        {/* Submit button */}
        {!jobId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                group w-full py-4 rounded-2xl text-[15px] font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                ${canSubmit
                  ? "bg-accent text-white shadow-lg shadow-accent/25 hover:shadow-accent/35 hover:brightness-110 active:scale-[0.98]"
                  : "bg-surface-2 text-text-4 border border-border cursor-not-allowed"
                }
              `}
            >
              {canSubmit && <Rocket className="w-4 h-4" strokeWidth={2} />}
              {!file
                ? "Upload a file to get started"
                : targetLanguages.length === 0
                  ? "Select target languages"
                  : `Translate to ${targetLanguages.length} language${targetLanguages.length > 1 ? "s" : ""}`}
              {canSubmit && (
                <span className="inline-block ml-0.5 transition-transform group-hover:translate-x-0.5">&rarr;</span>
              )}
            </button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-muted border border-red/15 text-[13px] text-red"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="font-semibold">{error}</p>
              {error.includes("backend") && (
                <p className="mt-1 text-[12px] text-red/70 font-mono">
                  cd backend && uvicorn app.main:app --port 8000
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Progress */}
        {jobId && (job?.status === "queued" || job?.status === "processing" || uploading) && (
          <ProgressTracker
            jobStatus={jobStatus}
            wsProgress={wsProgress}
            uploadProgress={uploadProgress}
            uploading={uploading}
          />
        )}

        {/* Results */}
        {job?.status === "completed" && job.results && (
          <div className="space-y-4">
            <ProgressTracker
              jobStatus="completed"
              wsProgress={null}
              uploadProgress={1}
              uploading={false}
            />
            <ResultsPanel job={job} />
            <button
              onClick={handleReset}
              className="group w-full py-3.5 rounded-xl text-[13px] font-semibold text-text-3 bg-surface/60 border border-border hover:border-border-2 hover:text-text-1 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform duration-300" strokeWidth={2} />
              Start new translation
            </button>
          </div>
        )}

        {/* Failed */}
        {job?.status === "failed" && (
          <div className="space-y-4">
            <ProgressTracker
              jobStatus="failed"
              wsProgress={wsProgress}
              uploadProgress={0}
              uploading={false}
            />
            <button
              onClick={handleReset}
              className="group w-full py-3.5 rounded-xl text-[13px] font-semibold text-text-3 bg-surface/60 border border-border hover:border-border-2 hover:text-text-1 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform duration-300" strokeWidth={2} />
              Try again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

/* ──────── Step progress indicator ──────── */

function StepIndicator({ current, isComplete }: { current: number; isComplete?: boolean }) {
  const steps = [
    { label: "Upload" },
    { label: "Languages" },
    { label: "Translate" },
  ];

  return (
    <div className="flex items-center gap-2 mb-2">
      {steps.map((step, i) => {
        const done = isComplete || i < current;
        const active = !isComplete && i === current;

        return (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`
                w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold transition-all duration-300
                ${done
                  ? "bg-green-muted text-green"
                  : active
                    ? "bg-accent-muted text-accent-2"
                    : "bg-surface-2 text-text-4"
                }
              `}>
                {done ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
              </div>
              <span className={`text-[12px] font-semibold transition-colors duration-200 ${done ? "text-text-2" : active ? "text-text-1" : "text-text-4"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 min-w-4 transition-colors duration-300 ${done ? "bg-green/30" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────── Step section wrapper ──────── */

function StepSection({
  step,
  label,
  icon: Icon,
  active,
  done,
  children,
}: {
  step: number;
  label: string;
  icon: typeof Upload;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <div className={`
          w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300
          ${done
            ? "bg-green-muted border border-green/15"
            : active
              ? "bg-accent-muted border border-accent/15"
              : "bg-surface-2 border border-border"
          }
        `}>
          {done ? (
            <Check className="w-3 h-3 text-green" strokeWidth={3} />
          ) : (
            <Icon className={`w-3 h-3 ${active ? "text-accent-2" : "text-text-4"}`} strokeWidth={2} />
          )}
        </div>
        <h2 className={`text-[13px] font-semibold tracking-wide transition-colors ${active ? "text-text-1" : "text-text-2"}`}>
          {label}
        </h2>
      </div>
      {children}
    </motion.section>
  );
}
