import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AuthState =
  | { status: "local" } // no Supabase configured — no login needed
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session; email: string };

/** Tracks the Supabase auth session (or reports local mode). */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(
    isSupabaseConfigured ? { status: "loading" } : { status: "local" },
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(toState(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(toState(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

function toState(session: Session | null): AuthState {
  if (session?.user) {
    return { status: "signed-in", session, email: session.user.email ?? "" };
  }
  return { status: "signed-out" };
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
