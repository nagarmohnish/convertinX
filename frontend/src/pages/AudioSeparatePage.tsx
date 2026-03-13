import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Download, RotateCcw, Disc3 } from "lucide-react";
import Layout from "../components/Layout";
import UploadZone from "../components/UploadZone";
import { getAuthHeaders } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";

const STEMS = [
  { key: "vocals_file", label: "Vocals", color: "text-accent-2" },
  { key: "drums_file", label: "Drums", color: "text-amber" },
  { key: "bass_file", label: "Bass", color: "text-green" },
  { key: "other_file", label: "Other", color: "text-cyan" },
];

export default function AudioSeparatePage() {
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
    }, 2000);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setError("");
    setResult(null);
    setSubmitting(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/tools/separate", {
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
            <Music2 className="w-5 h-5 text-accent" />
            Audio Separation
          </h1>
          <p className="text-[13px] text-text-4 mt-1">
            AI-powered stem separation using Demucs
          </p>
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
              <Disc3 className="w-4 h-4" />
              {submitting
                ? "Submitting..."
                : jobId
                  ? `Separating... ${progress?.step || ""}`
                  : "Separate Stems"
              }
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {STEMS.map((stem) => {
              const url = result[stem.key];
              if (!url) return null;
              return (
                <div
                  key={stem.key}
                  className="rounded-2xl bg-surface/60 border border-border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[14px] font-semibold ${stem.color}`}>
                      {stem.label}
                    </span>
                    <a
                      href={url}
                      download
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-2 border border-border text-[12px] text-text-3 hover:text-text-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      WAV
                    </a>
                  </div>
                  <audio controls className="w-full" src={url} />
                </div>
              );
            })}

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-surface/60 border border-border text-text-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:text-text-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Separate another
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
