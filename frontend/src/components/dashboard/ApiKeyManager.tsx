import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchKeys = () => {
    apiFetch("/api/api-keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchKeys, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch(`/api/api-keys?name=${encodeURIComponent(newKeyName)}`, {
        method: "POST",
      });
      const data = await res.json();
      setNewKeyValue(data.key);
      setNewKeyName("");
      fetchKeys();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    await apiFetch(`/api/api-keys/${id}`, { method: "DELETE" });
    fetchKeys();
  };

  const copyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Newly created key banner */}
      {newKeyValue && (
        <div className="rounded-2xl bg-green/5 border border-green/20 p-4 space-y-2">
          <p className="text-[13px] font-semibold text-green">
            API key created! Copy it now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-[12px] text-text-1 font-mono break-all">
              {newKeyValue}
            </code>
            <button
              onClick={copyKey}
              className="p-2 rounded-lg bg-surface-2 border border-border text-text-3 hover:text-text-1"
            >
              {copied ? <Check className="w-4 h-4 text-green" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewKeyValue(null)}
            className="text-[12px] text-text-4 hover:text-text-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      {showForm ? (
        <div className="rounded-2xl bg-surface/60 border border-border p-4 space-y-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Testing)"
            className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none focus:border-accent/50"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={createKey}
              disabled={!newKeyName.trim() || creating}
              className="px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold hover:brightness-110 disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewKeyName(""); }}
              className="px-4 py-2 rounded-lg text-text-4 text-[13px] hover:text-text-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      )}

      {/* API key list */}
      <div className="rounded-2xl bg-surface/60 border border-border overflow-hidden">
        {loading ? (
          <div className="text-text-4 text-[14px] py-12 text-center">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="text-text-4 text-[14px] py-12 text-center">
            No API keys yet. Create one to access the API programmatically.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {keys.map((k) => (
              <div key={k.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className={`w-4 h-4 ${k.is_active ? "text-accent" : "text-text-4"}`} />
                  <div>
                    <p className="text-[13px] font-semibold text-text-1">{k.name}</p>
                    <p className="text-[12px] text-text-4 font-mono">
                      {k.key_prefix}...{" "}
                      {!k.is_active && (
                        <span className="text-red font-sans">revoked</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-4">
                    {k.created_at ? new Date(k.created_at).toLocaleDateString() : ""}
                  </span>
                  {k.is_active && (
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="p-1.5 rounded-lg text-text-4 hover:text-red hover:bg-red/5 transition-colors"
                      title="Revoke"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage instructions */}
      <div className="rounded-2xl bg-surface/60 border border-border p-5">
        <h3 className="text-[14px] font-semibold text-text-1 mb-2">API Usage</h3>
        <p className="text-[13px] text-text-4 mb-3">
          Use your API key in the Authorization header:
        </p>
        <code className="block px-4 py-3 rounded-xl bg-surface-2 border border-border text-[12px] text-text-2 font-mono">
          Authorization: ApiKey cvx_your_key_here
        </code>
      </div>
    </div>
  );
}
