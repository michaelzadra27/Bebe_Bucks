import { describe, expect, it } from "vitest";
import { futureValue, monthsToGoal, sharesFor, summarize } from "./finance";
import type { Bill, Person } from "./types";

const me: Person = { id: "me", name: "Me", color: "#0f766e" };
const partner: Person = { id: "partner", name: "Partner", color: "#7c3aed" };
const people = [me, partner];

function bill(partial: Partial<Bill>): Bill {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Bill",
    category: "Other",
    total: 100,
    payer: "me",
    dueBucket: 1,
    dueDay: null,
    splitType: "even",
    customShares: {},
    includeInHouseholdTotal: true,
    active: true,
    notes: "",
    sortOrder: 0,
    ...partial,
  };
}

describe("sharesFor", () => {
  it("splits evenly by default", () => {
    expect(sharesFor(bill({ total: 100 }), people)).toEqual({ me: 50, partner: 50 });
  });
  it("uses custom shares when set", () => {
    const b = bill({ total: 500, splitType: "custom", customShares: { me: 400, partner: 100 } });
    expect(sharesFor(b, people)).toEqual({ me: 400, partner: 100 });
  });
});

describe("summarize settle-up", () => {
  it("nets the mortgage/SMUD example to the partner owing Me", () => {
    const bills = [
      bill({ name: "Mortgage+utils", total: 3000, payer: "me", dueBucket: 15 }),
      bill({ name: "SMUD", total: 200, payer: "partner", dueBucket: 15 }),
    ];
    const s = summarize(bills, people, 15);
    // Partner owes Me their half of 3000 ($1500); Me owes Partner half of SMUD ($100).
    // Net: partner owes me $1400.
    expect(s.net).toEqual({ fromId: "partner", toId: "me", amount: 1400 });
    expect(s.householdCashDue).toBe(3200);
  });

  it("handles a one-way bill paid by partner with a fixed share, excluded from household total", () => {
    const bills = [
      bill({
        name: "Health insurance",
        total: 600,
        payer: "partner",
        dueBucket: 15,
        splitType: "custom",
        customShares: { me: 100, partner: 500 },
        includeInHouseholdTotal: false,
      }),
    ];
    const s = summarize(bills, people, 15);
    // I owe partner my $100 share; the $600 premium is not household cash.
    expect(s.net).toEqual({ fromId: "me", toId: "partner", amount: 100 });
    expect(s.householdCashDue).toBe(0);
  });

  it("joint-paid bills create no person debt but count as household cash", () => {
    const bills = [bill({ name: "Internet", total: 80, payer: "joint" })];
    const s = summarize(bills, people, "all");
    expect(s.net).toBeNull();
    expect(s.householdCashDue).toBe(80);
  });
});

describe("savings projections", () => {
  it("future value with zero return is balance plus contributions", () => {
    expect(futureValue(1000, 200, 0, 12)).toBe(3400);
  });
  it("future value compounds with a positive return", () => {
    expect(futureValue(0, 100, 12, 12)).toBeGreaterThan(1200);
  });
  it("months to goal returns 0 when already met", () => {
    expect(monthsToGoal(5000, 100, 5, 4000)).toBe(0);
  });
  it("months to goal finds a reasonable horizon", () => {
    const m = monthsToGoal(0, 100, 0, 1200);
    expect(m).toBe(12);
  });
});
