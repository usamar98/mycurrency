"use client";

import type { BaseCountryOption, ViewMode } from "@/types";

type SearchFiltersProps = {
  baseCountryOptions: BaseCountryOption[];
  selectedBaseCountryCode: string;
  onBaseCountryChange: (value: string) => void;
  selectedBaseTimezone: string;
  onBaseTimezoneChange: (value: string) => void;
  selectedBaseTimezones: string[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  regions: string[];
  selectedRegion: string;
  onRegionChange: (value: string) => void;
  countryCodeOptions: string[];
  selectedCountryCode: string;
  onCountryCodeChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  onRefreshRates: () => void;
  isRefreshing: boolean;
  resultCount: number;
};

export function SearchFilters({
  baseCountryOptions,
  selectedBaseCountryCode,
  onBaseCountryChange,
  selectedBaseTimezone,
  onBaseTimezoneChange,
  selectedBaseTimezones,
  searchTerm,
  onSearchTermChange,
  regions,
  selectedRegion,
  onRegionChange,
  countryCodeOptions,
  selectedCountryCode,
  onCountryCodeChange,
  viewMode,
  onViewModeChange,
  onRefreshRates,
  isRefreshing,
  resultCount
}: SearchFiltersProps) {
  return (
    <section className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f8faf9]/88 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(220px,0.55fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Compare from
            </span>
            <select
              value={selectedBaseCountryCode}
              onChange={(event) => onBaseCountryChange(event.target.value)}
              disabled={baseCountryOptions.length === 0}
              className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 disabled:cursor-wait disabled:bg-zinc-100"
            >
              {baseCountryOptions.length === 0 ? (
                <option value="">Loading countries</option>
              ) : null}
              {baseCountryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Base timezone
            </span>
            <select
              value={selectedBaseTimezone}
              onChange={(event) => onBaseTimezoneChange(event.target.value)}
              disabled={selectedBaseTimezones.length === 0}
              className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 disabled:cursor-wait disabled:bg-zinc-100"
            >
              {selectedBaseTimezones.length === 0 ? (
                <option value="">No timezone listed</option>
              ) : null}
              {selectedBaseTimezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onRefreshRates}
            disabled={isRefreshing || !selectedBaseCountryCode}
            className="h-12 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-soft transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-700/60 active:translate-y-[1px]"
          >
            {isRefreshing ? "Refreshing" : "Refresh rates"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_220px_190px_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Search
            </span>
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Country, ISO code, dialing code, currency, population"
              className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Region
            </span>
            <select
              value={selectedRegion}
              onChange={(event) => onRegionChange(event.target.value)}
              className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              <option value="All">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Country code
            </span>
            <select
              value={selectedCountryCode}
              onChange={(event) => onCountryCodeChange(event.target.value)}
              className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              <option value="All">All codes</option>
              {countryCodeOptions.map((countryCode) => (
                <option key={countryCode} value={countryCode}>
                  {countryCode}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              View
            </span>
            <div className="grid h-12 grid-cols-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => onViewModeChange("table")}
                className={`rounded-md px-4 text-sm font-semibold transition active:translate-y-[1px] ${
                  viewMode === "table"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("cards")}
                className={`rounded-md px-4 text-sm font-semibold transition active:translate-y-[1px] ${
                  viewMode === "cards"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto hidden max-w-7xl px-8 pb-3 text-sm font-medium text-zinc-500 lg:block">
        {resultCount} countries shown
      </div>
    </section>
  );
}
