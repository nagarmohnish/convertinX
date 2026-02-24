import type { Language } from "../types";

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "hi", name: "Hindi", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "es", name: "Spanish", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "fr", name: "French", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "de", name: "German", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "ja", name: "Japanese", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { code: "ar", name: "Arabic", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  { code: "pt", name: "Portuguese", flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  { code: "zh", name: "Chinese", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { code: "ko", name: "Korean", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
];

export function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function getLanguageFlag(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.flag ?? "";
}
