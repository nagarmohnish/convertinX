import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Volume2, Play, Download, RotateCcw } from "lucide-react";
import Layout from "../components/Layout";
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

export default function TTSPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("female");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { progress } = useWebSocket(jobId);

  // Poll for result
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
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setError("");
    setResult(null);
    setSubmitting(true);

    const form = new FormData();
    form.append("text", text);
    form.append("language", language);
    form.append("voice_gender", voice);

    try {
      const res = await fetch("/api/tools/tts", {
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
    setText("");
    setJobId(null);
    setResult(null);
    setError("");
  };

  return (
    <Layout onBack={() => navigate("/app")}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[20px] font-bold text-text-1 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green" />
            Text to Speech
          </h1>
          <p className="text-[13px] text-text-4 mt-1">Convert text to natural-sounding audio</p>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here..."
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 rounded-2xl bg-surface/60 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
            <div className="flex items-center gap-3 text-[12px] text-text-4">
              <span>{text.length}/5000</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] focus:outline-none focus:border-accent/50"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] focus:outline-none focus:border-accent/50"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
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
              disabled={!text.trim() || submitting || !!jobId}
              className="w-full py-3.5 rounded-xl bg-accent text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-40"
            >
              <Play className="w-4 h-4" />
              {submitting ? "Submitting..." : jobId ? `Processing... ${progress?.step || ""}` : "Generate Speech"}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-2xl bg-surface/60 border border-border p-5">
              <audio controls className="w-full" src={result.audio_file} />
            </div>

            <a
              href={result.audio_file}
              download
              className="w-full py-3.5 rounded-xl bg-green/10 border border-green/20 text-green text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-green/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download MP3
            </a>

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-surface/60 border border-border text-text-3 text-[13px] font-semibold flex items-center justify-center gap-2 hover:text-text-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Generate another
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
