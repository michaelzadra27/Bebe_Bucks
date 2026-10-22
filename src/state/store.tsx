import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRepo } from "../data/repo";
import type { AppData } from "../data/seed";
import type { Account, Bill, HouseholdSettings, Person } from "../lib/types";

interface Store extends AppData {
  loading: boolean;
  error: string | null;
  repoKind: "local" | "supabase";
  /** Which person is "me" on this device. */
  currentPersonId: string;
  setCurrentPersonId: (id: string) => void;
  saveBill: (b: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  saveAccount: (a: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  savePerson: (p: Person) => Promise<void>;
  saveSettings: (s: HouseholdSettings) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const CURRENT_KEY = "bebe-bucks-current-person";

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepo(), []);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPersonId, setCurrentPersonIdState] = useState<string>(
    () => localStorage.getItem(CURRENT_KEY) ?? "me",
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await repo.load();
      setData(d);
      if (!d.people.some((p) => p.id === currentPersonId) && d.people[0]) {
        setCurrentPersonIdState(d.people[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repo, currentPersonId]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentPersonId = useCallback((id: string) => {
    localStorage.setItem(CURRENT_KEY, id);
    setCurrentPersonIdState(id);
  }, []);

  // Optimistic local update + persist.
  const patch = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => (prev ? fn(prev) : prev));
  }, []);

  const saveBill = useCallback(
    async (b: Bill) => {
      patch((d) => ({ ...d, bills: upsert(d.bills, b) }));
      await repo.saveBill(b);
    },
    [patch, repo],
  );
  const deleteBill = useCallback(
    async (id: string) => {
      patch((d) => ({ ...d, bills: d.bills.filter((x) => x.id !== id) }));
      await repo.deleteBill(id);
    },
    [patch, repo],
  );
  const saveAccount = useCallback(
    async (a: Account) => {
      patch((d) => ({ ...d, accounts: upsert(d.accounts, a) }));
      await repo.saveAccount(a);
    },
    [patch, repo],
  );
  const deleteAccount = useCallback(
    async (id: string) => {
      patch((d) => ({ ...d, accounts: d.accounts.filter((x) => x.id !== id) }));
      await repo.deleteAccount(id);
    },
    [patch, repo],
  );
  const savePerson = useCallback(
    async (p: Person) => {
      patch((d) => ({ ...d, people: upsert(d.people, p) }));
      await repo.savePerson(p);
    },
    [patch, repo],
  );
  const saveSettings = useCallback(
    async (s: HouseholdSettings) => {
      patch((d) => ({ ...d, settings: s }));
      await repo.saveSettings(s);
    },
    [patch, repo],
  );

  const value: Store | null = data && {
    ...data,
    loading,
    error,
    repoKind: repo.kind,
    currentPersonId,
    setCurrentPersonId,
    saveBill,
    deleteBill,
    saveAccount,
    deleteAccount,
    savePerson,
    saveSettings,
    reload,
  };

  if (loading && !data) {
    return <div className="screen-center muted">Loading…</div>;
  }
  if (error && !data) {
    return (
      <div className="screen-center">
        <p className="danger">Couldn’t load data.</p>
        <p className="muted small">{error}</p>
        <button className="btn" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <Ctx.Provider value={value as Store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within AppProvider");
  return s;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}
