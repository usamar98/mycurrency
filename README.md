# Pakistan Currency & Time Comparator

A Next.js + TypeScript dashboard for comparing every country's primary currency and current time difference against Pakistan.

## Features

- Countries from REST Countries API v3.1
- PKR-based exchange rates from ExchangeRate-API open endpoint
- Converts `rates[CURRENCY_CODE]` into `1 foreign currency = X PKR` with `1 / rate`
- Current time and offset comparison against `Asia/Karachi`
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
https://open.er-api.com/v6/latest/PKR
```

That endpoint returns rates from PKR to other currencies. The app calculates:

```ts
1 foreign currency in PKR = 1 / rates[CURRENCY_CODE]
```

## Replacing With a Paid API Key Later

Create an `.env.local` file:

```bash
NEXT_PUBLIC_EXCHANGE_RATE_API_URL=https://your-paid-provider.example/latest/PKR
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your_api_key_here
```

Then update `lib/api.ts` so `RATES_URL` reads from the environment:

```ts
const RATES_URL =
  process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_URL ??
  "https://open.er-api.com/v6/latest/PKR";
```

If your paid provider requires a key in the URL, append it there. If it uses an HTTP header, do not expose a private server key in client-side code. In that case, add a small Next.js Route Handler such as `app/api/rates/route.ts`, read a non-public `EXCHANGE_RATE_API_KEY` on the server, and let the client fetch `/api/rates`.

## Timezone Notes

The app uses `Intl.DateTimeFormat` for IANA timezones such as `Asia/Karachi`. REST Countries may also return fixed offset labels like `UTC+05:00`; those are supported with offset math so the UI stays reliable without WorldTimeAPI.
