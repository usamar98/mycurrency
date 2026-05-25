import type { ExchangeRatesResponse, RestCountry } from "@/types";

const COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,capital,flags,currencies,languages,population,idd,timezones,region";
const RATES_BASE_URL = "https://open.er-api.com/v6/latest";

const COUNTRIES_CACHE_KEY = "wctc:countries:v4";
const RATES_CACHE_PREFIX = "wctc:rates:v1";
const COUNTRIES_TTL = 24 * 60 * 60 * 1000;
const RATES_TTL = 30 * 60 * 1000;

type CacheRecord<T> = {
  timestamp: number;
  data: T;
};

function readCache<T>(key: string, ttl: number): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }

    const cached = JSON.parse(rawValue) as CacheRecord<T>;
    if (Date.now() - cached.timestamp > ttl) {
      window.localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: CacheRecord<T> = {
      timestamp: Date.now(),
      data
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage may be disabled or full. The app can continue without persistence.
  }
}

export async function fetchCountries(): Promise<RestCountry[]> {
  const cachedCountries = readCache<RestCountry[]>(
    COUNTRIES_CACHE_KEY,
    COUNTRIES_TTL
  );
  if (cachedCountries) {
    return cachedCountries;
  }

  const response = await fetch(COUNTRIES_URL);
  if (!response.ok) {
    throw new Error("Could not load country data.");
  }

  const countries = (await response.json()) as RestCountry[];
  const sortedCountries = countries.sort((a, b) =>
    a.name.common.localeCompare(b.name.common)
  );
  writeCache(COUNTRIES_CACHE_KEY, sortedCountries);

  return sortedCountries;
}

export async function fetchRates(
  baseCurrencyCode: string,
  forceRefresh = false
): Promise<ExchangeRatesResponse> {
  const normalizedBase = baseCurrencyCode.trim().toUpperCase();
  if (!normalizedBase) {
    throw new Error("Choose a base currency before loading exchange rates.");
  }

  const cacheKey = `${RATES_CACHE_PREFIX}:${normalizedBase}`;

  if (!forceRefresh) {
    const cachedRates = readCache<ExchangeRatesResponse>(cacheKey, RATES_TTL);
    if (cachedRates) {
      return cachedRates;
    }
  }

  const response = await fetch(`${RATES_BASE_URL}/${normalizedBase}`);
  if (!response.ok) {
    throw new Error(`Could not load ${normalizedBase} exchange rates.`);
  }

  const rates = (await response.json()) as ExchangeRatesResponse;
  if (rates.result !== "success" || !rates.rates) {
    throw new Error("Currency API returned an unexpected response.");
  }

  writeCache(cacheKey, rates);
  return rates;
}
