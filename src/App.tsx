import { useState } from "react";
import { useStore } from "./state/store";
import { Home } from "./components/Home";
import { Bills } from "./components/Bills";
import { Accounts } from "./components/Accounts";
import { Settings } from "./components/Settings";

type Tab = "home" | "bills" | "accounts" | "settings";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "bills", label: "Bills", icon: "🧾" },
  { id: "accounts", label: "Accounts", icon: "🏦" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const { settings, people, currentPersonId, setCurrentPersonId, repoKind } = useStore();
  const me = people.find((p) => p.id === currentPersonId) ?? people[0];

  return (
    <div className="app">
      <header className="app-head">
        <div className="brand">
          <span className="brand-mark">$</span>
          <span>{settings.householdName}</span>
          {repoKind === "local" && <span className="pill-demo">demo</span>}
        </div>
        <button
          className="who"
          onClick={() => {
            const others = people.filter((p) => p.id !== me?.id);
            if (others[0]) setCurrentPersonId(others[0].id);
          }}
          title="Switch who you are"
        >
          <span className="who-dot" style={{ background: me?.color }} />
          {me?.name}
        </button>
      </header>

      <main className="app-main">
        {tab === "home" && <Home />}
        {tab === "bills" && <Bills />}
        {tab === "accounts" && <Accounts />}
        {tab === "settings" && <Settings />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " tab-on" : "")}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
