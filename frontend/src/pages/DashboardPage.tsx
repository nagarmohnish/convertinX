import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, BarChart3, History, Key, User, Globe,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import JobHistory from "../components/dashboard/JobHistory";
import UsageStats from "../components/dashboard/UsageStats";
import ApiKeyManager from "../components/dashboard/ApiKeyManager";
import DistributePanel from "../components/dashboard/DistributePanel";

type Tab = "overview" | "jobs" | "api-keys" | "distribution";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (!user) {
    navigate("/login");
    return null;
  }

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "jobs", label: "Job History", icon: History },
    { key: "api-keys", label: "API Keys", icon: Key },
    { key: "distribution", label: "Distribution", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 text-text-3 hover:text-text-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[18px] font-bold text-text-1 tracking-tight">
              Convertin<span className="text-accent">X</span>
            </span>
          </button>
          <div className="flex items-center gap-2 text-[13px] text-text-3">
            <User className="w-3.5 h-3.5" />
            {user.display_name || user.email}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-[24px] font-bold text-text-1">Dashboard</h1>
          <p className="text-text-4 text-[14px] mt-1">
            Manage your jobs, usage, and API access
          </p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 bg-surface/40 p-1 rounded-xl w-fit border border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all
                  ${tab === t.key
                    ? "bg-surface-2 text-text-1 border border-border shadow-sm"
                    : "text-text-4 hover:text-text-2"
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "overview" && <UsageStats />}
          {tab === "jobs" && <JobHistory />}
          {tab === "api-keys" && <ApiKeyManager />}
          {tab === "distribution" && <DistributePanel />}
        </motion.div>
      </div>
    </div>
  );
}
