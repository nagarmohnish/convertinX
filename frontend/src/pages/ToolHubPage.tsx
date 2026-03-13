import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Languages, Mic, FileText, Image, Music2, Volume2,
  ArrowLeft, User, LogIn, LayoutDashboard
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ToolCard {
  title: string;
  description: string;
  icon: typeof Languages;
  href: string;
  color: string;
  ready: boolean;
}

const translationTools: ToolCard[] = [
  {
    title: "Content Translation",
    description: "Translate audio, video, or text files across languages",
    icon: Languages,
    href: "/app/translate",
    color: "text-accent-2",
    ready: true,
  },
  {
    title: "Document Translation",
    description: "Translate PDF, DOCX, PPTX preserving formatting",
    icon: FileText,
    href: "/app/doc-translate",
    color: "text-cyan",
    ready: true,
  },
  {
    title: "Image OCR + Translate",
    description: "Extract text from images, translate, and overlay",
    icon: Image,
    href: "/app/image-ocr",
    color: "text-amber",
    ready: true,
  },
];

const audioTools: ToolCard[] = [
  {
    title: "Text to Speech",
    description: "Convert text to natural-sounding audio in 10+ languages",
    icon: Volume2,
    href: "/app/tts",
    color: "text-green",
    ready: true,
  },
  {
    title: "Speech to Text",
    description: "Transcribe audio to text, SRT, or VTT subtitles",
    icon: Mic,
    href: "/app/stt",
    color: "text-red",
    ready: true,
  },
  {
    title: "Audio Separation",
    description: "Isolate vocals, drums, bass, and instrumentals",
    icon: Music2,
    href: "/app/audio-separate",
    color: "text-accent",
    ready: true,
  },
];

export default function ToolHubPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-3 hover:text-text-1 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[18px] font-bold text-text-1 tracking-tight">
              Convertin<span className="text-accent">X</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/app/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] text-text-3 hover:text-text-1 hover:bg-surface-2/50 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] text-text-4 hover:text-text-1 hover:bg-surface-2/50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  {user.display_name}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold hover:brightness-110 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-[28px] font-bold text-text-1 tracking-tight">Tools</h1>
          <p className="text-text-4 text-[15px] mt-1">
            Create content in your language. We handle the rest.
          </p>
        </motion.div>

        <ToolSection title="Translation" tools={translationTools} delay={0} />
        <ToolSection title="Audio & Speech" tools={audioTools} delay={0.1} />
      </main>
    </div>
  );
}

function ToolSection({ title, tools, delay }: { title: string; tools: ToolCard[]; delay: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mb-10"
    >
      <h2 className="text-[13px] font-semibold text-text-3 uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <ToolCardComponent key={tool.href} tool={tool} />
        ))}
      </div>
    </motion.section>
  );
}

function ToolCardComponent({ tool }: { tool: ToolCard }) {
  const Icon = tool.icon;
  const inner = (
    <div className={`
      relative group rounded-2xl bg-surface/60 border border-border p-5 transition-all duration-300
      ${tool.ready
        ? "hover:border-accent/30 hover:bg-surface-2/30 cursor-pointer"
        : "opacity-50 cursor-not-allowed"
      }
    `}>
      {!tool.ready && (
        <span className="absolute top-3 right-3 text-[10px] font-bold text-text-4 bg-surface-2 px-2 py-0.5 rounded-full">
          COMING SOON
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3 ${tool.ready ? "group-hover:border-accent/20" : ""}`}>
        <Icon className={`w-5 h-5 ${tool.color}`} strokeWidth={1.5} />
      </div>
      <h3 className="text-[15px] font-semibold text-text-1 mb-1">{tool.title}</h3>
      <p className="text-[13px] text-text-4 leading-relaxed">{tool.description}</p>
    </div>
  );

  if (!tool.ready) return inner;

  return <Link to={tool.href}>{inner}</Link>;
}
