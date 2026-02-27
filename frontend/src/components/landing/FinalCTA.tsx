import { motion } from "framer-motion";
import ScrollReveal from "../ui/ScrollReveal";

interface FinalCTAProps {
  onLaunchApp: () => void;
}

export default function FinalCTA({ onLaunchApp }: FinalCTAProps) {
  return (
    <section className="py-32 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.12] blur-[200px]" />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 relative">
        <ScrollReveal className="text-center">
          <h2 className="font-display text-[clamp(32px,5vw,56px)] font-bold text-text-1 tracking-[-0.03em] leading-tight">
            Your content.
            <br />
            <span className="text-gradient">Every language.</span>
          </h2>

          <p className="mt-5 text-[17px] text-text-3 max-w-md mx-auto">
            No sign-up. No cloud. Just run it.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <button
              onClick={onLaunchApp}
              className="group px-8 py-4 rounded-xl bg-accent text-white text-[16px] font-semibold hover:brightness-110 transition-all duration-300 shadow-xl shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98]"
            >
              Launch ConvertinX
              <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
            </button>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
