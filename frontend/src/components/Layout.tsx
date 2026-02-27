import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  onBack?: () => void;
}

export default function Layout({ children, onBack }: LayoutProps) {
  return (
    <div className="min-h-screen relative noise-overlay">
      {/* Animated ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-[150px] animate-float-slow" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-cyan/[0.04] blur-[130px] animate-float-slower" />
        <div className="absolute top-[50%] left-[60%] w-[350px] h-[350px] rounded-full bg-accent/[0.03] blur-[120px] animate-float-slower" />
      </div>

      {/* Frosted header */}
      <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-bg/80">
        <div className="max-w-[780px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onBack}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text-1 transition-all duration-200 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
            )}
            <a href="#" onClick={onBack} className="flex items-center gap-2.5 group">
              <span className="text-[15px] font-semibold text-text-1 tracking-[-0.02em] font-display">
                Convertin<span className="text-accent">X</span>
              </span>
            </a>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/50 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-green" />
            <span className="text-[11px] font-medium text-text-3">Ready</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-[780px] mx-auto px-6 pt-8 pb-24">
        {children}
      </main>
    </div>
  );
}
