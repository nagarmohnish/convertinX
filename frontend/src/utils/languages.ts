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
  { code: "it", name: "Italian", flag: "IT" },
  { code: "ru", name: "Russian", flag: "RU" },
  { code: "tr", name: "Turkish", flag: "TR" },
  { code: "nl", name: "Dutch", flag: "NL" },
  { code: "pl", name: "Polish", flag: "PL" },
  { code: "sv", name: "Swedish", flag: "SV" },
  { code: "vi", name: "Vietnamese", flag: "VI" },
  { code: "th", name: "Thai", flag: "TH" },
  { code: "id", name: "Indonesian", flag: "ID" },
  { code: "uk", name: "Ukrainian", flag: "UK" },
  { code: "el", name: "Greek", flag: "EL" },
  { code: "cs", name: "Czech", flag: "CS" },
];

export function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function getLanguageFlag(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.flag ?? code.toUpperCase();
}
