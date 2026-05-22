export type CountryCurrency = {
  name: string;
  symbol?: string;
};

export type RestCountry = {
  name: {
    common: string;
    official?: string;
  };
  cca2: string;
  capital?: string[];
  flags?: {
    png?: string;
    svg?: string;
    alt?: string;
  };
  currencies?: Record<string, CountryCurrency>;
  languages?: Record<string, string>;
  timezones?: string[];
  region?: string;
  subregion?: string;
};

export type ExchangeRatesResponse = {
  result: string;
  provider?: string;
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code: string;
  rates: Record<string, number>;
};

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol?: string;
};

export type ViewMode = "table" | "cards";

export type BaseCountryOption = {
  code: string;
  label: string;
  currencyCode: string;
  timezones: string[];
};
