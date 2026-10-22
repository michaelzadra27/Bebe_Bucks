// Core domain types for Bebe Bucks.
// These mirror the Supabase schema (see supabase/schema.sql) so the local and
// cloud data layers can share one shape.

/** The two people in the household. Stored as rows so names/colors are editable. */
export interface Person {
  id: string;
  name: string;
  color: string;
}

/** Owner of an account or payer of a bill: a specific person, or "joint". */
export type Owner = string | "joint";

export type AccountType = "savings" | "checking" | "investment" | "other";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner: Owner;
  /** Manually-entered current balance. */
  balance: number;
  balanceUpdatedAt: string; // ISO date
  /** Monthly contribution per person: { [personId]: amount }. */
  contributions: Record<string, number>;
  /** Day of month (1-31) the contribution sweeps in, or null if not scheduled. */
  sweepDay: number | null;
  /** Optional savings goal + assumed annual return for projections. */
  goalAmount: number | null;
  annualReturnPct: number | null;
  notes: string;
  sortOrder: number;
}

export type DueBucket = 1 | 15;
export type SplitType = "even" | "custom";
export type EstimateMode = "flat" | "seasonal";

export interface Bill {
  id: string;
  name: string;
  category: string;
  /** Full vendor charge (manual estimate for v1). */
  total: number;
  /** Who actually pays the vendor. */
  payer: Owner;
  /** Which reconciliation date we settle/pay this on. */
  dueBucket: DueBucket;
  /** Optional real due day for reference (we still pay on the bucket date). */
  dueDay: number | null;
  splitType: SplitType;
  /** For custom splits: dollar share per person { [personId]: amount }. */
  customShares: Record<string, number>;
  /** "flat" = same `total` every month; "seasonal" = per-calendar-month amounts. */
  estimateMode: EstimateMode;
  /** Seasonal amounts keyed by calendar month "1".."12" (Jan..Dec). */
  monthly: Record<string, number>;
  /** When false, only the shares count toward settle-up, not the household cash total.
   *  Used for one-way bills (e.g. a partner's health insurance where you only owe a fixed share). */
  includeInHouseholdTotal: boolean;
  active: boolean;
  notes: string;
  sortOrder: number;
}

export interface HouseholdSettings {
  householdName: string;
}
