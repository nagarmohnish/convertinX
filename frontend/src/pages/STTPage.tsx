import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Download, RotateCcw, FileText } from "lucide-react";
import Layout from "../components/Layout";
import UploadZone from "../components/UploadZone";
import { getAuthHeaders } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";

export default function STTPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { progress } = useWebSocket(jobId);

  const pollJob = useCallback(async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed") {
          setResult(data.results);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setError(data.current_step || "Processing failed");
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 1500);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setError("");
    setResult(null);
    setSubmitting(true);

    const form = new FormData();
    form.append("file", file);
    form.append("output_format", "srt");

    try {
      const res = await fetch("/api/tools/stt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit");
      }
      const data = await res.json();
      setJobId(data.job_id);
      pollJob(data.job_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setJobId(null);
    setResult(null);
    setError("");
  };

  return (
    <Layout onBack={() => navigate("/app")}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[20px] font-bold text-text-1 flex items-center gap-2">
            <Mic className="w-5 h-5 text-red" />
            Speech to Text
          </h1>
          <p className="text-[13px] text-text-4 mt-1">Transcribe audio to text and subtitles</p>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <UploadZone
              file={file}
              onFileSelect={setFile}
              onFileClear={() => { setFile(null); setError(""); }}
              disabled={!!jobId}
              preset="audio"
            />

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-muted border border-red/15 text-[13px] text-red">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || submitting || !!jobId}
              className="w-full py-3.5 rounded-xl bg-accent text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-40"
            >
              <FileText className="w-4 h-4" />
              {submitting ? "Submitting..." : jobId ? `Transcribing... ${progress?.step || ""}` : "Transcribe"}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Transcript preview */}
            <div className="rounded-2xl bg-surface/60 border border-border p-5 max-h-[300px] overflow-y-auto">
              <p className="text-[12px] font-semibold text-text-3 mb-2">
                Transcript ({result.segment_count} segments, {result.detected_language})
              </p>
              <p className="text-[14px] text-text-2 whitespace-pre-wrap leading-relaxed">
                {result.text_preview}
              </p>
            </div>

            {/* Downloads */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={result.transcript_file}
                download
                className="py-3 rounded-xl bg-surface/60 border border-border text-text-2 text-[13px] font-semibold flex items-center justify-center gap-2 hover:border-accent/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download TXT
              </a>
              <a
                href={result.subtitle_file}
                download
                className="py-3 rounded-xl bg-surface/60 border border-border text-text-2 text-[13px] font-semibold flex items-center justify-center gap-2 hover:border-accent/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download SRT
              </a>
            </div>

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-surface/60 border border-border text-text-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:text-text-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Transcribe another
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
