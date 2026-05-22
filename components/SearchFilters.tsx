"use client";

import type { ViewMode } from "@/types";

type SearchFiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  regions: string[];
  selectedRegion: string;
  onRegionChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  onRefreshRates: () => void;
  isRefreshing: boolean;
  resultCount: number;
};

export function SearchFilters({
  searchTerm,
  onSearchTermChange,
  regions,
  selectedRegion,
  onRegionChange,
  viewMode,
  onViewModeChange,
  onRefreshRates,
  isRefreshing,
  resultCount
}: SearchFiltersProps) {
  return (
    <section className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f8faf9]/88 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(280px,1fr)_220px_auto_auto] lg:items-end lg:px-8">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Search
          </span>
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Country, capital, currency, language, region"
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

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end lg:block">
          <p className="self-center text-sm font-medium text-zinc-500 lg:hidden">
            {resultCount} countries shown
          </p>
          <button
            type="button"
            onClick={onRefreshRates}
            disabled={isRefreshing}
            className="h-12 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-soft transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-700/60 active:translate-y-[1px]"
          >
            {isRefreshing ? "Refreshing" : "Refresh rates"}
          </button>
        </div>
      </div>
      <div className="mx-auto hidden max-w-7xl px-8 pb-3 text-sm font-medium text-zinc-500 lg:block">
        {resultCount} countries shown
      </div>
    </section>
  );
}
