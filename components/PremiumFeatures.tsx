"use client";

import {
  PREMIUM_FEATURES,
  type MembershipStatus,
  type PremiumFeature
} from "@/lib/premium";
import { getPrimaryCurrency } from "@/lib/currency";
import { getBusinessLanguages, getOfficialLanguages } from "@/lib/languages";
import { getCurrentTimeInTimezone, getTimeDifferenceFromBase } from "@/lib/time";
import type { RestCountry } from "@/types";
import { type ReactNode, useMemo, useState } from "react";

type PremiumFeaturesProps = {
  countries: RestCountry[];
  rates: Record<string, number>;
  baseCurrencyCode: string;
  baseCountryName: string;
  baseTimezone: string;
  ratesUpdatedLabel: string;
  membershipStatus: MembershipStatus;
};

type RankedCurrency = {
  countryName: string;
  currencyCode: string;
  valueInBase: number;
};

const compactNumberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2
});

function quoteCsvValue(value: string | number): string {
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function formatCurrencyValue(value: number, baseCurrencyCode: string): string {
  return `${compactNumberFormatter.format(value)} ${baseCurrencyCode}`;
}

function getRankedCurrencies(
  countries: RestCountry[],
  rates: Record<string, number>
): RankedCurrency[] {
  return countries
    .map((country) => {
      const currency = getPrimaryCurrency(country);
      const rate = currency ? rates[currency.code] : null;

      if (!currency || !rate) {
        return null;
      }

      return {
        countryName: country.name.common,
        currencyCode: currency.code,
        valueInBase: 1 / rate
      };
    })
    .filter((item): item is RankedCurrency => item !== null)
    .sort((a, b) => b.valueInBase - a.valueInBase);
}

function buildComparisonCsv(
  countries: RestCountry[],
  rates: Record<string, number>,
  baseCurrencyCode: string,
  baseTimezone: string,
  baseCountryName: string
): string {
  const rows = countries.map((country) => {
    const currency = getPrimaryCurrency(country);
    const rate = currency ? rates[currency.code] : null;
    const firstTimezone = country.timezones?.[0] ?? "";

    return [
      country.name.common,
      country.capital?.join(", ") ?? "",
      country.region ?? "",
      currency?.code ?? "",
      currency?.name ?? "",
      rate ? formatCurrencyValue(1 / rate, baseCurrencyCode) : "Not available",
      rate ? `${compactNumberFormatter.format(rate)} ${currency?.code}` : "Not available",
      getCurrentTimeInTimezone(firstTimezone),
      getTimeDifferenceFromBase(firstTimezone, baseTimezone, baseCountryName),
      getOfficialLanguages(country).join(", "),
      getBusinessLanguages(country).join(", ")
    ];
  });

  const headers = [
    "Country",
    "Capital",
    "Region",
    "Currency code",
    "Currency name",
    `1 local currency in ${baseCurrencyCode}`,
    `1 ${baseCurrencyCode} in local currency`,
    "Local time",
    "Time difference from base",
    "Official languages",
    "Business languages"
  ];

  return [headers, ...rows]
    .map((row) => row.map(quoteCsvValue).join(","))
    .join("\n");
}

function FeatureCard({
  feature,
  isMember,
  children
}: {
  feature: PremiumFeature;
  isMember: boolean;
  children: ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            {feature.shortTitle}
          </p>
          <h3 className="mt-2 text-base font-black tracking-tight text-zinc-950">
            {feature.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
            isMember
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          {isMember ? "Member" : "Locked"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-500">{feature.description}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function PremiumFeatures({
  countries,
  rates,
  baseCurrencyCode,
  baseCountryName,
  baseTimezone,
  ratesUpdatedLabel,
  membershipStatus
}: PremiumFeaturesProps) {
  const [exportStatus, setExportStatus] = useState("");
  const isMember = membershipStatus.isMember;
  const rankedCurrencies = useMemo(
    () => getRankedCurrencies(countries, rates),
    [countries, rates]
  );
  const topCurrencies = rankedCurrencies.slice(0, 3);
  const affordableCurrencies = rankedCurrencies.slice(-3).reverse();
  const exportFeature = PREMIUM_FEATURES.find(
    (feature) => feature.id === "csv-export"
  );
  const alertFeature = PREMIUM_FEATURES.find(
    (feature) => feature.id === "rate-watchlist"
  );
  const meetingFeature = PREMIUM_FEATURES.find(
    (feature) => feature.id === "meeting-planner"
  );
  const rankingFeature = PREMIUM_FEATURES.find(
    (feature) => feature.id === "strength-ranking"
  );
  const briefFeature = PREMIUM_FEATURES.find(
    (feature) => feature.id === "business-brief"
  );

  function handleExport() {
    if (!isMember) {
      setExportStatus("CSV export is reserved for members.");
      return;
    }

    const csv = buildComparisonCsv(
      countries,
      rates,
      baseCurrencyCode,
      baseTimezone,
      baseCountryName
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `world-currency-time-${baseCurrencyCode.toLowerCase()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportStatus("CSV downloaded.");
  }

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-white/10 p-5 text-white lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Member tools
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Premium features ready for small subscriptions
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            These tools are designed to sit behind your future payment and
            membership check. Free users see the locked preview; members can
            receive exports, alerts, rankings, and travel briefs.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs text-zinc-400">Current access</p>
              <p className="mt-1 font-mono text-lg font-black text-white">
                {membershipStatus.planLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs text-zinc-400">Base context</p>
              <p className="mt-1 font-mono text-lg font-black text-white">
                {baseCountryName} / {baseCurrencyCode || "Not ready"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-[#f8faf9] p-4 md:grid-cols-2">
          {exportFeature ? (
            <FeatureCard feature={exportFeature} isMember={isMember}>
              <button
                type="button"
                onClick={handleExport}
                disabled={!isMember || countries.length === 0}
                className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 active:translate-y-[1px]"
              >
                Export visible rows
              </button>
              <p className="mt-2 text-xs text-zinc-500">
                {exportStatus || `${countries.length} rows ready for members.`}
              </p>
            </FeatureCard>
          ) : null}

          {alertFeature ? (
            <FeatureCard feature={alertFeature} isMember={isMember}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  disabled
                  value={`${baseCurrencyCode || "BASE"} target rate`}
                  className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500"
                  readOnly
                />
                <button
                  type="button"
                  disabled
                  className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-bold text-zinc-400"
                >
                  Save
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Future hook: send alerts after payment and account login.
              </p>
            </FeatureCard>
          ) : null}

          {meetingFeature ? (
            <FeatureCard feature={meetingFeature} isMember={isMember}>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <p className="font-mono text-sm font-bold text-zinc-950">
                  09:00 to 12:00 base time
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Locked planner will compare office-hour overlap by timezone.
                </p>
              </div>
            </FeatureCard>
          ) : null}

          {rankingFeature ? (
            <FeatureCard feature={rankingFeature} isMember={isMember}>
              {isMember ? (
                <div className="grid gap-2">
                  {topCurrencies.map((item) => (
                    <div
                      key={`${item.countryName}-${item.currencyCode}`}
                      className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-zinc-700">
                        {item.currencyCode}
                      </span>
                      <span className="font-mono text-zinc-500">
                        {formatCurrencyValue(item.valueInBase, baseCurrencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  {["Top currency", "Second currency", "Third currency"].map(
                    (label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-zinc-400">
                          {label}
                        </span>
                        <span className="font-mono text-zinc-400">
                          Member only
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </FeatureCard>
          ) : null}

          {briefFeature ? (
            <FeatureCard feature={briefFeature} isMember={isMember}>
              {isMember ? (
                <div className="grid gap-2 text-sm text-zinc-600">
                  <p>
                    Strongest preview:{" "}
                    <span className="font-bold text-zinc-950">
                      {topCurrencies[0]?.currencyCode ?? "Not ready"}
                    </span>
                  </p>
                  <p>
                    Affordable preview:{" "}
                    <span className="font-bold text-zinc-950">
                      {affordableCurrencies[0]?.currencyCode ?? "Not ready"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Last rate update: {ratesUpdatedLabel}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-500">
                  Members will see a compact brief with currency, timezone,
                  language, and business context.
                </div>
              )}
            </FeatureCard>
          ) : null}
        </div>
      </div>
    </section>
  );
}
