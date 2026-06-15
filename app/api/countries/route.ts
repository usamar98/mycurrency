import { fetchJsonWithTimeout, UpstreamRequestError } from "@/lib/serverHttp";
import type { RestCountry } from "@/types";
import { NextResponse } from "next/server";

const REST_COUNTRIES_API_URL =
  process.env.REST_COUNTRIES_API_BASE_URL ??
  "https://api.restcountries.com/countries/v5";
const REST_COUNTRIES_API_KEY = process.env.REST_COUNTRIES_API_KEY;
const PUBLIC_COUNTRIES_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const PUBLIC_COUNTRY_METADATA_URL =
  "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json";
const COUNTRIES_CACHE_MS = 24 * 60 * 60 * 1000;
const COUNTRY_FIELDS = [
  "names",
  "codes",
  "capitals",
  "flag",
  "currencies",
  "calling_codes",
  "languages",
  "population",
  "timezones",
  "region",
  "subregion",
  "classification"
].join(",");

type RestCountriesV5Response = {
  data?: {
    _demo?: {
      message?: string;
      signup_url?: string;
    };
    objects?: RestCountriesV5Country[];
    meta?: {
      more?: boolean;
      limit?: number;
      offset?: number;
    };
  };
  errors?: Array<{
    message?: string;
  }>;
};

type RestCountriesV5Country = {
  names?: {
    common?: string;
    official?: string;
  };
  codes?: {
    alpha_2?: string;
  };
  capitals?: Array<{
    name?: string;
  }>;
  flag?: {
    url_png?: string;
    url_svg?: string;
    description?: string;
  };
  currencies?:
    | Array<{
        code?: string;
        name?: string;
        symbol?: string;
      }>
    | Record<string, { name?: string; symbol?: string }>;
  calling_codes?: string[];
  languages?:
    | Array<{
        bcp47?: string;
        iso639_3?: string;
        name?: string;
      }>
    | Record<string, string>;
  population?: number;
  timezones?: string[];
  region?: string;
  subregion?: string;
  classification?: {
    sovereign?: boolean;
  };
};

type PublicCountry = {
  name?: {
    common?: string;
    official?: string;
  };
  cca2?: string;
  independent?: boolean;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  capital?: string[];
  region?: string;
  subregion?: string;
  languages?: Record<string, string>;
};

type PublicCountryMetadata = {
  iso2?: string;
  name?: string;
  capital?: string;
  currency?: string;
  currency_name?: string;
  currency_symbol?: string;
  phonecode?: string;
  population?: number;
  region?: string;
  subregion?: string;
  timezones?: Array<{
    zoneName?: string;
    gmtOffsetName?: string;
  }>;
};

let countriesCache: {
  timestamp: number;
  data: RestCountry[];
  source: string;
} | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCurrencyCode(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function mapCurrencies(
  value: RestCountriesV5Country["currencies"]
): RestCountry["currencies"] {
  const currencies: RestCountry["currencies"] = {};

  if (Array.isArray(value)) {
    for (const currency of value) {
      const code = normalizeCurrencyCode(currency.code);
      if (!code || !isNonEmptyString(currency.name)) {
        continue;
      }

      currencies[code] = {
        name: currency.name.trim(),
        symbol: isNonEmptyString(currency.symbol)
          ? currency.symbol.trim()
          : undefined
      };
    }
  } else if (isRecord(value)) {
    for (const [rawCode, rawCurrency] of Object.entries(value)) {
      const code = normalizeCurrencyCode(rawCode);
      if (!code || !isRecord(rawCurrency) || !isNonEmptyString(rawCurrency.name)) {
        continue;
      }

      currencies[code] = {
        name: rawCurrency.name.trim(),
        symbol: isNonEmptyString(rawCurrency.symbol)
          ? rawCurrency.symbol.trim()
          : undefined
      };
    }
  }

  return Object.keys(currencies).length > 0 ? currencies : undefined;
}

function mapLanguages(
  value: RestCountriesV5Country["languages"]
): RestCountry["languages"] {
  const languages: RestCountry["languages"] = {};

  if (Array.isArray(value)) {
    for (const language of value) {
      if (!isNonEmptyString(language.name)) {
        continue;
      }

      const key =
        language.iso639_3?.trim().toLowerCase() ??
        language.bcp47?.trim().toLowerCase() ??
        language.name.trim().toLowerCase();
      languages[key] = language.name.trim();
    }
  } else if (isRecord(value)) {
    for (const [code, rawName] of Object.entries(value)) {
      if (isNonEmptyString(rawName)) {
        languages[code] = rawName.trim();
      }
    }
  }

  return Object.keys(languages).length > 0 ? languages : undefined;
}

function mapCallingCodes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const callingCodes = Array.from(
    new Set(
      value
        .filter(isNonEmptyString)
        .map((code) => code.trim())
        .map((code) => (code.startsWith("+") ? code : `+${code}`))
    )
  );

  return callingCodes.length > 0 ? callingCodes : undefined;
}

function mapCountry(country: RestCountriesV5Country): RestCountry | null {
  const commonName = country.names?.common?.trim();
  const alpha2 = country.codes?.alpha_2?.trim().toUpperCase();

  if (!commonName || !alpha2) {
    return null;
  }

  return {
    name: {
      common: commonName,
      official: country.names?.official?.trim()
    },
    cca2: alpha2,
    capital: country.capitals
      ?.map((capital) => capital.name?.trim())
      .filter(isNonEmptyString),
    flags: {
      png: country.flag?.url_png,
      svg: country.flag?.url_svg,
      alt: country.flag?.description
    },
    currencies: mapCurrencies(country.currencies),
    callingCodes: mapCallingCodes(country.calling_codes),
    languages: mapLanguages(country.languages),
    population:
      typeof country.population === "number" ? country.population : undefined,
    independent: country.classification?.sovereign,
    timezones: country.timezones?.filter(isNonEmptyString),
    region: country.region?.trim(),
    subregion: country.subregion?.trim()
  };
}

function normalizeCountryCode(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function getFlagUrls(countryCode: string, countryName: string): RestCountry["flags"] {
  const lowerCode = countryCode.toLowerCase();

  return {
    png: `https://flagcdn.com/w320/${lowerCode}.png`,
    svg: `https://flagcdn.com/${lowerCode}.svg`,
    alt: `Flag of ${countryName}`
  };
}

function mapPublicMetadata(metadata: PublicCountryMetadata | undefined) {
  const timezones = metadata?.timezones
    ?.map((timezone) => timezone.zoneName ?? timezone.gmtOffsetName)
    .filter(isNonEmptyString);
  const callingCodes = metadata?.phonecode
    ?.split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => (code.startsWith("+") ? code : `+${code}`));

  return {
    callingCodes:
      callingCodes && callingCodes.length > 0
        ? Array.from(new Set(callingCodes))
        : undefined,
    population:
      typeof metadata?.population === "number" ? metadata.population : undefined,
    timezones:
      timezones && timezones.length > 0
        ? Array.from(new Set(timezones))
        : undefined
  };
}

function mapPublicCountry(
  country: PublicCountry,
  metadata: PublicCountryMetadata | undefined
): RestCountry | null {
  const commonName = country.name?.common?.trim() ?? metadata?.name?.trim();
  const alpha2 = normalizeCountryCode(country.cca2 ?? metadata?.iso2);

  if (!commonName || !alpha2) {
    return null;
  }

  const publicMetadata = mapPublicMetadata(metadata);
  const fallbackCurrencyCode = normalizeCurrencyCode(metadata?.currency);
  const fallbackCurrencies =
    fallbackCurrencyCode && isNonEmptyString(metadata?.currency_name)
      ? {
          [fallbackCurrencyCode]: {
            name: metadata.currency_name.trim(),
            symbol: isNonEmptyString(metadata.currency_symbol)
              ? metadata.currency_symbol.trim()
              : undefined
          }
        }
      : undefined;

  return {
    name: {
      common: commonName,
      official: country.name?.official?.trim() ?? commonName
    },
    cca2: alpha2,
    capital: country.capital?.length
      ? country.capital.filter(isNonEmptyString)
      : isNonEmptyString(metadata?.capital)
        ? [metadata.capital.trim()]
        : undefined,
    flags: getFlagUrls(alpha2, commonName),
    currencies: mapCurrencies(country.currencies) ?? fallbackCurrencies,
    callingCodes: publicMetadata.callingCodes,
    idd: country.idd,
    languages: mapLanguages(country.languages),
    population: publicMetadata.population,
    independent: country.independent,
    timezones: publicMetadata.timezones,
    region: country.region?.trim() ?? metadata?.region?.trim(),
    subregion: country.subregion?.trim() ?? metadata?.subregion?.trim()
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof UpstreamRequestError && error.body) {
    try {
      const payload = JSON.parse(error.body) as RestCountriesV5Response;
      const upstreamMessage = payload.errors
        ?.map((item) => item.message)
        .filter(isNonEmptyString)
        .join(" ");
      if (upstreamMessage) {
        return upstreamMessage;
      }
    } catch {
      return error.message;
    }
  }

  return error instanceof Error ? error.message : "Country data could not load.";
}

async function loadCountriesFromRestCountriesV5() {
  if (!REST_COUNTRIES_API_KEY) {
    return null;
  }

  const countries: RestCountry[] = [];
  let offset = 0;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(REST_COUNTRIES_API_URL);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("response_fields", COUNTRY_FIELDS);

    const payload = await fetchJsonWithTimeout<RestCountriesV5Response>(
      url,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${REST_COUNTRIES_API_KEY}`
        },
        cache: "no-store"
      },
      15_000
    );

    if (payload.data?._demo) {
      throw new Error(
        "The REST Countries demo key only returns one sample country. Add a real REST_COUNTRIES_API_KEY to load the full country dataset."
      );
    }

    if (payload.errors?.length) {
      throw new Error(
        payload.errors
          .map((item) => item.message)
          .filter(isNonEmptyString)
          .join(" ") || "REST Countries returned an error."
      );
    }

    const objects = payload.data?.objects;
    if (!Array.isArray(objects)) {
      throw new Error("REST Countries returned an unexpected response shape.");
    }

    countries.push(...objects.map(mapCountry).filter((item): item is RestCountry => item !== null));

    if (!payload.data?.meta?.more) {
      break;
    }

    const limit = payload.data.meta.limit ?? 100;
    offset = (payload.data.meta.offset ?? offset) + limit;
  }

  if (countries.length < 150) {
    throw new Error(
      `REST Countries returned only ${countries.length} countries, so the dataset looks incomplete.`
    );
  }

  return countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
}

async function loadCountriesFromPublicSources() {
  const [countries, metadata] = await Promise.all([
    fetchJsonWithTimeout<PublicCountry[]>(
      PUBLIC_COUNTRIES_URL,
      {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      },
      20_000
    ),
    fetchJsonWithTimeout<PublicCountryMetadata[]>(
      PUBLIC_COUNTRY_METADATA_URL,
      {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      },
      20_000
    )
  ]);

  if (!Array.isArray(countries) || !Array.isArray(metadata)) {
    throw new Error("Public country sources returned an unexpected response.");
  }

  const metadataByCode = new Map(
    metadata
      .map((item) => [normalizeCountryCode(item.iso2), item] as const)
      .filter(
        (entry): entry is readonly [string, PublicCountryMetadata] =>
          entry[0] !== null
      )
  );
  const normalizedCountries = countries
    .map((country) =>
      mapPublicCountry(
        country,
        metadataByCode.get(normalizeCountryCode(country.cca2) ?? "")
      )
    )
    .filter((country): country is RestCountry => country !== null)
    .sort((a, b) => a.name.common.localeCompare(b.name.common));

  if (normalizedCountries.length < 150) {
    throw new Error(
      `Public country sources returned only ${normalizedCountries.length} countries, so the dataset looks incomplete.`
    );
  }

  return normalizedCountries;
}

async function loadCountries() {
  try {
    const restCountries = await loadCountriesFromRestCountriesV5();
    if (restCountries) {
      return {
        source: "REST Countries v5",
        data: restCountries
      };
    }
  } catch {
    // Fall through to public sources so deployment keeps working if the v5 key
    // is missing, expired, or temporarily rejected.
  }

  return {
    source: "mledoze/countries + countries-states-cities",
    data: await loadCountriesFromPublicSources()
  };
}

export async function GET() {
  if (countriesCache && Date.now() - countriesCache.timestamp < COUNTRIES_CACHE_MS) {
    return NextResponse.json(countriesCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Data-Source": countriesCache.source
      }
    });
  }

  try {
    const countries = await loadCountries();
    countriesCache = {
      timestamp: Date.now(),
      data: countries.data,
      source: countries.source
    };

    return NextResponse.json(countries.data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Data-Source": countries.source
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error)
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
