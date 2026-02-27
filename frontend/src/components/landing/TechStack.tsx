import ScrollReveal from "../ui/ScrollReveal";

const GROUPS = [
  {
    label: "Frontend",
    items: ["React", "TypeScript", "Tailwind", "Vite"],
  },
  {
    label: "Backend",
    items: ["Python", "FastAPI"],
  },
  {
    label: "Models",
    items: ["Whisper", "Opus-MT", "Edge TTS"],
  },
  {
    label: "Processing",
    items: ["FFmpeg", "pydub"],
  },
];

export default function TechStack() {
  return (
    <section className="py-24 relative">
      <div className="max-w-[1280px] mx-auto px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
              {GROUPS.map((group, gi) => (
                <div key={group.label} className="flex items-center gap-2">
                  {gi > 0 && (
                    <span className="hidden sm:block w-px h-4 bg-border mx-3" />
                  )}

                  <span className="text-[10px] font-bold text-text-4 uppercase tracking-[0.15em] mr-2">
                    {group.label}
                  </span>

                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="text-[13px] font-medium text-text-4 hover:text-text-1 transition-colors duration-200 cursor-default px-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
