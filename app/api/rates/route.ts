import { fetchJsonWithTimeout } from "@/lib/serverHttp";
import type { ExchangeRatesResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";
const RATES_CACHE_MS = 30 * 60 * 1000;

type FrankfurterRateRow = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

type ExchangeRateApiResponse = ExchangeRatesResponse & {
  "error-type"?: string;
};

let ratesCache = new Map<
  string,
  {
    timestamp: number;
    data: ExchangeRatesResponse;
  }
>();

function isPositiveRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeRates(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([code, rate]) => [code.trim().toUpperCase(), rate] as const)
      .filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && isPositiveRate(rate))
  );
}

function getUtcTimestampFromDate(date: string | null) {
  if (!date) {
    return undefined;
  }

  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
}

function getUtcLabelFromTimestamp(timestamp: number | undefined) {
  return timestamp ? new Date(timestamp * 1000).toUTCString() : undefined;
}

async function fetchFrankfurterRates(
  baseCurrencyCode: string
): Promise<ExchangeRatesResponse> {
  const url = new URL(FRANKFURTER_RATES_URL);
  url.searchParams.set("base", baseCurrencyCode);

  const rows = await fetchJsonWithTimeout<FrankfurterRateRow[]>(
    url,
    {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    },
    12_000
  );

  if (!Array.isArray(rows)) {
    throw new Error("Frankfurter returned an unexpected response shape.");
  }

  const rates: Record<string, number> = {
    [baseCurrencyCode]: 1
  };
  let latestDate: string | null = null;

  for (const row of rows) {
    const quote = row.quote?.trim().toUpperCase();
    if (!quote || !/^[A-Z]{3}$/.test(quote) || !isPositiveRate(row.rate)) {
      continue;
    }

    rates[quote] = row.rate;

    if (row.date && (!latestDate || row.date > latestDate)) {
      latestDate = row.date;
    }
  }

  if (Object.keys(rates).length <= 1) {
    throw new Error(`Frankfurter has no rates for ${baseCurrencyCode}.`);
  }

  const lastUpdate = getUtcTimestampFromDate(latestDate);

  return {
    result: "success",
    provider: "Frankfurter central-bank rates",
    documentation: "https://frankfurter.dev/",
    terms_of_use: "https://frankfurter.dev/",
    time_last_update_unix: lastUpdate,
    time_last_update_utc: getUtcLabelFromTimestamp(lastUpdate),
    base_code: baseCurrencyCode,
    rates
  };
}

async function fetchExchangeRateApiRates(
  baseCurrencyCode: string
): Promise<ExchangeRatesResponse> {
  const payload = await fetchJsonWithTimeout<ExchangeRateApiResponse>(
    `${EXCHANGE_RATE_API_URL}/${baseCurrencyCode}`,
    {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    },
    12_000
  );

  if (payload.result !== "success") {
    throw new Error(
      payload["error-type"] ??
        `ExchangeRate-API has no rates for ${baseCurrencyCode}.`
    );
  }

  const rates = normalizeRates(payload.rates);
  if (Object.keys(rates).length <= 1) {
    throw new Error("ExchangeRate-API returned no usable rates.");
  }

  return {
    ...payload,
    provider: "ExchangeRate-API open access rates",
    base_code: baseCurrencyCode,
    rates: {
      ...rates,
      [baseCurrencyCode]: 1
    }
  };
}

function mergeRateSources(
  baseCurrencyCode: string,
  frankfurter?: ExchangeRatesResponse,
  exchangeRateApi?: ExchangeRatesResponse
): ExchangeRatesResponse {
  const sources = [frankfurter, exchangeRateApi].filter(
    (source): source is ExchangeRatesResponse => Boolean(source)
  );

  if (sources.length === 0) {
    throw new Error("No exchange-rate provider returned usable data.");
  }

  const rates = {
    ...(exchangeRateApi?.rates ?? {}),
    ...(frankfurter?.rates ?? {}),
    [baseCurrencyCode]: 1
  };
  const lastUpdate = Math.max(
    ...sources
      .map((source) => source.time_last_update_unix)
      .filter((timestamp): timestamp is number => typeof timestamp === "number")
  );
  const provider = sources
    .map((source) => source.provider)
    .filter((item): item is string => Boolean(item))
    .join(" + ");

  return {
    result: "success",
    provider,
    documentation: sources
      .map((source) => source.documentation)
      .filter((item): item is string => Boolean(item))
      .join(" | "),
    terms_of_use: sources
      .map((source) => source.terms_of_use)
      .filter((item): item is string => Boolean(item))
      .join(" | "),
    time_last_update_unix: Number.isFinite(lastUpdate) ? lastUpdate : undefined,
    time_last_update_utc: Number.isFinite(lastUpdate)
      ? getUtcLabelFromTimestamp(lastUpdate)
      : undefined,
    time_next_update_unix: exchangeRateApi?.time_next_update_unix,
    time_next_update_utc: exchangeRateApi?.time_next_update_utc,
    base_code: baseCurrencyCode,
    rates
  };
}

function getFailureReason(result: PromiseSettledResult<unknown>) {
  if (result.status === "fulfilled") {
    return null;
  }

  return result.reason instanceof Error
    ? result.reason.message
    : "Provider request failed.";
}

async function loadRates(baseCurrencyCode: string) {
  const [frankfurterResult, exchangeRateApiResult] = await Promise.allSettled([
    fetchFrankfurterRates(baseCurrencyCode),
    fetchExchangeRateApiRates(baseCurrencyCode)
  ]);

  if (
    frankfurterResult.status === "rejected" &&
    exchangeRateApiResult.status === "rejected"
  ) {
    throw new Error(
      [
        getFailureReason(frankfurterResult),
        getFailureReason(exchangeRateApiResult)
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  return mergeRateSources(
    baseCurrencyCode,
    frankfurterResult.status === "fulfilled"
      ? frankfurterResult.value
      : undefined,
    exchangeRateApiResult.status === "fulfilled"
      ? exchangeRateApiResult.value
      : undefined
  );
}

export async function GET(request: NextRequest) {
  const baseCurrencyCode =
    request.nextUrl.searchParams.get("base")?.trim().toUpperCase() ?? "";
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!/^[A-Z]{3}$/.test(baseCurrencyCode)) {
    return NextResponse.json(
      {
        error: "Use a valid three-letter ISO 4217 base currency code."
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const cachedRates = ratesCache.get(baseCurrencyCode);
  if (
    !forceRefresh &&
    cachedRates &&
    Date.now() - cachedRates.timestamp < RATES_CACHE_MS
  ) {
    return NextResponse.json(cachedRates.data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
        "X-Data-Source": cachedRates.data.provider ?? "Exchange rates"
      }
    });
  }

  try {
    const rates = await loadRates(baseCurrencyCode);
    ratesCache = new Map(ratesCache).set(baseCurrencyCode, {
      timestamp: Date.now(),
      data: rates
    });

    return NextResponse.json(rates, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
        "X-Data-Source": rates.provider ?? "Exchange rates"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load exchange rates."
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
