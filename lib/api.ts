import type { ExchangeRatesResponse, RestCountry } from "@/types";

const COUNTRIES_URL = "/api/countries";
const RATES_URL = "/api/rates";

const COUNTRIES_CACHE_KEY = "wctc:countries:v5";
const RATES_CACHE_PREFIX = "wctc:rates:v2";
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

function getApiErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const errorPayload = payload as {
    error?: unknown;
    message?: unknown;
  };

  if (typeof errorPayload.error === "string") {
    return errorPayload.error;
  }

  if (typeof errorPayload.message === "string") {
    return errorPayload.message;
  }

  return null;
}

async function readApiJson<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new Error("API returned invalid JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? fallbackMessage);
  }

  return payload as T;
}

export async function fetchCountries(): Promise<RestCountry[]> {
  const cachedCountries = readCache<RestCountry[]>(
    COUNTRIES_CACHE_KEY,
    COUNTRIES_TTL
  );
  if (cachedCountries) {
    return cachedCountries;
  }

  const response = await fetch(COUNTRIES_URL, {
    headers: {
      Accept: "application/json"
    }
  });
  const countries = await readApiJson<RestCountry[]>(
    response,
    "Could not load country data."
  );

  if (!Array.isArray(countries)) {
    throw new Error("Country API returned an unexpected response.");
  }

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

  const params = new URLSearchParams({
    base: normalizedBase
  });

  if (forceRefresh) {
    params.set("refresh", "1");
  }

  const response = await fetch(`${RATES_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    }
  });
  const rates = await readApiJson<ExchangeRatesResponse>(
    response,
    `Could not load ${normalizedBase} exchange rates.`
  );

  if (rates.result !== "success" || !rates.rates) {
    throw new Error("Currency API returned an unexpected response.");
  }

  writeCache(cacheKey, rates);
  return rates;
}
