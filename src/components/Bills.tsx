import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { annualAverage, billAmountForMonth, percentsFor, sharesFor, thisMonth } from "../lib/finance";
import { UTILITY_PRESETS } from "../data/utilityHistory";
import { money, moneyCents } from "../lib/format";
import { Field, OwnerBadge, OwnerPicker, Segmented, Sheet } from "./ui";
import type { Bill } from "../lib/types";

function blankBill(): Bill {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "Other",
    total: 0,
    payer: "joint",
    dueBucket: 1,
    dueDay: null,
    splitType: "even",
    customShares: {},
    estimateMode: "flat",
    monthly: {},
    includeInHouseholdTotal: true,
    active: true,
    notes: "",
    sortOrder: 99,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Bills() {
  const { bills, people } = useStore();
  const [editing, setEditing] = useState<Bill | null>(null);

  const groups = useMemo(() => {
    const sorted = [...bills].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return {
      1: sorted.filter((b) => b.dueBucket === 1),
      15: sorted.filter((b) => b.dueBucket === 15),
    };
  }, [bills]);

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Bills</h1>
        <button className="btn btn-primary" onClick={() => setEditing(blankBill())}>
          + Add
        </button>
      </div>

      {([1, 15] as const).map((bucket) => (
        <div key={bucket} className="bill-group">
          <h3 className="group-head">Due the {bucket === 1 ? "1st" : "15th"}</h3>
          {groups[bucket].length === 0 && <p className="empty small">Nothing here yet.</p>}
          {groups[bucket].map((bill) => (
            <button
              key={bill.id}
              className={"row" + (bill.active ? "" : " row-off")}
              onClick={() => setEditing(bill)}
            >
              <div className="row-main">
                <span className="row-name">
                  {bill.name || "Untitled"}
                  {bill.estimateMode === "seasonal" && <span className="tag">seasonal</span>}
                </span>
                <span className="row-sub muted small">
                  {bill.category} · paid by <OwnerBadge owner={bill.payer} people={people} />
                  {bill.splitType === "custom" ? " · custom split" : " · 50/50"}
                </span>
              </div>
              <div className="row-amount">{money(billAmountForMonth(bill, thisMonth()))}</div>
            </button>
          ))}
        </div>
      ))}

      {editing && <BillEditor bill={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BillEditor({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { people, bills, saveBill, deleteBill } = useStore();
  // Normalize older records that predate the seasonal fields.
  const [draft, setDraft] = useState<Bill>({
    ...bill,
    estimateMode: bill.estimateMode ?? "flat",
    monthly: bill.monthly ?? {},
  });
  const isNew = !bills.some((b) => b.id === bill.id);
  const set = <K extends keyof Bill>(k: K, v: Bill[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const editorAmount =
    draft.estimateMode === "seasonal" ? annualAverage(draft.monthly) : Number(draft.total) || 0;
  const shares = sharesFor(draft, people, editorAmount);
  const percents = percentsFor(draft, people, editorAmount);
  const customSum = people.reduce((s, p) => s + (draft.customShares[p.id] ?? 0), 0);

  const save = async () => {
    const total =
      draft.estimateMode === "seasonal" ? annualAverage(draft.monthly) : Number(draft.total) || 0;
    await saveBill({ ...draft, total });
    onClose();
  };
  const remove = async () => {
    if (confirm(`Delete “${draft.name || "this bill"}”?`)) {
      await deleteBill(draft.id);
      onClose();
    }
  };

  return (
    <Sheet
      title={isNew ? "Add bill" : "Edit bill"}
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
          placeholder="e.g. PG&E"
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>

      <Field label="Category">
        <input
          className="input"
          value={draft.category}
          onChange={(e) => set("category", e.target.value)}
        />
      </Field>

      <Field label="Amount">
        <Segmented
          value={draft.estimateMode}
          options={[
            { value: "flat", label: "Same each month" },
            { value: "seasonal", label: "Varies by month" },
          ]}
          onChange={(v) => set("estimateMode", v)}
        />
      </Field>

      {draft.estimateMode === "seasonal" ? (
        <SeasonalGrid monthly={draft.monthly} onChange={(m) => set("monthly", m)} />
      ) : (
        <Field label="Monthly estimate">
          <input
            className="input"
            inputMode="decimal"
            value={draft.total || ""}
            onChange={(e) => set("total", Number(e.target.value) || 0)}
          />
        </Field>
      )}

      <Field label="Who pays the vendor">
        <OwnerPicker value={draft.payer} people={people} onChange={(v) => set("payer", v)} />
      </Field>

      <div className="two-col">
        <Field label="We pay on">
          <Segmented
            value={draft.dueBucket}
            options={[
              { value: 1, label: "The 1st" },
              { value: 15, label: "The 15th" },
            ]}
            onChange={(v) => set("dueBucket", v)}
          />
        </Field>
        <Field label="Actual due day" hint="Optional, for reference">
          <input
            className="input"
            inputMode="numeric"
            placeholder="—"
            value={draft.dueDay ?? ""}
            onChange={(e) => set("dueDay", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      <Field label="Split">
        <Segmented
          value={draft.splitType}
          options={[
            { value: "even", label: "50 / 50" },
            { value: "custom", label: "Custom $" },
          ]}
          onChange={(v) => set("splitType", v)}
        />
      </Field>

      {draft.splitType === "even" ? (
        <p className="split-note">
          Each pays <strong>{moneyCents(editorAmount / 2)}</strong>
          {draft.estimateMode === "seasonal" ? " on average (varies by month)" : ""}.
        </p>
      ) : (
        <div className="custom-split">
          {people.map((p) => (
            <Field key={p.id} label={`${p.name}'s share`}>
              <div className="share-input">
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.customShares[p.id] ?? ""}
                  onChange={(e) =>
                    set("customShares", {
                      ...draft.customShares,
                      [p.id]: Number(e.target.value) || 0,
                    })
                  }
                />
                <span className="pct">{percents[p.id] ?? 0}%</span>
              </div>
            </Field>
          ))}
          <p className={"split-note" + (Math.abs(customSum - editorAmount) > 0.01 ? " warn" : "")}>
            Shares total {moneyCents(customSum)} of {moneyCents(editorAmount)}
            {Math.abs(customSum - editorAmount) > 0.01 && " — doesn’t match the bill amount"}
          </p>
        </div>
      )}

      <label className="toggle">
        <input
          type="checkbox"
          checked={draft.includeInHouseholdTotal}
          onChange={(e) => set("includeInHouseholdTotal", e.target.checked)}
        />
        <span>
          Count full amount in household total
          <span className="field-hint">
            Turn off for one-way bills (e.g. a partner’s insurance) so only the shares count toward
            who owes whom.
          </span>
        </span>
      </label>

      <label className="toggle">
        <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
        <span>Active</span>
      </label>

      <Field label="Notes">
        <textarea
          className="input"
          rows={2}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <p className="muted small" style={{ marginTop: 4 }}>
        This bill is currently <OwnerBadge owner={draft.payer} people={people} />’s to pay; shares:{" "}
        {people.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ", "}
            {p.name} {moneyCents(shares[p.id] ?? 0)}
          </span>
        ))}
        .
      </p>
    </Sheet>
  );
}

function SeasonalGrid({
  monthly,
  onChange,
}: {
  monthly: Record<string, number>;
  onChange: (m: Record<string, number>) => void;
}) {
  const [paste, setPaste] = useState("");
  const avg = annualAverage(monthly);
  const now = thisMonth();

  const setMonth = (m: number, v: string) => {
    const next = { ...monthly };
    if (v === "") delete next[String(m)];
    else next[String(m)] = Number(v) || 0;
    onChange(next);
  };

  const applyPaste = () => {
    const nums = (paste.match(/-?\d+(?:\.\d+)?/g) ?? []).slice(0, 12).map(Number);
    if (!nums.length) return;
    const next: Record<string, number> = {};
    nums.forEach((n, i) => {
      next[String(i + 1)] = n;
    });
    onChange(next);
    setPaste("");
  };

  return (
    <div className="seasonal">
      <div className="preset-row">
        <span className="muted small">Load history:</span>
        {UTILITY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-sm"
            onClick={() => onChange({ ...p.monthly })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="seasonal-grid">
        {MONTHS.map((label, i) => {
          const m = i + 1;
          return (
            <label key={m} className={"sg-cell" + (m === now ? " sg-now" : "")}>
              <span>{label}</span>
              <input
                className="input sg-input"
                inputMode="decimal"
                placeholder="—"
                value={monthly[String(m)] ?? ""}
                onChange={(e) => setMonth(m, e.target.value)}
              />
            </label>
          );
        })}
      </div>
      <details className="seasonal-paste">
        <summary>Quick-fill from 12 numbers</summary>
        <textarea
          className="input"
          rows={2}
          placeholder="Paste 12 amounts, Jan→Dec (commas, spaces, or new lines)"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button className="btn btn-sm" type="button" onClick={applyPaste}>
          Fill months
        </button>
      </details>
      <p className="split-note">
        Average <strong>{moneyCents(avg)}</strong>/mo · this month{" "}
        <strong>{moneyCents(monthly[String(now)] ?? 0)}</strong>
      </p>
    </div>
  );
}
