import ScrollReveal from "../ui/ScrollReveal";
import { StaggerContainer, StaggerItem } from "../ui/ScrollReveal";

const FORMATS = [
  {
    type: "Video",
    inputs: ["MP4", "MOV", "AVI", "MKV", "WebM"],
    output: "Dubbed video with burned-in subtitles",
  },
  {
    type: "Audio",
    inputs: ["MP3", "WAV", "OGG", "FLAC", "M4A", "AAC"],
    output: "Dubbed audio in target language",
  },
  {
    type: "Text",
    inputs: ["TXT", "SRT", "VTT", "MD", "HTML", "JSON"],
    output: "Translated text file",
  },
];

export default function FormatMatrix() {
  return (
    <section className="py-32 relative">
      <div className="max-w-[1280px] mx-auto px-6">
        <ScrollReveal className="text-center mb-16">
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-bold text-text-1 tracking-[-0.03em]">
            Every format. One pipeline.
          </h2>
          <p className="mt-3 text-[16px] text-text-3 max-w-md mx-auto">
            Drop in your content and ConvertinX handles the rest.
          </p>
        </ScrollReveal>

        <StaggerContainer className="space-y-3 max-w-3xl mx-auto" stagger={0.1}>
          {FORMATS.map((fmt) => (
            <StaggerItem key={fmt.type}>
              <div className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-5 py-4 rounded-2xl bg-surface/60 border border-border hover:border-border-2 transition-all duration-300">
                {/* Type badge */}
                <span className="text-[11px] font-bold text-accent-2 uppercase tracking-[0.15em] w-14 shrink-0">
                  {fmt.type}
                </span>

                {/* Input pills */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {fmt.inputs.map((ext) => (
                    <span
                      key={ext}
                      className="px-2.5 py-1 rounded-md bg-surface-2 border border-border text-[11px] font-mono font-semibold text-text-3 tracking-wider group-hover:border-border-2 transition-colors"
                    >
                      {ext}
                    </span>
                  ))}
                </div>

                {/* Arrow */}
                <svg className="hidden sm:block w-4 h-4 text-text-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14m-6-6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Output */}
                <p className="text-[13px] text-text-2 sm:w-56 shrink-0 sm:text-right">
                  {fmt.output}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
