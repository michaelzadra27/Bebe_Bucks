const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234 — whole dollars, for big headline numbers. */
export function money(n: number): string {
  return currency.format(n || 0);
}

/** $1,234.56 — with cents, for exact amounts. */
export function moneyCents(n: number): string {
  return currencyCents.format(n || 0);
}

/** Turn a month count into "3 yr 2 mo" style text. */
export function monthsToHuman(months: number | null): string {
  if (months == null) return "—";
  if (months === 0) return "reached";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr`);
  if (m) parts.push(`${m} mo`);
  return parts.join(" ") || "0 mo";
}

/** A rough target date given a month offset from today. */
export function dateInMonths(months: number | null): string {
  if (months == null) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
