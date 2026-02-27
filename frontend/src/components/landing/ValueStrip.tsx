import { Film, Headphones, FileText } from "lucide-react";
import { StaggerContainer, StaggerItem } from "../ui/ScrollReveal";

const VALUES = [
  {
    icon: Film,
    label: "Video",
    desc: "Dubbed video with burned-in subtitles",
  },
  {
    icon: Headphones,
    label: "Audio",
    desc: "Dubbed audio in target language",
  },
  {
    icon: FileText,
    label: "Text",
    desc: "Translated text files in any format",
  },
];

export default function ValueStrip() {
  return (
    <section className="relative py-24">
      <div className="max-w-[1280px] mx-auto px-6">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 relative">
          {VALUES.map((item, i) => (
            <StaggerItem key={item.label}>
              <div className="flex items-start gap-4 px-8 py-6 relative">
                {/* Divider */}
                {i > 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-border" />
                )}

                <item.icon className="w-5 h-5 text-accent-2 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h3 className="text-[15px] font-semibold text-text-1 mb-1">{item.label}</h3>
                  <p className="text-[14px] text-text-3 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
