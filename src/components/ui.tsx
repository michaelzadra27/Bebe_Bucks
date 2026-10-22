import { useEffect, type ReactNode } from "react";
import type { Owner, Person } from "../lib/types";

/** A bottom sheet modal used for all add/edit forms. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={"seg" + (o.value === value ? " seg-on" : "")}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Choose an owner/payer: each person, or Joint. */
export function OwnerPicker({
  value,
  people,
  onChange,
  includeJoint = true,
}: {
  value: Owner;
  people: Person[];
  onChange: (v: Owner) => void;
  includeJoint?: boolean;
}) {
  const options: Array<{ value: Owner; label: string }> = [
    ...people.map((p) => ({ value: p.id, label: p.name })),
    ...(includeJoint ? [{ value: "joint" as Owner, label: "Joint" }] : []),
  ];
  return <Segmented value={value} options={options} onChange={onChange} />;
}

export function OwnerBadge({ owner, people }: { owner: Owner; people: Person[] }) {
  if (owner === "joint") return <span className="badge badge-joint">Joint</span>;
  const p = people.find((x) => x.id === owner);
  return (
    <span className="badge" style={{ background: (p?.color ?? "#555") + "22", color: p?.color }}>
      {p?.name ?? "?"}
    </span>
  );
}
