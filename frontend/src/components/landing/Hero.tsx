import { motion } from "framer-motion";

interface HeroProps {
  onLaunchApp: () => void;
}

const FLOATING_BADGES = [
  { label: "MP4", x: "8%", y: "18%", delay: 0 },
  { label: "WAV", x: "85%", y: "22%", delay: 0.8 },
  { label: "SRT", x: "12%", y: "75%", delay: 1.6 },
  { label: "JSON", x: "88%", y: "70%", delay: 0.4 },
  { label: "MKV", x: "5%", y: "48%", delay: 1.2 },
  { label: "FLAC", x: "92%", y: "48%", delay: 2.0 },
];

export default function Hero({ onLaunchApp }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.08] blur-[200px]" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan/[0.04] blur-[150px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" aria-hidden />

      {/* Floating badges */}
      <div className="absolute inset-0 hidden lg:block pointer-events-none" aria-hidden>
        {FLOATING_BADGES.map((badge) => (
          <motion.span
            key={badge.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + badge.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute px-2.5 py-1 rounded-md bg-surface-2/80 border border-border text-[11px] font-mono font-medium text-text-4 tracking-wider animate-float-slower"
            style={{ left: badge.x, top: badge.y }}
          >
            {badge.label}
          </motion.span>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/80 border border-border mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            <span className="text-[12px] font-medium text-text-3">Fully local. Zero cloud dependency</span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-display font-bold tracking-[-0.04em] leading-[1.05]">
            <span className="block text-[clamp(40px,7vw,80px)] text-text-1">Upload.</span>
            <span className="block text-[clamp(40px,7vw,80px)] text-gradient">Localize.</span>
            <span className="block text-[clamp(40px,7vw,80px)] text-text-1">Publish.</span>
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-6 text-[clamp(16px,2vw,20px)] text-text-3 leading-relaxed max-w-xl mx-auto"
          >
            Translate, dub, and subtitle any content into 10 languages.
            <br className="hidden sm:block" />
            Fully local. Zero cloud dependency.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          >
            <button
              onClick={onLaunchApp}
              className="group px-7 py-3.5 rounded-xl bg-accent text-white text-[15px] font-semibold hover:brightness-110 transition-all duration-300 shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98]"
            >
              Start Localizing
              <span className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
            </button>

            <a
              href="#pipeline"
              className="px-7 py-3.5 rounded-xl text-[15px] font-semibold text-text-3 border border-border hover:border-border-2 hover:text-text-2 transition-all duration-200"
            >
              See How It Works
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <svg className="w-5 h-5 text-text-4 animate-scroll-hint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 13 12 18 17 13" />
          <polyline points="7 6 12 11 17 6" />
        </svg>
      </motion.div>
    </section>
  );
}
