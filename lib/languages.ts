import type { RestCountry } from "@/types";

function uniqueLanguages(languages: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const language of languages) {
    const normalized = language.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function getOfficialLanguages(country: RestCountry): string[] {
  return uniqueLanguages(Object.values(country.languages ?? {}));
}

export function getBusinessLanguages(country: RestCountry): string[] {
  const officialLanguages = getOfficialLanguages(country);
  if (officialLanguages.length === 0) {
    return [];
  }

  const hasEnglish = officialLanguages.some(
    (language) => language.toLowerCase() === "english"
  );

  if (hasEnglish) {
    return officialLanguages;
  }

  return uniqueLanguages([
    officialLanguages[0],
    "English",
    ...officialLanguages.slice(1)
  ]);
}

export function formatLanguageList(languages: string[]): string {
  return languages.length > 0 ? languages.join(", ") : "Not listed";
}
