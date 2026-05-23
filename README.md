# World Currency & Time Comparator

A Next.js + TypeScript dashboard for comparing every country's primary currency, local time, population, independence or national day, official languages, and business languages from any selected base country.

## Features

- Countries from REST Countries API v3.1
- Select any base country to switch the dashboard currency and timezone context
- Exchange rates from ExchangeRate-API open endpoint using `latest/{BASE_CURRENCY}`
- Converts `rates[CURRENCY_CODE]` into `1 foreign currency = X base currency` with `1 / rate`
- Current time and offset comparison against the selected base timezone
- Current population from the REST Countries dataset
- Independence or national day display with a curated fallback map
- Official languages from REST Countries
- Business languages estimated from official languages plus English where it is not already listed
- Search, region filter, table/card view toggle
- Multiple currency display and timezone dropdowns
- Loading skeletons, empty state, error state, currency refresh, localStorage caching

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Currency API Notes

The current implementation uses:

```ts
https://open.er-api.com/v6/latest/{BASE_CURRENCY}
```

That endpoint returns rates from the selected base currency to other currencies. The app calculates:

```ts
1 foreign currency in base currency = 1 / rates[CURRENCY_CODE]
```

For example, if the selected base is `USD` and `rates["EUR"] = 0.92`, then:

```ts
1 EUR = 1 / 0.92 USD
```

## Replacing With a Paid API Key Later

Create an `.env.local` file:

```bash
NEXT_PUBLIC_EXCHANGE_RATE_API_URL=https://your-paid-provider.example/latest
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your_api_key_here
```

Then update `lib/api.ts` so the rates URL reads from the environment:

```ts
const RATES_BASE_URL =
  process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_URL ??
  "https://open.er-api.com/v6/latest";
```

If your paid provider requires a key in the URL, append it there when building the request for the selected base currency. If it uses an HTTP header, do not expose a private server key in client-side code. In that case, add a small Next.js Route Handler such as `app/api/rates/route.ts`, read a non-public `EXCHANGE_RATE_API_KEY` on the server, and let the client fetch `/api/rates?base=USD`.

## Timezone Notes

The app uses `Intl.DateTimeFormat` for IANA timezones when available. REST Countries may also return fixed offset labels like `UTC+05:00`; those are supported with offset math so the UI stays reliable without WorldTimeAPI.
