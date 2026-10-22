import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Account, Bill, HouseholdSettings, Person } from "../lib/types";
import { makeSeed, type AppData } from "./seed";

/**
 * A storage backend for the household data. Two implementations:
 *  - LocalRepo:    browser localStorage (demo / offline, per-device).
 *  - SupabaseRepo: shared cloud database (both phones see the same data).
 * The app code only talks to this interface, so flipping between them is just
 * a matter of whether Supabase env vars are set.
 */
export interface Repo {
  readonly kind: "local" | "supabase";
  load(): Promise<AppData>;
  savePerson(p: Person): Promise<void>;
  saveAccount(a: Account): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  saveBill(b: Bill): Promise<void>;
  deleteBill(id: string): Promise<void>;
  saveSettings(s: HouseholdSettings): Promise<void>;
}

const LS_KEY = "bebe-bucks-data-v1";

class LocalRepo implements Repo {
  readonly kind = "local" as const;

  private read(): AppData {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch {
      /* fall through to seed */
    }
    const seed = makeSeed();
    this.write(seed);
    return seed;
  }

  private write(data: AppData) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      /* storage may be unavailable (private mode) — keep working in-memory */
    }
  }

  async load(): Promise<AppData> {
    return this.read();
  }

  async savePerson(p: Person) {
    const d = this.read();
    d.people = upsert(d.people, p);
    this.write(d);
  }

  async saveAccount(a: Account) {
    const d = this.read();
    d.accounts = upsert(d.accounts, a);
    this.write(d);
  }

  async deleteAccount(id: string) {
    const d = this.read();
    d.accounts = d.accounts.filter((x) => x.id !== id);
    this.write(d);
  }

  async saveBill(b: Bill) {
    const d = this.read();
    d.bills = upsert(d.bills, b);
    this.write(d);
  }

  async deleteBill(id: string) {
    const d = this.read();
    d.bills = d.bills.filter((x) => x.id !== id);
    this.write(d);
  }

  async saveSettings(s: HouseholdSettings) {
    const d = this.read();
    d.settings = s;
    this.write(d);
  }
}

// ---------------------------------------------------------------------------
// Supabase backend — relational tables (see supabase/schema.sql).
// Column names are snake_case; we map to/from the camelCase domain types.
// ---------------------------------------------------------------------------

class SupabaseRepo implements Repo {
  readonly kind = "supabase" as const;
  private get db() {
    if (!supabase) throw new Error("Supabase not configured");
    return supabase;
  }

  async load(): Promise<AppData> {
    const [people, accounts, bills, settings] = await Promise.all([
      this.db.from("people").select("*").order("name"),
      this.db.from("accounts").select("*").order("sort_order"),
      this.db.from("bills").select("*").order("sort_order"),
      this.db.from("settings").select("*").eq("id", "household").maybeSingle(),
    ]);
    if (people.error) throw people.error;
    if (accounts.error) throw accounts.error;
    if (bills.error) throw bills.error;
    if (settings.error) throw settings.error;

    // Seed an empty database on first run so the app isn't blank.
    if ((people.data ?? []).length === 0) {
      const seed = makeSeed();
      await Promise.all([
        ...seed.people.map((p) => this.savePerson(p)),
        ...seed.accounts.map((a) => this.saveAccount(a)),
        ...seed.bills.map((b) => this.saveBill(b)),
        this.saveSettings(seed.settings),
      ]);
      return seed;
    }

    return {
      people: (people.data ?? []).map(rowToPerson),
      accounts: (accounts.data ?? []).map(rowToAccount),
      bills: (bills.data ?? []).map(rowToBill),
      settings: settings.data
        ? { householdName: settings.data.household_name }
        : { householdName: "Bebe Bucks" },
    };
  }

  async savePerson(p: Person) {
    const { error } = await this.db.from("people").upsert(personToRow(p));
    if (error) throw error;
  }

  async saveAccount(a: Account) {
    const { error } = await this.db.from("accounts").upsert(accountToRow(a));
    if (error) throw error;
  }

  async deleteAccount(id: string) {
    const { error } = await this.db.from("accounts").delete().eq("id", id);
    if (error) throw error;
  }

  async saveBill(b: Bill) {
    const { error } = await this.db.from("bills").upsert(billToRow(b));
    if (error) throw error;
  }

  async deleteBill(id: string) {
    const { error } = await this.db.from("bills").delete().eq("id", id);
    if (error) throw error;
  }

  async saveSettings(s: HouseholdSettings) {
    const { error } = await this.db
      .from("settings")
      .upsert({ id: "household", household_name: s.householdName });
    if (error) throw error;
  }
}

// --- row mappers -----------------------------------------------------------

function personToRow(p: Person) {
  return { id: p.id, name: p.name, color: p.color };
}
function rowToPerson(r: any): Person {
  return { id: r.id, name: r.name, color: r.color };
}

function accountToRow(a: Account) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    owner: a.owner,
    balance: a.balance,
    balance_updated_at: a.balanceUpdatedAt,
    contributions: a.contributions,
    sweep_day: a.sweepDay,
    goal_amount: a.goalAmount,
    annual_return_pct: a.annualReturnPct,
    notes: a.notes,
    sort_order: a.sortOrder,
  };
}
function rowToAccount(r: any): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    owner: r.owner,
    balance: Number(r.balance),
    balanceUpdatedAt: r.balance_updated_at,
    contributions: r.contributions ?? {},
    sweepDay: r.sweep_day,
    goalAmount: r.goal_amount == null ? null : Number(r.goal_amount),
    annualReturnPct: r.annual_return_pct == null ? null : Number(r.annual_return_pct),
    notes: r.notes ?? "",
    sortOrder: r.sort_order ?? 0,
  };
}

function billToRow(b: Bill) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    total: b.total,
    payer: b.payer,
    due_bucket: b.dueBucket,
    due_day: b.dueDay,
    split_type: b.splitType,
    custom_shares: b.customShares,
    include_in_household_total: b.includeInHouseholdTotal,
    active: b.active,
    notes: b.notes,
    sort_order: b.sortOrder,
  };
}
function rowToBill(r: any): Bill {
  return {
    id: r.id,
    name: r.name,
    category: r.category ?? "Other",
    total: Number(r.total),
    payer: r.payer,
    dueBucket: r.due_bucket,
    dueDay: r.due_day,
    splitType: r.split_type,
    customShares: r.custom_shares ?? {},
    includeInHouseholdTotal: r.include_in_household_total,
    active: r.active,
    notes: r.notes ?? "",
    sortOrder: r.sort_order ?? 0,
  };
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

let singleton: Repo | null = null;
export function getRepo(): Repo {
  if (!singleton) {
    singleton = isSupabaseConfigured ? new SupabaseRepo() : new LocalRepo();
  }
  return singleton;
}
