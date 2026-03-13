import { useState, useEffect } from "react";
import { BarChart3, CheckCircle, XCircle, Clock } from "lucide-react";
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

export default function UsageStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-text-4 text-[14px] py-12 text-center">
        Loading stats...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-text-4 text-[14px] py-12 text-center">
        Failed to load stats
      </div>
    );
  }

  const statusCards = [
    {
      label: "Total Jobs",
      value: stats.total_jobs,
      icon: BarChart3,
      color: "text-accent",
    },
    {
      label: "Completed",
      value: stats.by_status?.completed || 0,
      icon: CheckCircle,
      color: "text-green",
    },
    {
      label: "Failed",
      value: stats.by_status?.failed || 0,
      icon: XCircle,
      color: "text-red",
    },
    {
      label: "Processing",
      value: (stats.by_status?.processing || 0) + (stats.by_status?.queued || 0),
      icon: Clock,
      color: "text-amber",
    },
  ];

  const toolEntries = Object.entries(stats.by_tool || {}).sort(
    (a, b) => (b[1] as number) - (a[1] as number)
  );
  const maxToolCount = toolEntries.length > 0 ? (toolEntries[0][1] as number) : 1;

  return (
    <div className="space-y-6">
      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl bg-surface/60 border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-[12px] text-text-4 font-medium">{card.label}</span>
              </div>
              <p className="text-[28px] font-bold text-text-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tool usage breakdown */}
      {toolEntries.length > 0 && (
        <div className="rounded-2xl bg-surface/60 border border-border p-5">
          <h3 className="text-[14px] font-semibold text-text-1 mb-4">Usage by Tool</h3>
          <div className="space-y-3">
            {toolEntries.map(([tool, count]) => (
              <div key={tool}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-text-2">
                    {TOOL_LABELS[tool] || tool}
                  </span>
                  <span className="text-[13px] text-text-4 font-mono">{count as number}</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${((count as number) / maxToolCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total_jobs === 0 && (
        <div className="text-center py-12 text-text-4 text-[14px]">
          No jobs yet. Start using tools to see your usage stats here.
        </div>
      )}
    </div>
  );
}
