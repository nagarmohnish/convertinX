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
    <div className="space-y-6">
      {/* Source Language */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Source Language
        </label>
        <select
          value={sourceLanguage ?? "auto"}
          onChange={(e) =>
            onSourceChange(e.target.value === "auto" ? null : e.target.value)
          }
          disabled={disabled}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="auto">Auto-detect</option>
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Target Languages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">
            Target Languages
            {targetLanguages.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300">
                {targetLanguages.length} selected
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={disabled}
              className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50"
            >
              Select all
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              disabled={disabled}
              className="text-xs text-slate-400 hover:text-slate-300 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {LANGUAGES.map((lang) => {
            const isSource = lang.code === sourceLanguage;
            const isSelected = targetLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => !isSource && toggleTarget(lang.code)}
                disabled={disabled || isSource}
                className={`
                  px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                  ${
                    isSource
                      ? "bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-40"
                      : isSelected
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 ring-1 ring-violet-500/20"
                        : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <span className="mr-1.5">{lang.flag}</span>
                {lang.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
