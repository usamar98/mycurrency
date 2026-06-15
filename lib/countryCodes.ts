import type { RestCountry } from "@/types";

export function getCallingCodes(country: RestCountry): string[] {
  if (country.callingCodes?.length) {
    return Array.from(
      new Set(
        country.callingCodes
          .map((code) => code.trim())
          .filter(Boolean)
          .map((code) => (code.startsWith("+") ? code : `+${code}`))
      )
    );
  }

  const root = country.idd?.root;
  const suffixes = country.idd?.suffixes ?? [];

  if (!root) {
    return [];
  }

  if (suffixes.length === 0) {
    return [root];
  }

  return Array.from(
    new Set(suffixes.map((suffix) => `${root}${suffix}`).filter(Boolean))
  );
}

export function getPrimaryCallingCode(country: RestCountry): string | null {
  return getCallingCodes(country)[0] ?? null;
}

export function formatCallingCodes(country: RestCountry): string {
  const callingCodes = getCallingCodes(country);
  return callingCodes.length > 0 ? callingCodes.join(", ") : "Not listed";
}

export function sortCallingCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const numericA = Number(a.replace(/[^\d]/g, ""));
    const numericB = Number(b.replace(/[^\d]/g, ""));

    if (Number.isNaN(numericA) || Number.isNaN(numericB)) {
      return a.localeCompare(b);
    }

    return numericA - numericB || a.localeCompare(b);
  });
}
