"use client";

import {
  formatBaseToLocalCurrency,
  formatCurrencyRate,
  getAllCurrencies,
  getPrimaryCurrency
} from "@/lib/currency";
import { formatPopulation, getIndependenceDay } from "@/lib/countryFacts";
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
import { useState } from "react";

type CountryTableProps = {
  countries: RestCountry[];
  rates: Record<string, number>;
  baseCurrencyCode: string;
  baseTimezone: string;
  baseCountryName: string;
};

function CountryRow({
  country,
  rates,
  baseCurrencyCode,
  baseTimezone,
  baseCountryName
}: {
  country: RestCountry;
  rates: Record<string, number>;
  baseCurrencyCode: string;
  baseTimezone: string;
  baseCountryName: string;
}) {
  const primaryCurrency = getPrimaryCurrency(country);
  const allCurrencies = getAllCurrencies(country);
  const officialLanguages = getOfficialLanguages(country);
  const businessLanguages = getBusinessLanguages(country);
  const independenceDay = getIndependenceDay(country);
  const [selectedTimezone, setSelectedTimezone] = useState(
    getPrimaryTimezone(country) ?? ""
  );

  return (
    <tr className="border-b border-zinc-100 align-top transition hover:bg-emerald-50/40">
      <td className="px-4 py-4">
        <img
          src={country.flags?.svg ?? country.flags?.png ?? ""}
          alt={country.flags?.alt ?? `Flag of ${country.name.common}`}
          className="h-9 w-12 rounded border border-zinc-200 object-cover"
        />
      </td>
      <td className="min-w-48 px-4 py-4">
        <p className="font-semibold text-zinc-950">{country.name.common}</p>
        <p className="text-xs text-zinc-500">{country.cca2}</p>
      </td>
      <td className="min-w-44 px-4 py-4 text-sm text-zinc-600">
        {country.capital?.join(", ") ?? "Not listed"}
      </td>
      <td className="min-w-40 px-4 py-4 text-sm text-zinc-600">
        <p>{country.region ?? "Not listed"}</p>
        {country.subregion ? (
          <p className="mt-1 text-xs text-zinc-400">{country.subregion}</p>
        ) : null}
      </td>
      <td className="min-w-40 px-4 py-4 font-mono text-sm font-semibold text-zinc-950">
        {formatPopulation(country.population)}
      </td>
      <td className="min-w-52 px-4 py-4 text-sm text-zinc-700">
        {independenceDay}
      </td>
      <td className="min-w-56 px-4 py-4 text-sm text-zinc-700">
        {formatLanguageList(officialLanguages)}
      </td>
      <td className="min-w-56 px-4 py-4 text-sm text-zinc-700">
        {formatLanguageList(businessLanguages)}
      </td>
      <td className="min-w-56 px-4 py-4">
        <p className="text-sm font-semibold text-zinc-900">
          {primaryCurrency
            ? `${primaryCurrency.code} ${primaryCurrency.name}`
            : "Not listed"}
        </p>
        {allCurrencies.length > 1 ? (
          <p className="mt-1 text-xs text-zinc-500">
            Also{" "}
            {allCurrencies
              .slice(1)
              .map((currency) => currency.code)
              .join(", ")}
          </p>
        ) : null}
      </td>
      <td className="min-w-44 px-4 py-4 font-mono text-sm font-semibold text-zinc-950">
        {formatCurrencyRate(primaryCurrency?.code, rates, baseCurrencyCode)}
      </td>
      <td className="min-w-44 px-4 py-4 font-mono text-sm text-zinc-700">
        {formatBaseToLocalCurrency(primaryCurrency?.code, rates)}
      </td>
      <td className="min-w-48 px-4 py-4 font-mono text-sm text-zinc-950">
        {getCurrentTimeInTimezone(selectedTimezone)}
      </td>
      <td className="min-w-52 px-4 py-4 text-sm font-medium text-emerald-800">
        {getTimeDifferenceFromBase(
          selectedTimezone,
          baseTimezone,
          baseCountryName
        )}
      </td>
      <td className="min-w-48 px-4 py-4 text-sm text-zinc-600">
        {(country.timezones?.length ?? 0) > 1 ? (
          <select
            value={selectedTimezone}
            onChange={(event) => setSelectedTimezone(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          >
            {country.timezones?.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        ) : (
          selectedTimezone || "Not available"
        )}
      </td>
    </tr>
  );
}

export function CountryTable({
  countries,
  rates,
  baseCurrencyCode,
  baseTimezone,
  baseCountryName
}: CountryTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-zinc-950 text-xs uppercase tracking-[0.16em] text-zinc-200">
            <tr>
              <th className="px-4 py-4 font-semibold">Flag</th>
              <th className="px-4 py-4 font-semibold">Country</th>
              <th className="px-4 py-4 font-semibold">Capital</th>
              <th className="px-4 py-4 font-semibold">Region</th>
              <th className="px-4 py-4 font-semibold">Current Population</th>
              <th className="px-4 py-4 font-semibold">
                Independence / National Day
              </th>
              <th className="px-4 py-4 font-semibold">Official Languages</th>
              <th className="px-4 py-4 font-semibold">Business Languages</th>
              <th className="px-4 py-4 font-semibold">Currency</th>
              <th className="px-4 py-4 font-semibold">
                1 Local Currency = {baseCurrencyCode}
              </th>
              <th className="px-4 py-4 font-semibold">
                1 {baseCurrencyCode} = Local Currency
              </th>
              <th className="px-4 py-4 font-semibold">Local Time</th>
              <th className="px-4 py-4 font-semibold">
                Time Difference from Base
              </th>
              <th className="px-4 py-4 font-semibold">Timezone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {countries.map((country) => (
              <CountryRow
                key={country.cca2}
                country={country}
                rates={rates}
                baseCurrencyCode={baseCurrencyCode}
                baseTimezone={baseTimezone}
                baseCountryName={baseCountryName}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
