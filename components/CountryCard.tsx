"use client";

import {
  formatCurrencyRate,
  getAllCurrencies,
  getPrimaryCurrency
} from "@/lib/currency";
import {
  formatLanguageList,
  getBusinessLanguages,
  getOfficialLanguages
} from "@/lib/languages";
import {
  getCurrentTimeInTimezone,
  getPrimaryTimezone,
  getTimeDifferenceFromBase
} from "@/lib/time";
import type { RestCountry } from "@/types";
import { useMemo, useState } from "react";

type CountryCardProps = {
  country: RestCountry;
  rates: Record<string, number>;
  baseCurrencyCode: string;
  baseTimezone: string;
  baseCountryName: string;
};

export function CountryCard({
  country,
  rates,
  baseCurrencyCode,
  baseTimezone,
  baseCountryName
}: CountryCardProps) {
  const primaryCurrency = getPrimaryCurrency(country);
  const allCurrencies = getAllCurrencies(country);
  const initialTimezone = getPrimaryTimezone(country) ?? "";
  const [selectedTimezone, setSelectedTimezone] = useState(initialTimezone);

  const additionalCurrencies = useMemo(
    () => allCurrencies.filter((currency) => currency.code !== primaryCurrency?.code),
    [allCurrencies, primaryCurrency?.code]
  );

  const localTime = getCurrentTimeInTimezone(selectedTimezone);
  const timeDifference = getTimeDifferenceFromBase(
    selectedTimezone,
    baseTimezone,
    baseCountryName
  );
  const currencyLabel = primaryCurrency
    ? `${primaryCurrency.code} ${primaryCurrency.name}`
    : "Currency not listed";
  const officialLanguages = getOfficialLanguages(country);
  const businessLanguages = getBusinessLanguages(country);

  return (
    <article className="group flex min-h-full flex-col justify-between rounded-lg border border-zinc-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <img
            src={country.flags?.svg ?? country.flags?.png ?? ""}
            alt={country.flags?.alt ?? `Flag of ${country.name.common}`}
            className="h-12 w-16 rounded-md border border-zinc-200 object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-zinc-950">
              {country.name.common}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {country.capital?.join(", ") ?? "Capital not listed"}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Currency
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {currencyLabel}
            </p>
            {additionalCurrencies.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                Also uses{" "}
                {additionalCurrencies
                  .map((currency) => `${currency.code} ${currency.name}`)
                  .join(", ")}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Exchange rate
            </p>
            <p className="mt-2 font-mono text-xl font-bold text-zinc-950">
              {formatCurrencyRate(primaryCurrency?.code, rates, baseCurrencyCode)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              1 local currency in {baseCurrencyCode}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Languages
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {formatLanguageList(officialLanguages)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Business: {formatLanguageList(businessLanguages)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Local time
          </p>
          <p className="mt-1 font-mono text-base font-bold text-zinc-950">
            {localTime}
          </p>
          <p className="mt-1 text-sm text-emerald-800">{timeDifference}</p>
        </div>

        {(country.timezones?.length ?? 0) > 1 ? (
          <label className="grid gap-2">
            <span className="text-xs font-medium text-zinc-500">Timezone</span>
            <select
              value={selectedTimezone}
              onChange={(event) => setSelectedTimezone(event.target.value)}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            >
              {country.timezones?.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-zinc-500">
            Timezone: {selectedTimezone || "Not available"}
          </p>
        )}
      </div>
    </article>
  );
}
