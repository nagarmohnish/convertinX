import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, ArrowRight, Sparkles, Globe } from "lucide-react";
import { LANGUAGES } from "../utils/languages";

interface LanguageSelectorProps {
  sourceLanguage: string | null;
  targetLanguages: string[];
  onSourceChange: (lang: string | null) => void;
  onTargetChange: (langs: string[]) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  sourceLanguage,
  targetLanguages,
  onSourceChange,
  onTargetChange,
  disabled,
}: LanguageSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleTarget = (code: string) => {
    if (targetLanguages.includes(code)) {
      onTargetChange(targetLanguages.filter((l) => l !== code));
    } else {
      onTargetChange([...targetLanguages, code]);
    }
  };

  const selectAll = () => {
    const all = LANGUAGES.filter((l) => l.code !== sourceLanguage).map((l) => l.code);
    onTargetChange(all);
  };

  const deselectAll = () => onTargetChange([]);

  return (
    <div className="rounded-2xl bg-surface/60 border border-border overflow-hidden">
      {/* Source language row */}
      <div className="px-5 py-4 flex items-center gap-4 border-b border-border">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-text-4 uppercase tracking-[0.12em]">
            From
          </span>
          {sourceLanguage === null && (
            <Sparkles className="w-3 h-3 text-amber" strokeWidth={2} />
          )}
        </div>

        <div className="relative flex-1">
          <select
            value={sourceLanguage ?? "auto"}
            onChange={(e) => onSourceChange(e.target.value === "auto" ? null : e.target.value)}
            disabled={disabled}
            className="w-full appearance-none bg-transparent text-[14px] text-text-1 font-medium focus:outline-none cursor-pointer disabled:opacity-40 pr-6"
            style={{ colorScheme: "dark" }}
          >
            <option value="auto">Auto-detect</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <ArrowRight className="w-4 h-4 text-text-4 shrink-0 hidden sm:block" />

        {/* Target count */}
        <AnimatePresence>
          {targetLanguages.length > 0 && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="min-w-[28px] h-7 flex items-center justify-center rounded-lg bg-accent text-[12px] font-bold text-white px-2 shrink-0"
            >
              {targetLanguages.length}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Target languages */}
      <div className="px-5 py-4 space-y-3">
        {/* Search + actions row */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-text-4 uppercase tracking-[0.12em] shrink-0">
            To
          </span>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-4 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search languages..."
              disabled={disabled}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-2/60 border border-transparent focus:border-border-2 text-[13px] text-text-2 placeholder:text-text-4 outline-none transition-all disabled:opacity-40"
            />
          </div>

          <div className="flex gap-0.5 shrink-0">
            <MiniButton onClick={selectAll} disabled={disabled} label="All" />
            <MiniButton onClick={deselectAll} disabled={disabled} label="None" />
          </div>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {filteredLanguages.map((lang) => {
            const isSource = lang.code === sourceLanguage;
            const isSelected = targetLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  if (!isSource && !disabled) toggleTarget(lang.code);
                }}
                disabled={disabled || isSource}
                className={`
                  group/lang relative flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-left transition-all duration-200
                  ${isSource
                    ? "opacity-20 cursor-not-allowed"
                    : isSelected
                      ? "bg-accent-muted border border-accent/25 text-text-1 shadow-sm shadow-accent/5"
                      : "bg-surface-2/50 border border-transparent hover:border-border-2 text-text-3 hover:text-text-2 hover:bg-surface-3/50 active:scale-[0.97]"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <span className={`
                  w-7 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold tracking-wider shrink-0 transition-all duration-200
                  ${isSelected
                    ? "bg-accent/25 text-accent-2"
                    : "bg-surface-3 text-text-4 group-hover/lang:text-text-3"
                  }
                `}>
                  {lang.flag}
                </span>

                <span className="text-[13px] font-medium truncate flex-1">{lang.name}</span>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-accent-2 shrink-0" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>

        {/* No results */}
        {filteredLanguages.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-2">
            <Globe className="w-5 h-5 text-text-4" strokeWidth={1.5} />
            <p className="text-[13px] text-text-4">
              No languages match &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

        {/* Selection summary */}
        {targetLanguages.length > 0 && !search && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <p className="text-[12px] text-text-3">
              {targetLanguages.length} language{targetLanguages.length > 1 ? "s" : ""} selected
            </p>
            <div className="flex items-center gap-1">
              {targetLanguages.slice(0, 5).map((code) => {
                const lang = LANGUAGES.find(l => l.code === code);
                return (
                  <span key={code} className="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-surface-2">
                    {lang?.flag ?? code.toUpperCase()}
                  </span>
                );
              })}
              {targetLanguages.length > 5 && (
                <span className="text-[11px] text-text-4 font-mono ml-1">+{targetLanguages.length - 5}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 text-[11px] font-semibold text-text-4 hover:text-text-2 rounded-lg hover:bg-surface-3 disabled:opacity-40 transition-all"
    >
      {label}
    </button>
  );
}
