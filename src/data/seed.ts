import type { Account, Bill, HouseholdSettings, Person } from "../lib/types";

export interface AppData {
  people: Person[];
  accounts: Account[];
  bills: Bill[];
  settings: HouseholdSettings;
}

const now = new Date().toISOString();

/**
 * Starter data so the app is immediately explorable. Modeled on the real-world
 * examples from setup (mortgage + utilities paid by one person, SMUD paid by
 * the other, a one-way health-insurance share, a joint car fund). Edit or delete
 * any of it inside the app.
 */
export function makeSeed(): AppData {
  const people: Person[] = [
    { id: "me", name: "Me", color: "#0f766e" },
    { id: "partner", name: "Partner", color: "#7c3aed" },
  ];

  const bills: Bill[] = [
    b("Mortgage", "Housing", 2200, "me", 1, { sortOrder: 0 }),
    b("Car insurance", "Insurance", 210, "me", 1, { sortOrder: 1 }),
    b("Internet", "Utilities", 85, "joint", 1, { sortOrder: 2 }),
    b("Water", "Utilities", 90, "me", 15, { sortOrder: 3 }),
    b("PG&E (gas)", "Utilities", 140, "me", 15, { sortOrder: 4 }),
    b("SMUD (electric)", "Utilities", 180, "partner", 15, { sortOrder: 5 }),
    b("AT&T", "Utilities", 140, "me", 15, { sortOrder: 6 }),
    b("Gym", "Lifestyle", 80, "me", 15, { sortOrder: 7 }),
    b("Health insurance", "Insurance", 600, "partner", 15, {
      sortOrder: 8,
      splitType: "custom",
      customShares: { me: 100, partner: 500 },
      includeInHouseholdTotal: false,
      notes: "One-way: I just cover my $100 share; the rest is on your paycheck.",
    }),
  ];

  const accounts: Account[] = [
    a("Car Savings", "savings", "joint", 2400, { me: 100, partner: 100 }, {
      sweepDay: 1,
      goalAmount: 12000,
      annualReturnPct: 0,
      sortOrder: 0,
    }),
    a("Emergency Fund", "savings", "joint", 8000, { me: 150, partner: 150 }, {
      sweepDay: 5,
      goalAmount: 25000,
      annualReturnPct: 4,
      sortOrder: 1,
    }),
    a("Brokerage", "investment", "joint", 15000, { me: 200, partner: 200 }, {
      sweepDay: 1,
      goalAmount: 100000,
      annualReturnPct: 7,
      sortOrder: 2,
    }),
    a("Joint Checking", "checking", "joint", 3500, {}, { sortOrder: 3 }),
  ];

  return {
    people,
    accounts,
    bills,
    settings: { householdName: "Bebe Bucks" },
  };
}

function b(
  name: string,
  category: string,
  total: number,
  payer: Bill["payer"],
  dueBucket: Bill["dueBucket"],
  extra: Partial<Bill> = {},
): Bill {
  return {
    id: crypto.randomUUID(),
    name,
    category,
    total,
    payer,
    dueBucket,
    dueDay: null,
    splitType: "even",
    customShares: {},
    estimateMode: "flat",
    monthly: {},
    includeInHouseholdTotal: true,
    active: true,
    notes: "",
    sortOrder: 0,
    ...extra,
  };
}

function a(
  name: string,
  type: Account["type"],
  owner: Account["owner"],
  balance: number,
  contributions: Record<string, number>,
  extra: Partial<Account> = {},
): Account {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    owner,
    balance,
    balanceUpdatedAt: now,
    contributions,
    sweepDay: null,
    goalAmount: null,
    annualReturnPct: null,
    notes: "",
    sortOrder: 0,
    ...extra,
  };
}
