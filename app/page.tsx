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
import {
  PAKISTAN_TIMEZONE,
  getCurrentTimeInTimezone
} from "@/lib/time";
import type { ExchangeRatesResponse, RestCountry, ViewMode } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(ratesData.time_last_update_unix * 1000));
}

export default function Home() {
  const [countries, setCountries] = useState<RestCountry[]>([]);
  const [ratesData, setRatesData] = useState<ExchangeRatesResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [countriesResult, ratesResult] = await Promise.all([
        fetchCountries(),
        fetchRates()
      ]);
      setCountries(countriesResult);
      setRatesData(ratesResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected data loading error."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const refreshRates = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const latestRates = await fetchRates(true);
      setRatesData(latestRates);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not refresh rates."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const regions = useMemo(
    () =>
      Array.from(
        new Set(countries.map((country) => country.region).filter(Boolean))
      ).sort() as string[],
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

  const pakistanTime = useMemo(() => {
    void clockTick;
    return getCurrentTimeInTimezone(PAKISTAN_TIMEZONE);
  }, [clockTick]);

  return (
    <main className="min-h-[100dvh]">
      <header className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[1.35fr_0.65fr] lg:px-8 lg:pb-10 lg:pt-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">
            PKR base dashboard
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-zinc-950 md:text-6xl">
            Pakistan Currency & Time Comparator
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
            Compare world currencies and time zones with Pakistan.
          </p>
        </div>

        <aside className="self-end rounded-lg border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Pakistan time
          </p>
          <p className="mt-3 font-mono text-2xl font-black text-zinc-950">
            {pakistanTime}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4">
            <div>
              <p className="text-xs text-zinc-500">Base</p>
              <p className="font-mono text-sm font-bold text-zinc-950">PKR</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Updated</p>
              <p className="font-mono text-sm font-bold text-zinc-950">
                {formatApiUpdatedTime(ratesData)}
              </p>
            </div>
          </div>
        </aside>
      </header>

      <SearchFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefreshRates={refreshRates}
        isRefreshing={isRefreshing}
        resultCount={filteredCountries.length}
      />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-zinc-500">
              {countriesWithRates} of {filteredCountries.length} visible countries
              have currency rates.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Rates by ExchangeRate-API. Business languages are estimated from
              official languages plus English where useful.
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
          <ErrorState message={errorMessage} onRetry={loadData} />
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : filteredCountries.length === 0 ? (
          <EmptyState />
        ) : viewMode === "table" ? (
          <CountryTable countries={filteredCountries} rates={rates} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_1fr]">
            {filteredCountries.map((country) => (
              <CountryCard key={country.cca2} country={country} rates={rates} />
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
