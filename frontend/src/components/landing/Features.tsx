import { Target, Scan, Mic, Subtitles, Activity, ShieldCheck } from "lucide-react";
import ScrollReveal from "../ui/ScrollReveal";
import { StaggerContainer, StaggerItem } from "../ui/ScrollReveal";

const FEATURES = [
  {
    icon: Target,
    name: "Multi-target",
    desc: "Translate to multiple languages in one job",
    accent: false,
  },
  {
    icon: Scan,
    name: "Auto-detect",
    desc: "Source language identified automatically",
    accent: false,
  },
  {
    icon: Mic,
    name: "Natural dubbing",
    desc: "TTS synced to original speech timing",
    accent: false,
  },
  {
    icon: Subtitles,
    name: "Burned-in subtitles",
    desc: "Styled subtitles rendered into video",
    accent: false,
  },
  {
    icon: Activity,
    name: "Real-time progress",
    desc: "WebSocket-driven pipeline tracker",
    accent: false,
  },
  {
    icon: ShieldCheck,
    name: "Fully local",
    desc: "No API keys. No cloud. Your machine",
    accent: true,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-[1280px] mx-auto px-6">
        <ScrollReveal className="text-center mb-16">
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-bold text-text-1 tracking-[-0.03em]">
            Built for real workflows
          </h2>
          <p className="mt-3 text-[16px] text-text-3 max-w-md mx-auto">
            Everything you need to localize content at scale.
          </p>
        </ScrollReveal>

        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto"
          stagger={0.08}
        >
          {FEATURES.map((feat) => (
            <StaggerItem key={feat.name}>
              <div
                className={`
                  group relative rounded-2xl p-6 border transition-all duration-300 cursor-default
                  hover:-translate-y-0.5 hover:border-border-2
                  ${feat.accent
                    ? "bg-green-muted/30 border-green/10 hover:border-green/20"
                    : "bg-surface/60 border-border"
                  }
                `}
              >
                <feat.icon
                  className={`w-5 h-5 mb-4 ${feat.accent ? "text-green" : "text-accent-2"}`}
                  strokeWidth={1.5}
                />
                <h3 className="text-[15px] font-semibold text-text-1 mb-1.5">{feat.name}</h3>
                <p className="text-[13px] text-text-3 leading-relaxed">{feat.desc}</p>

                {/* Hover glow */}
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                    feat.accent ? "bg-green/[0.03]" : "bg-accent/[0.03]"
                  }`}
                />
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
