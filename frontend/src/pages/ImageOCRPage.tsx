import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Image, Download, RotateCcw, ScanText } from "lucide-react";
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

export default function ImageOCRPage() {
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
      const res = await fetch("/api/tools/image-ocr", {
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
            <Image className="w-5 h-5 text-amber" />
            Image OCR + Translation
          </h1>
          <p className="text-[13px] text-text-4 mt-1">
            Extract text from images, translate, and overlay
          </p>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <UploadZone
              file={file}
              onFileSelect={setFile}
              onFileClear={() => { setFile(null); setError(""); }}
              disabled={!!jobId}
              preset="image"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Text Language</label>
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
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Translate To</label>
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
              <ScanText className="w-4 h-4" />
              {submitting
                ? "Submitting..."
                : jobId
                  ? `Processing... ${progress?.step || ""}`
                  : "Extract & Translate"
              }
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Side-by-side images */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface/60 border border-border p-3 space-y-2">
                <p className="text-[11px] font-semibold text-text-3 uppercase">Original</p>
                <img
                  src={result.original_image}
                  alt="Original"
                  className="w-full rounded-lg object-contain max-h-[300px]"
                />
              </div>
              <div className="rounded-2xl bg-surface/60 border border-border p-3 space-y-2">
                <p className="text-[11px] font-semibold text-text-3 uppercase">Translated</p>
                <img
                  src={result.translated_image}
                  alt="Translated"
                  className="w-full rounded-lg object-contain max-h-[300px]"
                />
              </div>
            </div>

            {/* Extracted regions */}
            {result.regions && result.regions.length > 0 && (
              <div className="rounded-2xl bg-surface/60 border border-border p-4 max-h-[200px] overflow-y-auto">
                <p className="text-[12px] font-semibold text-text-3 mb-2">
                  {result.region_count} text regions found
                </p>
                <div className="space-y-1.5">
                  {result.regions.map((r: any, i: number) => (
                    <div key={i} className="text-[13px]">
                      <span className="text-text-4">{r.text}</span>
                      <span className="text-text-4 mx-2">&rarr;</span>
                      <span className="text-text-1">{r.translated}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downloads */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={result.translated_image}
                download
                className="py-3 rounded-xl bg-amber/10 border border-amber/20 text-amber text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-amber/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Translated Image
              </a>
              <a
                href={result.translated_text_file}
                download
                className="py-3 rounded-xl bg-surface/60 border border-border text-text-2 text-[13px] font-semibold flex items-center justify-center gap-2 hover:border-accent/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Text File
              </a>
            </div>

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-surface/60 border border-border text-text-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:text-text-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Process another image
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
