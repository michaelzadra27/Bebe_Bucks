// Pure finance calculations: bill splits, settle-up netting, and savings
// projections. Kept free of React/Supabase so they're easy to unit-test.

import type { Account, Bill, DueBucket, Owner, Person } from "./types";

/** Current calendar month, 1-12. */
export function thisMonth(): number {
  return new Date().getMonth() + 1;
}

/** The bill's effective amount for a given calendar month (1-12). */
export function billAmountForMonth(bill: Bill, month: number): number {
  if (bill.estimateMode === "seasonal") {
    const v = bill.monthly?.[String(month)];
    if (typeof v === "number" && !Number.isNaN(v)) return round2(v);
  }
  return bill.total;
}

/** Average of a seasonal profile's entered months (ignores blanks). */
export function annualAverage(monthly: Record<string, number> | undefined | null): number {
  const vals = Object.values(monthly ?? {}).filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return 0;
  return round2(vals.reduce((s, v) => s + v, 0) / vals.length);
}

/** Each person's dollar share of a given bill amount. */
export function sharesFor(
  bill: Bill,
  people: Person[],
  amount: number = bill.total,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (bill.splitType === "even") {
    const each = people.length ? amount / people.length : 0;
    for (const p of people) out[p.id] = round2(each);
  } else {
    for (const p of people) out[p.id] = round2(bill.customShares[p.id] ?? 0);
  }
  return out;
}

/** Each person's share as a percentage of a given bill amount. */
export function percentsFor(
  bill: Bill,
  people: Person[],
  amount: number = bill.total,
): Record<string, number> {
  const shares = sharesFor(bill, people, amount);
  const out: Record<string, number> = {};
  for (const p of people) {
    out[p.id] = amount > 0 ? round2((shares[p.id] / amount) * 100) : 0;
  }
  return out;
}

export interface BucketSummary {
  bucket: DueBucket | "all";
  month: number;
  bills: Array<{ bill: Bill; amount: number; shares: Record<string, number>; payer: Owner }>;
  /** Total cash leaving the household this cycle (bills flagged includeInHouseholdTotal). */
  householdCashDue: number;
  /** Per person: their total share, and how much they pay out to vendors. */
  perPerson: Record<string, { share: number; paysOut: number }>;
  /** Net settle-up between the two people, or null if nobody owes anybody. */
  net: { fromId: string; toId: string; amount: number } | null;
}

/**
 * Build a settle-up summary for the given bills.
 *
 * Model: whoever is the `payer` fronts the full bill; every other person owes
 * the payer their share. Joint-paid bills create no person-to-person debt
 * (each funds the joint account on their own) but still count as household cash.
 * We then net the two people's cross-obligations into a single number.
 */
export function summarize(
  bills: Bill[],
  people: Person[],
  bucket: DueBucket | "all" = "all",
  month: number = thisMonth(),
): BucketSummary {
  const active = bills.filter(
    (b) => b.active && (bucket === "all" || b.dueBucket === bucket),
  );

  const perPerson: Record<string, { share: number; paysOut: number }> = {};
  for (const p of people) perPerson[p.id] = { share: 0, paysOut: 0 };

  // owed[a][b] = how much a owes b
  const owed: Record<string, Record<string, number>> = {};
  for (const a of people) {
    owed[a.id] = {};
    for (const b of people) owed[a.id][b.id] = 0;
  }

  let householdCashDue = 0;
  const detail: BucketSummary["bills"] = [];

  for (const bill of active) {
    const amount = billAmountForMonth(bill, month);
    const shares = sharesFor(bill, people, amount);
    detail.push({ bill, amount, shares, payer: bill.payer });

    if (bill.includeInHouseholdTotal) householdCashDue += amount;

    for (const p of people) {
      perPerson[p.id].share += shares[p.id];
    }

    if (bill.payer !== "joint") {
      perPerson[bill.payer].paysOut += amount;
      for (const p of people) {
        if (p.id !== bill.payer) {
          owed[p.id][bill.payer] += shares[p.id];
        }
      }
    }
  }

  // Reduce to a single net between the two people (if exactly two).
  let net: BucketSummary["net"] = null;
  if (people.length === 2) {
    const [a, b] = people;
    const aOwesB = owed[a.id][b.id];
    const bOwesA = owed[b.id][a.id];
    const diff = round2(bOwesA - aOwesB);
    if (diff > 0) net = { fromId: b.id, toId: a.id, amount: diff };
    else if (diff < 0) net = { fromId: a.id, toId: b.id, amount: -diff };
  }

  return {
    bucket,
    month,
    bills: detail,
    householdCashDue: round2(householdCashDue),
    perPerson,
    net,
  };
}

/** Household cash total for each calendar month (index 0 = Jan … 11 = Dec). */
export function monthlyHouseholdTotals(bills: Bill[]): number[] {
  const out: number[] = [];
  for (let m = 1; m <= 12; m++) {
    let sum = 0;
    for (const bill of bills) {
      if (bill.active && bill.includeInHouseholdTotal) {
        sum += billAmountForMonth(bill, m);
      }
    }
    out.push(round2(sum));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Savings projections
// ---------------------------------------------------------------------------

export function monthlyContributionTotal(account: Account): number {
  return round2(
    Object.values(account.contributions).reduce((s, v) => s + (v || 0), 0),
  );
}

/** Future value of a balance plus end-of-month contributions compounding monthly. */
export function futureValue(
  balance: number,
  monthlyContribution: number,
  annualReturnPct: number,
  months: number,
): number {
  const r = annualReturnPct / 100 / 12;
  if (months <= 0) return round2(balance);
  if (r === 0) return round2(balance + monthlyContribution * months);
  const growth = Math.pow(1 + r, months);
  const fv = balance * growth + monthlyContribution * ((growth - 1) / r);
  return round2(fv);
}

/** Months until the account reaches `goal`, or null if it never will (within 100y). */
export function monthsToGoal(
  balance: number,
  monthlyContribution: number,
  annualReturnPct: number,
  goal: number,
): number | null {
  if (goal <= balance) return 0;
  const MAX = 1200; // 100 years
  for (let m = 1; m <= MAX; m++) {
    if (futureValue(balance, monthlyContribution, annualReturnPct, m) >= goal) {
      return m;
    }
  }
  return null;
}

/** A short series of projected balances for charting. */
export function projectionSeries(
  account: Account,
  months: number,
  steps = 12,
): Array<{ month: number; balance: number }> {
  const monthly = monthlyContributionTotal(account);
  const rtn = account.annualReturnPct ?? 0;
  const out: Array<{ month: number; balance: number }> = [];
  const stride = Math.max(1, Math.round(months / steps));
  for (let m = 0; m <= months; m += stride) {
    out.push({ month: m, balance: futureValue(account.balance, monthly, rtn, m) });
  }
  if (out[out.length - 1]?.month !== months) {
    out.push({ month: months, balance: futureValue(account.balance, monthly, rtn, months) });
  }
  return out;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
