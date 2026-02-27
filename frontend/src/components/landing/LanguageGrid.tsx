import { Sparkles } from "lucide-react";
import ScrollReveal from "../ui/ScrollReveal";
import { StaggerContainer, StaggerItem } from "../ui/ScrollReveal";

const LANGUAGES = [
  { code: "EN", name: "English", native: "English" },
  { code: "HI", name: "Hindi", native: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "ES", name: "Spanish", native: "Espa\u00F1ol" },
  { code: "FR", name: "French", native: "Fran\u00E7ais" },
  { code: "DE", name: "German", native: "Deutsch" },
  { code: "JA", name: "Japanese", native: "\u65E5\u672C\u8A9E" },
  { code: "AR", name: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "PT", name: "Portuguese", native: "Portugu\u00EAs" },
  { code: "ZH", name: "Chinese", native: "\u4E2D\u6587" },
  { code: "KO", name: "Korean", native: "\uD55C\uAD6D\uC5B4" },
];

export default function LanguageGrid() {
  return (
    <section id="languages" className="py-32 relative">
      <div className="max-w-[1280px] mx-auto px-6">
        <ScrollReveal className="text-center mb-16">
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-bold text-text-1 tracking-[-0.03em]">
            10 Languages. One Upload.
          </h2>
          <p className="mt-3 text-[16px] text-text-3 max-w-md mx-auto">
            Reach a global audience without touching a single translation tool.
          </p>
        </ScrollReveal>

        <StaggerContainer
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto"
          stagger={0.06}
        >
          {LANGUAGES.map((lang) => (
            <StaggerItem key={lang.code}>
              <div className="group relative rounded-2xl bg-surface/60 border border-border p-5 text-center hover:border-accent/20 transition-all duration-300 cursor-default">
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-accent/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative">
                  <span className="inline-flex items-center justify-center w-10 h-7 rounded-md bg-surface-2 border border-border text-[11px] font-bold text-text-3 tracking-wider font-mono mb-3">
                    {lang.code}
                  </span>
                  <p className="text-[14px] font-semibold text-text-1">{lang.name}</p>
                  <p className="text-[13px] text-text-4 mt-0.5">{lang.native}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Auto-detect note */}
        <ScrollReveal delay={0.4} className="mt-10 flex items-center justify-center gap-2 text-[13px] text-text-3">
          <Sparkles className="w-3.5 h-3.5 text-amber" strokeWidth={2} />
          <span>Source language auto-detected from audio or text</span>
        </ScrollReveal>
      </div>
    </section>
  );
}
