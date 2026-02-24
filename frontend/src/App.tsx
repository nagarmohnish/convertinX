import { useState, useCallback, useEffect } from "react";
import Layout from "./components/Layout";
import UploadZone from "./components/UploadZone";
import LanguageSelector from "./components/LanguageSelector";
import ProgressTracker from "./components/ProgressTracker";
import ResultsPanel from "./components/ResultsPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { useUpload } from "./hooks/useUpload";
import type { Job, JobStatus } from "./types";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { submitJob, uploading, uploadProgress } = useUpload();
  const { progress: wsProgress } = useWebSocket(jobId);

  // Poll job status when we have a jobId
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data: Job = await res.json();
          setJob(data);

          if (data.status === "completed" || data.status === "failed") {
            return;
          }
        }
      } catch {
        // Ignore polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, wsProgress]);

  const handleSubmit = useCallback(async () => {
    if (!file || targetLanguages.length === 0) return;

    setError(null);
    setJob(null);

    try {
      const result = await submitJob(file, targetLanguages, sourceLanguage);
      setJobId(result.job_id);
    } catch (e: any) {
      setError(e.message || "Failed to submit job");
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

  const isProcessing =
    uploading || (job && (job.status === "queued" || job.status === "processing"));
  const jobStatus: JobStatus = job?.status ?? "queued";

  return (
    <Layout>
      <div className="space-y-8">
        {/* Upload Section */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Upload Content</h2>
          <p className="text-sm text-slate-400">
            Upload text, audio, or video files to translate into any language
          </p>
          <UploadZone
            file={file}
            onFileSelect={setFile}
            disabled={!!isProcessing}
          />
        </section>

        {/* Language Selection */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Languages</h2>
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguages={targetLanguages}
            onSourceChange={setSourceLanguage}
            onTargetChange={setTargetLanguages}
            disabled={!!isProcessing}
          />
        </section>

        {/* Submit Button */}
        {!jobId && (
          <button
            onClick={handleSubmit}
            disabled={
              !file || targetLanguages.length === 0 || !!isProcessing
            }
            className="w-full py-3.5 rounded-xl font-medium text-white transition-all duration-200
              bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
              disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
              shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:shadow-none"
          >
            {!file
              ? "Select a file to get started"
              : targetLanguages.length === 0
                ? "Select at least one target language"
                : `Translate to ${targetLanguages.length} language${targetLanguages.length > 1 ? "s" : ""}`}
          </button>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Progress Tracker */}
        {jobId &&
          (job?.status === "queued" ||
            job?.status === "processing" ||
            uploading) && (
            <ProgressTracker
              jobStatus={jobStatus}
              wsProgress={wsProgress}
              uploadProgress={uploadProgress}
              uploading={uploading}
            />
          )}

        {/* Results */}
        {job?.status === "completed" && job.results && (
          <>
            <ProgressTracker
              jobStatus="completed"
              wsProgress={null}
              uploadProgress={1}
              uploading={false}
            />
            <ResultsPanel job={job} />
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              Translate Another File
            </button>
          </>
        )}

        {/* Failed State */}
        {job?.status === "failed" && (
          <>
            <ProgressTracker
              jobStatus="failed"
              wsProgress={wsProgress}
              uploadProgress={0}
              uploading={false}
            />
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}
