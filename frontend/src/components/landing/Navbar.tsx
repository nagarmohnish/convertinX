import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface NavbarProps {
  onLaunchApp: () => void;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#pipeline" },
  { label: "Languages", href: "#languages" },
];

export default function Navbar({ onLaunchApp }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`
        fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-500
        ${scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
        }
      `}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <span className="text-[17px] font-semibold text-text-1 tracking-[-0.02em] font-display">
            Convertin<span className="text-accent">X</span>
          </span>
        </a>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 text-[13px] font-medium text-text-3 hover:text-text-1 transition-colors duration-200 rounded-lg hover:bg-surface/50"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onLaunchApp}
          className="group relative px-4 py-2 rounded-full text-[13px] font-semibold text-accent-2 border border-accent/30 hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 hover:shadow-[0_0_24px_rgba(139,92,246,0.3)]"
        >
          Launch App
          <span className="inline-block ml-1 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
        </button>
      </div>
    </motion.nav>
  );
}
