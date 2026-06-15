# World Currency & Time Comparator

A Next.js + TypeScript dashboard for comparing every country's primary currency, local time, population, independence or national day, official languages, and business languages from any selected base country.

## Features

- Countries from a server route that uses REST Countries v5 when configured and no-key public country datasets as fallback
- Select any base country to switch the dashboard currency and timezone context
- Exchange rates from an app-owned API route that merges Frankfurter central-bank rates with ExchangeRate-API fallback coverage
- Converts `rates[CURRENCY_CODE]` into `1 foreign currency = X base currency` with `1 / rate`
- Current time and offset comparison against the selected base timezone
- Current population from the REST Countries dataset
- Country dialing codes such as `+92`, with a dedicated country-code filter
- Independence or national day display with a curated fallback map
- Official languages from REST Countries
- Business languages estimated from official languages plus English where it is not already listed
- Search, region filter, country-code filter, table/card view toggle
- Multiple currency display and timezone dropdowns
- Loading skeletons, empty state, error state, currency refresh, localStorage caching

## Run Locally

Optional: create `.env.local` if you have a REST Countries v5 key:

```bash
REST_COUNTRIES_API_KEY=your_rest_countries_v5_api_key
```

REST Countries v3/v4 endpoints have been deprecated. Without a v5 key, the app automatically uses public `mledoze/countries` and `countries-states-cities` data so deployments still load country, currency, language, population, dialing-code, and timezone fields.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Notes

The browser calls only local Next.js routes:

```ts
/api/countries
/api/rates?base={BASE_CURRENCY}
```

`/api/countries` uses REST Countries v5 on the server with `REST_COUNTRIES_API_KEY` when available. If the key is missing or the request fails, it falls back to public country datasets, maps the data to the app's country shape, and caches successful responses.

`/api/rates` requests Frankfurter and ExchangeRate-API, validates both responses, merges them into one rate table, and caches successful responses. The app calculates:

```ts
1 foreign currency in base currency = 1 / rates[CURRENCY_CODE]
```

For example, if the selected base is `USD` and `rates["EUR"] = 0.92`, then:

```ts
1 EUR = 1 / 0.92 USD
```

## Timezone Notes

The app uses `Intl.DateTimeFormat` for IANA timezones when available. REST Countries may also return fixed offset labels like `UTC+05:00`; those are supported with offset math so the UI stays reliable without WorldTimeAPI.
