import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Send, ExternalLink, Rss, Webhook } from "lucide-react";
import { apiFetch } from "../../utils/api";

const PLATFORM_ICONS: Record<string, typeof Globe> = {
  youtube: Globe,
  podcast: Rss,
  webhook: Webhook,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "text-red",
  podcast: "text-accent",
  webhook: "text-cyan",
};

export default function DistributePanel() {
  const [targets, setTargets] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState("");
  const [connectName, setConnectName] = useState("");
  const [connectConfig, setConnectConfig] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [distJobs, setDistJobs] = useState<any[]>([]);

  const fetchTargets = () => {
    Promise.all([
      apiFetch("/api/distribution/targets").then((r) => r.json()),
      apiFetch("/api/distribution/platforms").then((r) => r.json()),
      apiFetch("/api/distribution/jobs").then((r) => r.json()),
    ])
      .then(([t, p, j]) => {
        setTargets(t.targets);
        setPlatforms(p.platforms);
        setDistJobs(j.distribution_jobs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchTargets, []);

  const handleConnect = async () => {
    if (!connectPlatform) return;
    setConnecting(true);
    try {
      let config: Record<string, any> = {};
      if (connectConfig.trim()) {
        try {
          config = JSON.parse(connectConfig);
        } catch {
          config = { webhook_url: connectConfig };
        }
      }

      await apiFetch("/api/distribution/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: connectPlatform,
          name: connectName || "Default",
          config,
        }),
      });
      setShowConnect(false);
      setConnectPlatform("");
      setConnectName("");
      setConnectConfig("");
      fetchTargets();
    } catch {
      // ignore
    } finally {
      setConnecting(false);
    }
  };

  const disconnectTarget = async (id: string) => {
    await apiFetch(`/api/distribution/targets/${id}`, { method: "DELETE" });
    fetchTargets();
  };

  if (loading) {
    return <div className="text-text-4 text-[14px] py-12 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Connected targets */}
      <div className="rounded-2xl bg-surface/60 border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-text-1">Connected Platforms</h3>
          <button
            onClick={() => setShowConnect(!showConnect)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-semibold hover:brightness-110"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect
          </button>
        </div>

        {/* Connect form */}
        {showConnect && (
          <div className="px-4 py-4 border-b border-border space-y-3 bg-surface-2/20">
            <select
              value={connectPlatform}
              onChange={(e) => setConnectPlatform(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] focus:outline-none"
            >
              <option value="">Select platform...</option>
              {Object.entries(platforms).map(([key, info]: [string, any]) => (
                <option key={key} value={key}>{info.name} — {info.description}</option>
              ))}
            </select>
            <input
              type="text"
              value={connectName}
              onChange={(e) => setConnectName(e.target.value)}
              placeholder="Connection name (optional)"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none"
            />
            {connectPlatform === "webhook" && (
              <input
                type="url"
                value={connectConfig}
                onChange={(e) => setConnectConfig(e.target.value)}
                placeholder="Webhook URL (https://...)"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={!connectPlatform || connecting}
                className="px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold disabled:opacity-40"
              >
                {connecting ? "Connecting..." : "Connect"}
              </button>
              <button
                onClick={() => setShowConnect(false)}
                className="px-4 py-2 rounded-lg text-text-4 text-[13px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {targets.length === 0 ? (
          <div className="text-text-4 text-[14px] py-8 text-center">
            No platforms connected. Click "Connect" to add one.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {targets.map((t) => {
              const Icon = PLATFORM_ICONS[t.platform] || Globe;
              const color = PLATFORM_COLORS[t.platform] || "text-text-3";
              return (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className="text-[13px] font-semibold text-text-1">{t.name}</p>
                      <p className="text-[12px] text-text-4">
                        {platforms[t.platform]?.name || t.platform}
                        {!t.is_active && <span className="text-red ml-2">disconnected</span>}
                      </p>
                    </div>
                  </div>
                  {t.is_active && (
                    <button
                      onClick={() => disconnectTarget(t.id)}
                      className="p-1.5 rounded-lg text-text-4 hover:text-red hover:bg-red/5"
                      title="Disconnect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent distributions */}
      {distJobs.length > 0 && (
        <div className="rounded-2xl bg-surface/60 border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[14px] font-semibold text-text-1">Recent Publications</h3>
          </div>
          <div className="divide-y divide-border/50">
            {distJobs.map((j) => (
              <div key={j.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-text-1">
                    {j.language} — <span className={j.status === "published" ? "text-green" : "text-red"}>{j.status}</span>
                  </p>
                  <p className="text-[12px] text-text-4">
                    {j.created_at ? new Date(j.created_at).toLocaleString() : ""}
                  </p>
                </div>
                {j.platform_url && (
                  <a
                    href={j.platform_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-text-4 hover:text-accent"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
