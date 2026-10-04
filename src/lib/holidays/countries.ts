/**
 * Countries offered in the picker. The token is the one Google Calendar uses in
 * its holiday feed identifiers; it is not an ISO 3166 code, so the English label
 * is spelled out here rather than derived.
 *
 * `nativeLocale`, when present, is a locale prefix that was empirically verified
 * to return holiday names in the country's own language. It is only set where a
 * comparison against the English feed actually showed different names, never
 * inferred from the country.
 *
 * Countries whose feeds only ever return English (Australia, Hong Kong, New
 * Zealand, Philippines, South Africa, United Kingdom) deliberately have no
 * `nativeLocale`.
 */
export interface CountryOption {
  token: string;
  label: string;
  nativeLocale?: string;
}

export const COUNTRIES: readonly CountryOption[] = [
  { token: "australian", label: "Australia" },
  { token: "austrian", label: "Austria", nativeLocale: "de" },
  { token: "brazilian", label: "Brazil", nativeLocale: "pt" },
  { token: "canadian", label: "Canada", nativeLocale: "fr" },
  { token: "china", label: "China", nativeLocale: "zh" },
  { token: "danish", label: "Denmark", nativeLocale: "da" },
  { token: "dutch", label: "Netherlands", nativeLocale: "nl" },
  { token: "finnish", label: "Finland", nativeLocale: "fi" },
  { token: "french", label: "France", nativeLocale: "fr" },
  { token: "german", label: "Germany", nativeLocale: "de" },
  { token: "greek", label: "Greece", nativeLocale: "el" },
  { token: "hong_kong", label: "Hong Kong" },
  { token: "indian", label: "India", nativeLocale: "hi" },
  { token: "indonesian", label: "Indonesia", nativeLocale: "id" },
  { token: "irish", label: "Ireland", nativeLocale: "ga" },
  { token: "italian", label: "Italy", nativeLocale: "it" },
  { token: "japanese", label: "Japan", nativeLocale: "ja" },
  { token: "malaysia", label: "Malaysia", nativeLocale: "ms" },
  { token: "mexican", label: "Mexico", nativeLocale: "es" },
  { token: "new_zealand", label: "New Zealand" },
  { token: "norwegian", label: "Norway", nativeLocale: "no" },
  { token: "philippines", label: "Philippines" },
  { token: "polish", label: "Poland", nativeLocale: "pl" },
  { token: "portuguese", label: "Portugal", nativeLocale: "pt" },
  { token: "russian", label: "Russia", nativeLocale: "ru" },
  { token: "sa", label: "South Africa" },
  { token: "singapore", label: "Singapore", nativeLocale: "zh" },
  { token: "south_korea", label: "South Korea", nativeLocale: "ko" },
  { token: "spain", label: "Spain", nativeLocale: "es" },
  { token: "swedish", label: "Sweden", nativeLocale: "sv" },
  { token: "taiwan", label: "Taiwan", nativeLocale: "zh-TW" },
  { token: "uk", label: "United Kingdom" },
  { token: "usa", label: "United States", nativeLocale: "es" },
  { token: "vietnamese", label: "Vietnam", nativeLocale: "vi" },
];

const BY_TOKEN = new Map(COUNTRIES.map((country) => [country.token, country]));

export function isSupportedCountry(token: string): boolean {
  return BY_TOKEN.has(token);
}

export function countryLabel(token: string): string {
  return BY_TOKEN.get(token)?.label ?? token;
}
