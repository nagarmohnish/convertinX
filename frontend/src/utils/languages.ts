import type { Language } from "../types";

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "EN" },
  { code: "hi", name: "Hindi", flag: "HI" },
  { code: "es", name: "Spanish", flag: "ES" },
  { code: "fr", name: "French", flag: "FR" },
  { code: "de", name: "German", flag: "DE" },
  { code: "ja", name: "Japanese", flag: "JA" },
  { code: "ar", name: "Arabic", flag: "AR" },
  { code: "pt", name: "Portuguese", flag: "PT" },
  { code: "zh", name: "Chinese", flag: "ZH" },
  { code: "ko", name: "Korean", flag: "KO" },
];

export function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function getLanguageFlag(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.flag ?? code.toUpperCase();
}
