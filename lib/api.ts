import type { ExchangeRatesResponse, RestCountry } from "@/types";

const COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,capital,flags,currencies,languages,timezones,region,subregion";
const RATES_URL = "https://open.er-api.com/v6/latest/PKR";

const COUNTRIES_CACHE_KEY = "pctc:countries:v2";
const RATES_CACHE_KEY = "pctc:rates:v1";
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
  forceRefresh = false
): Promise<ExchangeRatesResponse> {
  if (!forceRefresh) {
    const cachedRates = readCache<ExchangeRatesResponse>(RATES_CACHE_KEY, RATES_TTL);
    if (cachedRates) {
      return cachedRates;
    }
  }

  const response = await fetch(RATES_URL);
  if (!response.ok) {
    throw new Error("Could not load PKR exchange rates.");
  }

  const rates = (await response.json()) as ExchangeRatesResponse;
  if (rates.result !== "success" || !rates.rates) {
    throw new Error("Currency API returned an unexpected response.");
  }

  writeCache(RATES_CACHE_KEY, rates);
  return rates;
}
