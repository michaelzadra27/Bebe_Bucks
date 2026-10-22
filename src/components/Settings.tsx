import { useState } from "react";
import { useStore } from "../state/store";
import { Field } from "./ui";

export function Settings() {
  const {
    settings,
    people,
    saveSettings,
    savePerson,
    repoKind,
    currentPersonId,
    setCurrentPersonId,
  } = useStore();
  const [name, setName] = useState(settings.householdName);

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Settings</h1>
      </div>

      <section className="card">
        <div className="section-label">Household</div>
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveSettings({ householdName: name.trim() || "Bebe Bucks" })}
          />
        </Field>
      </section>

      <section className="card">
        <div className="section-label">People</div>
        {people.map((p) => (
          <div key={p.id} className="person-row">
            <input
              type="color"
              value={p.color}
              onChange={(e) => void savePerson({ ...p, color: e.target.value })}
              aria-label={`${p.name} color`}
            />
            <input
              className="input grow"
              value={p.name}
              onChange={(e) => void savePerson({ ...p, name: e.target.value })}
            />
            <button
              className={"btn btn-sm" + (p.id === currentPersonId ? " btn-primary" : "")}
              onClick={() => setCurrentPersonId(p.id)}
            >
              {p.id === currentPersonId ? "This is me" : "Set as me"}
            </button>
          </div>
        ))}
        <p className="field-hint">Tap a color or name to edit. “This is me” controls whose view you see.</p>
      </section>

      <section className="card">
        <div className="section-label">Data</div>
        {repoKind === "local" ? (
          <>
            <p className="small">
              Running in <strong>local demo mode</strong> — data is saved only in this browser on this
              device. To sync between both of your phones, connect a free Supabase project.
            </p>
            <ol className="small steps">
              <li>Create a project at supabase.com.</li>
              <li>
                Run <code>supabase/schema.sql</code> in its SQL editor.
              </li>
              <li>
                Copy <code>.env.example</code> to <code>.env</code> and paste in the project URL + anon
                key.
              </li>
              <li>Restart the app — it switches to shared cloud mode automatically.</li>
            </ol>
            <button
              className="btn btn-danger-ghost"
              onClick={() => {
                if (confirm("Reset all demo data back to the starter example?")) {
                  localStorage.removeItem("bebe-bucks-data-v1");
                  location.reload();
                }
              }}
            >
              Reset demo data
            </button>
          </>
        ) : (
          <p className="small">
            Connected to <strong>Supabase</strong> — changes sync between both of your devices.
          </p>
        )}
      </section>

      <section className="card">
        <div className="section-label">Install on your iPhone</div>
        <p className="small">
          Open this page in Safari, tap the Share button, then <strong>Add to Home Screen</strong>.
          It’ll get an app icon and open full-screen like a native app.
        </p>
      </section>

      <p className="muted small center" style={{ padding: "8px 0 24px" }}>
        Bebe Bucks · v0.1
      </p>
    </div>
  );
}
