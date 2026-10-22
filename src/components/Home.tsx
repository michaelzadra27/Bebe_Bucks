import { useState } from "react";
import { useStore } from "../state/store";
import { summarize, type BucketSummary } from "../lib/finance";
import { money, moneyCents } from "../lib/format";
import { OwnerBadge } from "./ui";
import type { DueBucket } from "../lib/types";

export function Home() {
  const { bills, people, currentPersonId } = useStore();
  const me = people.find((p) => p.id === currentPersonId) ?? people[0];

  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const all = summarize(bills, people, "all");
  const monthlyShareMe = all.perPerson[me?.id ?? ""]?.share ?? 0;

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>This month</h1>
        <span className="muted">{month}</span>
      </div>

      <div className="overview">
        <div className="ov-item">
          <span className="ov-label">Household bills</span>
          <span className="ov-value">{money(all.householdCashDue)}</span>
        </div>
        <div className="ov-item">
          <span className="ov-label">Your share</span>
          <span className="ov-value">{money(monthlyShareMe)}</span>
        </div>
      </div>

      <BucketCard bucket={1} summary={summarize(bills, people, 1)} />
      <BucketCard bucket={15} summary={summarize(bills, people, 15)} />

      {bills.filter((b) => b.active).length === 0 && (
        <p className="empty">No bills yet. Add some on the Bills tab.</p>
      )}
    </div>
  );
}

function BucketCard({ bucket, summary }: { bucket: DueBucket; summary: BucketSummary }) {
  const { people, currentPersonId } = useStore();
  const [open, setOpen] = useState(false);
  const me = people.find((p) => p.id === currentPersonId) ?? people[0];
  const ordinal = bucket === 1 ? "1st" : "15th";

  if (summary.bills.length === 0) return null;

  return (
    <section className="card bucket">
      <div className="bucket-head">
        <div>
          <h2>Due the {ordinal}</h2>
          <span className="muted small">
            {summary.bills.length} bill{summary.bills.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="bucket-amount">{money(summary.householdCashDue)}</div>
      </div>

      <SettleLine summary={summary} meId={me?.id} />

      <button className="link-row" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} breakdown {open ? "▲" : "▾"}
      </button>

      {open && (
        <ul className="bill-lines">
          {summary.bills.map(({ bill, shares, payer }) => (
            <li key={bill.id} className="bill-line">
              <div className="bill-line-main">
                <span className="bill-line-name">
                  {bill.name}
                  {!bill.includeInHouseholdTotal && (
                    <span className="tag" title="Only the shares count, not household cash">
                      share only
                    </span>
                  )}
                </span>
                <span className="bill-line-total">{moneyCents(bill.total)}</span>
              </div>
              <div className="bill-line-sub">
                <span className="muted small">
                  paid by <OwnerBadge owner={payer} people={people} />
                </span>
                <span className="shares">
                  {people.map((p, i) => (
                    <span key={p.id} className={p.id === me?.id ? "share-me" : ""}>
                      {i > 0 && " · "}
                      {p.name} {moneyCents(shares[p.id] ?? 0)}
                    </span>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SettleLine({ summary, meId }: { summary: BucketSummary; meId?: string }) {
  const { people } = useStore();
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "?";

  if (!summary.net) {
    return <div className="settle settle-even">You’re square — nobody owes anyone.</div>;
  }
  const { fromId, toId, amount } = summary.net;
  const iOwe = meId === fromId;
  const owedToMe = meId === toId;

  let text: string;
  let cls = "settle";
  if (iOwe) {
    text = `You owe ${name(toId)}`;
    cls += " settle-owe";
  } else if (owedToMe) {
    text = `${name(fromId)} owes you`;
    cls += " settle-owed";
  } else {
    text = `${name(fromId)} owes ${name(toId)}`;
  }

  return (
    <div className={cls}>
      <span>{text}</span>
      <strong>{moneyCents(amount)}</strong>
    </div>
  );
}
