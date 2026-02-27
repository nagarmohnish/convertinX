import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Upload, FileAudio, Languages, AudioLines, Download } from "lucide-react";
import ScrollReveal from "../ui/ScrollReveal";

const STEPS = [
  {
    icon: Upload,
    label: "Upload",
    desc: "Drop a file up to 500 MB",
  },
  {
    icon: FileAudio,
    label: "Transcribe",
    desc: "Whisper extracts speech to text",
  },
  {
    icon: Languages,
    label: "Translate",
    desc: "Opus-MT translates to target languages",
  },
  {
    icon: AudioLines,
    label: "Synthesize",
    desc: "Edge TTS generates time-synced audio",
  },
  {
    icon: Download,
    label: "Download",
    desc: "Video, audio, subtitles — ready to publish",
  },
];

export default function Pipeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.7", "end 0.5"],
  });

  return (
    <section id="pipeline" className="py-32 relative" ref={containerRef}>
      {/* Blueprint grid bg */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" aria-hidden />

      <div className="max-w-[1280px] mx-auto px-6 relative">
        <ScrollReveal className="text-center mb-20">
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-bold text-text-1 tracking-[-0.03em]">
            How it works
          </h2>
          <p className="mt-3 text-[16px] text-text-3 max-w-lg mx-auto">
            A single pipeline processes your content from upload to publish-ready output.
          </p>
        </ScrollReveal>

        {/* Desktop pipeline (horizontal) */}
        <div className="hidden lg:block">
          <DesktopPipeline scrollProgress={scrollYProgress} />
        </div>

        {/* Mobile pipeline (vertical) */}
        <div className="lg:hidden">
          <MobilePipeline scrollProgress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function DesktopPipeline({
  scrollProgress,
}: {
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Connecting lines */}
      <svg
        className="absolute top-[36px] left-0 w-full h-4 pointer-events-none"
        preserveAspectRatio="none"
      >
        {/* Background line */}
        <line
          x1="10%"
          y1="50%"
          x2="90%"
          y2="50%"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
        />
        {/* Animated active line */}
        <motion.line
          x1="10%"
          y1="50%"
          x2="90%"
          y2="50%"
          stroke="url(#pipeGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength: scrollProgress }}
        />
        <defs>
          <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Nodes */}
      <div className="relative grid grid-cols-5 gap-4">
        {STEPS.map((step, i) => (
          <PipelineNode
            key={step.label}
            step={step}
            index={i}
            total={STEPS.length}
            scrollProgress={scrollProgress}
          />
        ))}
      </div>
    </div>
  );
}

function MobilePipeline({
  scrollProgress,
}: {
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  return (
    <div className="relative max-w-sm mx-auto">
      {/* Vertical connecting line */}
      <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />
      <motion.div
        className="absolute left-[27px] top-0 w-px bg-gradient-to-b from-accent via-accent-2 to-cyan origin-top"
        style={{ scaleY: scrollProgress, height: "100%" }}
      />

      <div className="space-y-8">
        {STEPS.map((step, i) => (
          <MobilePipelineNode
            key={step.label}
            step={step}
            index={i}
            total={STEPS.length}
            scrollProgress={scrollProgress}
          />
        ))}
      </div>
    </div>
  );
}

function PipelineNode({
  step,
  index,
  total,
  scrollProgress,
}: {
  step: (typeof STEPS)[number];
  index: number;
  total: number;
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const threshold = index / (total - 1);
  const isActive = useTransform(scrollProgress, (v) => v >= threshold - 0.05);

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Node circle */}
      <motion.div
        className="relative w-[72px] h-[72px] rounded-2xl border flex items-center justify-center mb-4 transition-all duration-500"
        style={{
          backgroundColor: useTransform(isActive, (a) =>
            a ? "rgba(139, 92, 246, 0.12)" : "rgba(24, 24, 27, 0.8)"
          ),
          borderColor: useTransform(isActive, (a) =>
            a ? "rgba(139, 92, 246, 0.3)" : "rgba(255, 255, 255, 0.06)"
          ),
        }}
      >
        <motion.div
          style={{
            color: useTransform(isActive, (a) =>
              a ? "#A78BFA" : "#52525B"
            ),
          }}
        >
          <step.icon className="w-6 h-6" strokeWidth={1.5} />
        </motion.div>

        {/* Glow behind active node */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl -z-10"
          style={{
            opacity: useTransform(isActive, (a) => (a ? 0.6 : 0)),
          }}
        />
      </motion.div>

      <h3 className="text-[14px] font-semibold text-text-1 mb-1">{step.label}</h3>
      <p className="text-[12px] text-text-3 leading-relaxed max-w-[160px]">{step.desc}</p>
    </motion.div>
  );
}

function MobilePipelineNode({
  step,
  index,
  total,
  scrollProgress,
}: {
  step: (typeof STEPS)[number];
  index: number;
  total: number;
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const threshold = index / (total - 1);
  const isActive = useTransform(scrollProgress, (v) => v >= threshold - 0.05);

  return (
    <motion.div
      className="flex items-start gap-5"
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <motion.div
        className="relative w-[54px] h-[54px] rounded-xl border flex items-center justify-center shrink-0 transition-all duration-500"
        style={{
          backgroundColor: useTransform(isActive, (a) =>
            a ? "rgba(139, 92, 246, 0.12)" : "rgba(24, 24, 27, 0.8)"
          ),
          borderColor: useTransform(isActive, (a) =>
            a ? "rgba(139, 92, 246, 0.3)" : "rgba(255, 255, 255, 0.06)"
          ),
        }}
      >
        <motion.div
          style={{
            color: useTransform(isActive, (a) =>
              a ? "#A78BFA" : "#52525B"
            ),
          }}
        >
          <step.icon className="w-5 h-5" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      <div className="pt-2">
        <h3 className="text-[14px] font-semibold text-text-1 mb-1">{step.label}</h3>
        <p className="text-[13px] text-text-3 leading-relaxed">{step.desc}</p>
      </div>
    </motion.div>
  );
}
