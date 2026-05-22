"use client";

import { CountryCard } from "@/components/CountryCard";
import { CountryTable } from "@/components/CountryTable";
import { SearchFilters } from "@/components/SearchFilters";
import { fetchCountries, fetchRates } from "@/lib/api";
import { getPrimaryCurrency, hasCurrencyRate } from "@/lib/currency";
import {
  formatLanguageList,
  getBusinessLanguages,
  getOfficialLanguages
} from "@/lib/languages";
import { getCurrentTimeInTimezone, getPrimaryTimezone } from "@/lib/time";
import type {
  BaseCountryOption,
  ExchangeRatesResponse,
  RestCountry,
  ViewMode
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE_COUNTRY_STORAGE_KEY = "wctc:base-country:v1";
const BASE_TIMEZONE_STORAGE_PREFIX = "wctc:base-timezone:v2";

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_1fr]">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-soft"
        >
          <div className="flex gap-4">
            <div className="skeleton h-12 w-16 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            <div className="skeleton h-20 rounded-lg" />
            <div className="skeleton h-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center shadow-soft">
      <p className="text-lg font-bold tracking-tight text-zinc-950">
        No countries match your filters.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Try a different country name, capital, currency code, language, or region.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-950">
      <p className="font-bold">Data could not be loaded.</p>
      <p className="mt-2 text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-900 active:translate-y-[1px]"
      >
        Try again
      </button>
    </div>
  );
}

function formatApiUpdatedTime(ratesData: ExchangeRatesResponse | null) {
  if (!ratesData?.time_last_update_unix) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(ratesData.time_last_update_unix * 1000));
}

function getBrowserRegionCode(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const locale = new Intl.Locale(window.navigator.language);
    return locale.region?.toUpperCase() ?? null;
  } catch {
    const region = window.navigator.language.split("-")[1];
    return region?.toUpperCase() ?? null;
  }
}

function getStoredValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is optional; the dashboard still works without persistence.
  }
}

function formatOffsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) {
    return "UTC";
  }

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const minutes = String(absMinutes % 60).padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}

function getBrowserOffsetLabel(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return formatOffsetLabel(-new Date().getTimezoneOffset());
}

function parseFixedOffsetMinutes(timezone: string): number | null {
  if (timezone === "UTC" || timezone === "GMT") {
    return 0;
  }

  const match = timezone.match(/^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return sign * (hours * 60 + minutes);
}

function getDefaultTimezone(country: RestCountry, preferBrowserOffset = false): string {
  const timezones = country.timezones ?? [];
  const browserOffset = getBrowserOffsetLabel();
  const closestToUtc = timezones
    .map((timezone) => ({
      timezone,
      offset: parseFixedOffsetMinutes(timezone)
    }))
    .filter(
      (item): item is { timezone: string; offset: number } => item.offset !== null
    )
    .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))[0]?.timezone;

  return (
    (preferBrowserOffset && browserOffset && timezones.includes(browserOffset)
      ? browserOffset
      : null) ??
    (timezones.includes("UTC") ? "UTC" : null) ??
    closestToUtc ??
    getPrimaryTimezone(country) ??
    timezones[0] ??
    ""
  );
}

function getDefaultBaseCountry(countries: RestCountry[]): RestCountry | null {
  const countriesWithCurrencies = countries.filter((country) =>
    Boolean(getPrimaryCurrency(country))
  );

  const savedCode = getStoredValue(BASE_COUNTRY_STORAGE_KEY);
  const browserRegionCode = getBrowserRegionCode();

  return (
    countriesWithCurrencies.find((country) => country.cca2 === savedCode) ??
    countriesWithCurrencies.find((country) => country.cca2 === browserRegionCode) ??
    countriesWithCurrencies.find((country) => country.cca2 === "US") ??
    countriesWithCurrencies[0] ??
    null
  );
}

export default function Home() {
  const [countries, setCountries] = useState<RestCountry[]>([]);
  const [ratesData, setRatesData] = useState<ExchangeRatesResponse | null>(null);
  const [selectedBaseCountryCode, setSelectedBaseCountryCode] = useState("");
  const [selectedBaseTimezone, setSelectedBaseTimezone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);

  const selectedBaseCountry = useMemo(
    () =>
      countries.find((country) => country.cca2 === selectedBaseCountryCode) ??
      null,
    [countries, selectedBaseCountryCode]
  );

  const selectedBaseCurrency = useMemo(
    () =>
      selectedBaseCountry ? getPrimaryCurrency(selectedBaseCountry) : null,
    [selectedBaseCountry]
  );

  const selectedBaseTimezones = selectedBaseCountry?.timezones ?? [];
  const baseCurrencyCode = selectedBaseCurrency?.code ?? ratesData?.base_code ?? "";
  const baseCountryName = selectedBaseCountry?.name.common ?? "selected base";

  const loadCountries = useCallback(async () => {
    setIsCountriesLoading(true);
    setErrorMessage(null);

    try {
      const countriesResult = await fetchCountries();
      setCountries(countriesResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected data loading error."
      );
    } finally {
      setIsCountriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    if (countries.length === 0 || selectedBaseCountryCode) {
      return;
    }

    const defaultCountry = getDefaultBaseCountry(countries);
    if (!defaultCountry) {
      return;
    }

    setSelectedBaseCountryCode(defaultCountry.cca2);
    setSelectedBaseTimezone(
      getDefaultTimezone(defaultCountry, defaultCountry.cca2 === getBrowserRegionCode())
    );
  }, [countries, selectedBaseCountryCode]);

  useEffect(() => {
    if (!selectedBaseCountry) {
      return;
    }

    const timezones = selectedBaseCountry.timezones ?? [];
    if (timezones.length === 0) {
      setSelectedBaseTimezone("");
      return;
    }

    if (timezones.includes(selectedBaseTimezone)) {
      return;
    }

    const savedTimezone = getStoredValue(
      `${BASE_TIMEZONE_STORAGE_PREFIX}:${selectedBaseCountry.cca2}`
    );
    const nextTimezone =
      savedTimezone && timezones.includes(savedTimezone)
        ? savedTimezone
        : getDefaultTimezone(
            selectedBaseCountry,
            selectedBaseCountry.cca2 === getBrowserRegionCode()
          );

    setSelectedBaseTimezone(nextTimezone);
  }, [selectedBaseCountry, selectedBaseTimezone]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedBaseCurrency?.code) {
      return;
    }

    let isCurrentRequest = true;
    setRatesData(null);
    setIsRatesLoading(true);
    setErrorMessage(null);

    fetchRates(selectedBaseCurrency.code)
      .then((latestRates) => {
        if (isCurrentRequest) {
          setRatesData(latestRates);
        }
      })
      .catch((error) => {
        if (isCurrentRequest) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load exchange rates."
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsRatesLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedBaseCurrency?.code]);

  const refreshRates = useCallback(async () => {
    if (!selectedBaseCurrency?.code) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const latestRates = await fetchRates(selectedBaseCurrency.code, true);
      setRatesData(latestRates);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not refresh rates."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedBaseCurrency?.code]);

  const handleBaseCountryChange = useCallback(
    (countryCode: string) => {
      const nextCountry =
        countries.find((country) => country.cca2 === countryCode) ?? null;

      setSelectedBaseCountryCode(countryCode);
      setStoredValue(BASE_COUNTRY_STORAGE_KEY, countryCode);

      const nextTimezone = nextCountry
        ? getDefaultTimezone(nextCountry, nextCountry.cca2 === getBrowserRegionCode())
        : "";
      setSelectedBaseTimezone(nextTimezone);

      if (nextTimezone) {
        setStoredValue(`${BASE_TIMEZONE_STORAGE_PREFIX}:${countryCode}`, nextTimezone);
      }
    },
    [countries]
  );

  const handleBaseTimezoneChange = useCallback(
    (timezone: string) => {
      setSelectedBaseTimezone(timezone);

      if (selectedBaseCountryCode && timezone) {
        setStoredValue(
          `${BASE_TIMEZONE_STORAGE_PREFIX}:${selectedBaseCountryCode}`,
          timezone
        );
      }
    },
    [selectedBaseCountryCode]
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(countries.map((country) => country.region).filter(Boolean))
      ).sort() as string[],
    [countries]
  );

  const baseCountryOptions = useMemo<BaseCountryOption[]>(
    () =>
      countries
        .map((country) => {
          const currency = getPrimaryCurrency(country);

          if (!currency) {
            return null;
          }

          return {
            code: country.cca2,
            label: `${country.name.common} (${currency.code})`,
            currencyCode: currency.code,
            timezones: country.timezones ?? []
          };
        })
        .filter((option): option is BaseCountryOption => option !== null),
    [countries]
  );

  const rates = ratesData?.rates ?? {};
  const filteredCountries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return countries.filter((country) => {
      const currency = getPrimaryCurrency(country);
      const searchableText = [
        country.name.common,
        country.name.official,
        country.capital?.join(" "),
        country.region,
        country.subregion,
        currency?.code,
        currency?.name,
        formatLanguageList(getOfficialLanguages(country)),
        formatLanguageList(getBusinessLanguages(country))
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);
      const matchesRegion =
        selectedRegion === "All" || country.region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [countries, searchTerm, selectedRegion]);

  const countriesWithRates = useMemo(
    () =>
      filteredCountries.filter((country) =>
        hasCurrencyRate(getPrimaryCurrency(country)?.code, rates)
      ).length,
    [filteredCountries, rates]
  );

  const baseTime = useMemo(() => {
    void clockTick;
    return getCurrentTimeInTimezone(selectedBaseTimezone);
  }, [clockTick, selectedBaseTimezone]);

  const isInitialLoading =
    isCountriesLoading || (Boolean(baseCurrencyCode) && isRatesLoading && !ratesData);

  return (
    <main className="min-h-[100dvh]">
      <header className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[1.35fr_0.65fr] lg:px-8 lg:pb-10 lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">
            Global comparison dashboard
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-zinc-950 md:text-6xl">
            World Currency & Time Comparator
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
            Choose any base country, then compare world currencies, local times,
            languages, and business context against it.
          </p>
        </div>

        <aside className="self-end rounded-lg border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Selected base
          </p>
          <div className="mt-3 flex items-start gap-3">
            {selectedBaseCountry?.flags?.svg || selectedBaseCountry?.flags?.png ? (
              <img
                src={selectedBaseCountry.flags.svg ?? selectedBaseCountry.flags.png}
                alt={
                  selectedBaseCountry.flags.alt ??
                  `Flag of ${selectedBaseCountry.name.common}`
                }
                className="mt-1 h-9 w-12 rounded border border-zinc-200 object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-tight text-zinc-950">
                {selectedBaseCountry?.name.common ?? "Loading base"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {baseCurrencyCode || "Currency"} ·{" "}
                {selectedBaseTimezone || "Timezone not listed"}
              </p>
            </div>
          </div>
          <p className="mt-4 font-mono text-2xl font-black text-zinc-950">
            {baseTime}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4">
            <div>
              <p className="text-xs text-zinc-500">Base currency</p>
              <p className="font-mono text-sm font-bold text-zinc-950">
                {baseCurrencyCode || "Not ready"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Rates updated</p>
              <p className="font-mono text-sm font-bold text-zinc-950">
                {formatApiUpdatedTime(ratesData)}
              </p>
            </div>
          </div>
        </aside>
      </header>

      <SearchFilters
        baseCountryOptions={baseCountryOptions}
        selectedBaseCountryCode={selectedBaseCountryCode}
        onBaseCountryChange={handleBaseCountryChange}
        selectedBaseTimezone={selectedBaseTimezone}
        onBaseTimezoneChange={handleBaseTimezoneChange}
        selectedBaseTimezones={selectedBaseTimezones}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefreshRates={refreshRates}
        isRefreshing={isRefreshing || isRatesLoading}
        resultCount={filteredCountries.length}
      />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-zinc-500">
              {countriesWithRates} of {filteredCountries.length} visible countries
              have rates against {baseCurrencyCode || "the selected currency"}.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Change the base country to make the entire dashboard useful for your
              location. Business languages are estimated from official languages
              plus English where useful.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">Countries loaded</p>
            <p className="font-mono text-lg font-black text-zinc-950">
              {countries.length}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">Regions</p>
            <p className="font-mono text-lg font-black text-zinc-950">
              {regions.length}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadCountries} />
        ) : isInitialLoading ? (
          <LoadingSkeleton />
        ) : filteredCountries.length === 0 ? (
          <EmptyState />
        ) : viewMode === "table" ? (
          <CountryTable
            countries={filteredCountries}
            rates={rates}
            baseCurrencyCode={baseCurrencyCode}
            baseTimezone={selectedBaseTimezone}
            baseCountryName={baseCountryName}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_1fr]">
            {filteredCountries.map((country) => (
              <CountryCard
                key={country.cca2}
                country={country}
                rates={rates}
                baseCurrencyCode={baseCurrencyCode}
                baseTimezone={selectedBaseTimezone}
                baseCountryName={baseCountryName}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 text-sm text-zinc-500 sm:px-6 lg:px-8">
        Rates by ExchangeRate-API
      </footer>
    </main>
  );
}
