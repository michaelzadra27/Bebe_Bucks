import { useState } from "react";
import { useStore } from "../state/store";
import {
  futureValue,
  monthlyContributionTotal,
  monthsToGoal,
} from "../lib/finance";
import { dateInMonths, money, moneyCents, monthsToHuman } from "../lib/format";
import { Field, OwnerBadge, OwnerPicker, Segmented, Sheet } from "./ui";
import type { Account, AccountType } from "../lib/types";

function blankAccount(): Account {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "savings",
    owner: "joint",
    balance: 0,
    balanceUpdatedAt: new Date().toISOString(),
    contributions: {},
    sweepDay: 1,
    goalAmount: null,
    annualReturnPct: null,
    notes: "",
    sortOrder: 99,
  };
}

export function Accounts() {
  const { accounts, people } = useStore();
  const [editing, setEditing] = useState<Account | null>(null);
  const sorted = [...accounts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const monthlyIn = accounts.reduce((s, a) => s + monthlyContributionTotal(a), 0);
  const ownerTotal = (owner: string) =>
    accounts.filter((a) => a.owner === owner).reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Accounts</h1>
        <button className="btn btn-primary" onClick={() => setEditing(blankAccount())}>
          + Add
        </button>
      </div>

      {accounts.length > 0 && (
        <section className="card totals">
          <div className="totals-head">
            <span className="ov-label">Total across all accounts</span>
            <span className="totals-big">{money(total)}</span>
          </div>
          <div className="totals-breakdown">
            {people.map((p) => (
              <span key={p.id} className="totals-chip">
                <span className="dot" style={{ background: p.color }} />
                {p.name} {money(ownerTotal(p.id))}
              </span>
            ))}
            <span className="totals-chip">
              <span className="dot dot-joint" />
              Joint {money(ownerTotal("joint"))}
            </span>
          </div>
          {monthlyIn > 0 && (
            <div className="muted small totals-flow">{money(monthlyIn)}/mo flowing in</div>
          )}
        </section>
      )}

      {sorted.length === 0 && <p className="empty">No accounts yet.</p>}

      {sorted.map((acc) => {
        const monthly = monthlyContributionTotal(acc);
        const pct = acc.goalAmount ? Math.min(100, (acc.balance / acc.goalAmount) * 100) : 0;
        const months = acc.goalAmount
          ? monthsToGoal(acc.balance, monthly, acc.annualReturnPct ?? 0, acc.goalAmount)
          : null;
        return (
          <button key={acc.id} className="card account" onClick={() => setEditing(acc)}>
            <div className="account-head">
              <div>
                <span className="account-name">{acc.name || "Untitled"}</span>
                <span className="muted small account-meta">
                  <OwnerBadge owner={acc.owner} people={people} /> · {acc.type}
                </span>
              </div>
              <div className="account-balance">{money(acc.balance)}</div>
            </div>

            {monthly > 0 && (
              <div className="account-contrib muted small">
                {money(monthly)}/mo in
                {acc.sweepDay ? ` · sweeps on the ${ordinal(acc.sweepDay)}` : ""}
              </div>
            )}

            {acc.goalAmount && (
              <div className="goal">
                <div className="goal-bar">
                  <div className="goal-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-meta muted small">
                  <span>
                    {money(acc.balance)} of {money(acc.goalAmount)}
                  </span>
                  <span>
                    {months === 0
                      ? "Goal reached 🎉"
                      : months == null
                        ? "Add contributions to reach it"
                        : `${monthsToHuman(months)} · ~${dateInMonths(months)}`}
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}

      {editing && <AccountEditor account={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AccountEditor({ account, onClose }: { account: Account; onClose: () => void }) {
  const { people, accounts, saveAccount, deleteAccount } = useStore();
  const [draft, setDraft] = useState<Account>(account);
  const isNew = !accounts.some((a) => a.id === account.id);
  const set = <K extends keyof Account>(k: K, v: Account[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const monthly = monthlyContributionTotal(draft);
  const rtn = draft.annualReturnPct ?? 0;
  const in1y = futureValue(draft.balance, monthly, rtn, 12);
  const in5y = futureValue(draft.balance, monthly, rtn, 60);
  const months = draft.goalAmount
    ? monthsToGoal(draft.balance, monthly, rtn, draft.goalAmount)
    : null;

  const save = async () => {
    const prev = accounts.find((a) => a.id === draft.id);
    const balanceChanged = !prev || prev.balance !== draft.balance;
    await saveAccount({
      ...draft,
      balance: Number(draft.balance) || 0,
      balanceUpdatedAt: balanceChanged ? new Date().toISOString() : draft.balanceUpdatedAt,
    });
    onClose();
  };
  const remove = async () => {
    if (confirm(`Delete “${draft.name || "this account"}”?`)) {
      await deleteAccount(draft.id);
      onClose();
    }
  };

  const showProjection = draft.type === "savings" || draft.type === "investment";

  return (
    <Sheet
      title={isNew ? "Add account" : "Edit account"}
      onClose={onClose}
      footer={
        <div className="foot-row">
          {!isNew && (
            <button className="btn btn-danger-ghost" onClick={() => void remove()}>
              Delete
            </button>
          )}
          <button className="btn btn-primary grow" onClick={() => void save()}>
            Save
          </button>
        </div>
      }
    >
      <Field label="Name">
        <input
          className="input"
          value={draft.name}
          placeholder="e.g. Car Savings"
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>

      <div className="two-col">
        <Field label="Type">
          <Segmented<AccountType>
            value={draft.type}
            options={[
              { value: "savings", label: "Savings" },
              { value: "investment", label: "Invest" },
            ]}
            onChange={(v) => set("type", v)}
          />
        </Field>
        <Field label=" ">
          <Segmented<AccountType>
            value={draft.type}
            options={[
              { value: "checking", label: "Checking" },
              { value: "other", label: "Other" },
            ]}
            onChange={(v) => set("type", v)}
          />
        </Field>
      </div>

      <Field label="Owner">
        <OwnerPicker value={draft.owner} people={people} onChange={(v) => set("owner", v)} />
      </Field>

      <Field label="Current balance" hint="Update this whenever — projections build from here.">
        <input
          className="input"
          inputMode="decimal"
          value={draft.balance || ""}
          onChange={(e) => set("balance", Number(e.target.value) || 0)}
        />
      </Field>

      <div className="section-label">Monthly contributions</div>
      <div className="two-col">
        {people.map((p) => (
          <Field key={p.id} label={p.name}>
            <input
              className="input"
              inputMode="decimal"
              value={draft.contributions[p.id] ?? ""}
              placeholder="0"
              onChange={(e) =>
                set("contributions", { ...draft.contributions, [p.id]: Number(e.target.value) || 0 })
              }
            />
          </Field>
        ))}
      </div>
      <Field label="Sweep day" hint="Day of the month the contribution lands">
        <input
          className="input"
          inputMode="numeric"
          placeholder="—"
          value={draft.sweepDay ?? ""}
          onChange={(e) => set("sweepDay", e.target.value ? Number(e.target.value) : null)}
        />
      </Field>

      {showProjection && (
        <>
          <div className="section-label">Goal & growth</div>
          <div className="two-col">
            <Field label="Goal amount">
              <input
                className="input"
                inputMode="decimal"
                placeholder="—"
                value={draft.goalAmount ?? ""}
                onChange={(e) => set("goalAmount", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Annual return %" hint="e.g. 7 for mutual funds">
              <input
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={draft.annualReturnPct ?? ""}
                onChange={(e) =>
                  set("annualReturnPct", e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
          </div>

          <div className="projection">
            <div className="proj-row">
              <span>Contributing</span>
              <strong>{money(monthly)}/mo</strong>
            </div>
            <div className="proj-row">
              <span>Projected in 1 year</span>
              <strong>{moneyCents(in1y)}</strong>
            </div>
            <div className="proj-row">
              <span>Projected in 5 years</span>
              <strong>{moneyCents(in5y)}</strong>
            </div>
            {draft.goalAmount != null && (
              <div className="proj-row proj-goal">
                <span>Reach {money(draft.goalAmount)}</span>
                <strong>
                  {months === 0
                    ? "Reached"
                    : months == null
                      ? "Not on track"
                      : `${monthsToHuman(months)} (~${dateInMonths(months)})`}
                </strong>
              </div>
            )}
          </div>
        </>
      )}

      <Field label="Notes">
        <textarea
          className="input"
          rows={2}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
    </Sheet>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
