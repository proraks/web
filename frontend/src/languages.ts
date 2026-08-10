// Shared language catalogue. Flags are shown in the UI (emoji regional
// indicators) while only the ISO-ish code is stored in the database.
// Default entry language is Estonian (et).

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "et", label: "Eesti", flag: "🇪🇪" },
  { code: "en", label: "Inglise (UK)", flag: "🇬🇧" },
  { code: "en-US", label: "Inglise (USA)", flag: "🇺🇸" },
  { code: "sv", label: "Rootsi", flag: "🇸🇪" },
  { code: "fi", label: "Soome", flag: "🇫🇮" },
  { code: "da", label: "Taani", flag: "🇩🇰" },
  { code: "no", label: "Norra", flag: "🇳🇴" },
  { code: "de", label: "Saksa", flag: "🇩🇪" },
  { code: "fr", label: "Prantsuse", flag: "🇫🇷" },
  { code: "it", label: "Itaalia", flag: "🇮🇹" },
  { code: "es", label: "Hispaania", flag: "🇪🇸" },
  { code: "ru", label: "Vene", flag: "🇷🇺" },
];

const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));

export function languageInfo(code: string | null | undefined): LanguageOption | undefined {
  if (!code) return undefined;
  return byCode.get(code);
}

export function flagFor(code: string | null | undefined): string {
  return languageInfo(code)?.flag ?? "";
}
