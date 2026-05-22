import type { CurrencyInfo, RestCountry } from "@/types";

const amountFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 6
});

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 2
});

export function getAllCurrencies(country: RestCountry): CurrencyInfo[] {
  return Object.entries(country.currencies ?? {}).map(([code, value]) => ({
    code,
    name: value.name,
    symbol: value.symbol
  }));
}

export function getPrimaryCurrency(country: RestCountry): CurrencyInfo | null {
  return getAllCurrencies(country)[0] ?? null;
}

export function formatCurrencyRate(
  currencyCode: string | undefined,
  rates: Record<string, number>
): string {
  if (!currencyCode || !rates[currencyCode]) {
    return "Not available";
  }

  const pkrValue = 1 / rates[currencyCode];
  return `${pkrFormatter.format(pkrValue)} PKR`;
}

export function formatPkrToLocalCurrency(
  currencyCode: string | undefined,
  rates: Record<string, number>
): string {
  if (!currencyCode || !rates[currencyCode]) {
    return "Not available";
  }

  return `${amountFormatter.format(rates[currencyCode])} ${currencyCode}`;
}

export function hasCurrencyRate(
  currencyCode: string | undefined,
  rates: Record<string, number>
): boolean {
  return Boolean(currencyCode && rates[currencyCode]);
}
