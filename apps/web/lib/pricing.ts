// Prices are set in CHF. Visitors in the EU see EUR, converted at the daily ECB rate.

export const PRICE_CHF = {
  helvax: { monthly: 2, annual: 12 },
} as const;

/** Helvax Pro has no list price yet; set one here (e.g. { monthly: 4, annual: 24 }) to show it. */
export const PRO_PRICE_CHF: Price | null = null;

/** Employees included in the Free plan. */
export const FREE_EMPLOYEES = 1;

export type Currency = "CHF" | "EUR";

const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** EUR for EU countries, CHF for everyone else (Switzerland included). */
export function currencyFor(country: string | null | undefined): Currency {
  return country && EU.has(country.toUpperCase()) ? "EUR" : "CHF";
}

// Used only when the rate service is unreachable.
const FALLBACK_CHF_TO_EUR = 1.07;

/** How many EUR one CHF buys today. Cached for a day. */
export async function chfToEur(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=CHF&symbols=EUR", {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return FALLBACK_CHF_TO_EUR;
    const data = (await res.json()) as { rates?: { EUR?: number } };
    const rate = data.rates?.EUR;
    return typeof rate === "number" && rate > 0 ? rate : FALLBACK_CHF_TO_EUR;
  } catch {
    return FALLBACK_CHF_TO_EUR;
  }
}

export interface Price {
  /** Price per employee per month, monthly billing. */
  monthly: number;
  /** Price per employee per year, annual billing. */
  annual: number;
}

export interface PriceList {
  currency: Currency;
  helvax: Price;
  /** Null while Pro is priced on request. */
  pro: Price | null;
}

export async function priceListFor(country: string | null | undefined): Promise<PriceList> {
  const currency = currencyFor(country);
  if (currency === "CHF") return { currency, helvax: PRICE_CHF.helvax, pro: PRO_PRICE_CHF };
  const rate = await chfToEur();
  const convert = (p: Price): Price => ({ monthly: Math.round(p.monthly * rate * 100) / 100, annual: Math.round(p.annual * rate * 100) / 100 });
  return { currency, helvax: convert(PRICE_CHF.helvax), pro: PRO_PRICE_CHF && convert(PRO_PRICE_CHF) };
}

/** Formats a price the same way on server and browser (Intl output differs between ICU versions). */
export function formatMoney(amount: number, currency: Currency): string {
  const cents = Math.round(amount * 100);
  const whole = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, currency === "CHF" ? "’" : ",");
  const fraction = cents % 100 === 0 ? "" : `.${String(cents % 100).padStart(2, "0")}`;
  return currency === "CHF" ? `CHF ${whole}${fraction}` : `€${whole}${fraction}`;
}

/** Thousands separators without Intl, for the same reason as formatMoney. */
export function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
}
