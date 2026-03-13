import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Download, RotateCcw, Languages } from "lucide-react";
import Layout from "../components/Layout";
import UploadZone from "../components/UploadZone";
import { getAuthHeaders } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
];

export default function DocTranslatePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("es");
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
    form.append("source_language", srcLang);
    form.append("target_language", tgtLang);

    try {
      const res = await fetch("/api/tools/doc-translate", {
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
            <FileText className="w-5 h-5 text-cyan" />
            Document Translation
          </h1>
          <p className="text-[13px] text-text-4 mt-1">
            Translate PDF, DOCX, or PPTX while preserving formatting
          </p>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <UploadZone
              file={file}
              onFileSelect={setFile}
              onFileClear={() => { setFile(null); setError(""); }}
              disabled={!!jobId}
              preset="document"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">From</label>
                <select
                  value={srcLang}
                  onChange={(e) => setSrcLang(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] focus:outline-none focus:border-accent/50"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">To</label>
                <select
                  value={tgtLang}
                  onChange={(e) => setTgtLang(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] focus:outline-none focus:border-accent/50"
                >
                  {LANGUAGES.filter(l => l.code !== srcLang).map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

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
              <Languages className="w-4 h-4" />
              {submitting
                ? "Submitting..."
                : jobId
                  ? `Translating... ${progress?.step || ""}`
                  : "Translate Document"
              }
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-2xl bg-surface/60 border border-border p-5">
              <p className="text-[12px] font-semibold text-text-3 mb-2">Translation Complete</p>
              <p className="text-[14px] text-text-2">
                {result.doc_type?.toUpperCase()} — {result.block_count} text blocks translated
                from {result.source_language} to {result.target_language}
              </p>
            </div>

            <a
              href={result.translated_file}
              download
              className="w-full py-3.5 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-cyan/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Translated {result.doc_type?.toUpperCase()}
            </a>

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-surface/60 border border-border text-text-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:text-text-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Translate another document
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
