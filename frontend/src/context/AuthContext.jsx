import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Sanitize env vars — strip BOM, zero-width chars, and any non-printable ASCII
// that can silently corrupt fetch/Axios URLs and cause "Invalid non-printable ASCII" errors.
const clean = (s) =>
  (s || "")
    .replace(/[\uFEFF\u200B-\u200D\u2060\u00AD]/g, "") // BOM + zero-width chars
    .replace(/[^\x20-\x7E]/g, "")                       // anything outside printable ASCII
    .trim();

const SUPABASE_URL = clean(process.env.REACT_APP_SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.REACT_APP_SUPABASE_KEY);

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.info("[AuthContext] Supabase URL:", SUPABASE_URL);
  // eslint-disable-next-line no-console
  console.info("[AuthContext] Supabase KEY length:", SUPABASE_KEY.length);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "[AuthContext] Missing Supabase credentials. Check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your .env file."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        localStorage.setItem("draftsage_token", session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        localStorage.setItem("draftsage_token", session.access_token);
      } else {
        setUser(null);
        localStorage.removeItem("draftsage_token");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, summonerName) => {
    // Sanitize inputs to prevent any stray hidden chars from leaking into the request
    const cleanEmail    = clean(email);
    const cleanSummoner = clean(summonerName);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { summoner_name: cleanSummoner, is_pro: false, is_admin: false } },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        summoner_name: cleanSummoner || null,
        is_pro: false,
        is_admin: false,
      });
    }
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      localStorage.setItem("draftsage_token", data.session.access_token);
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("draftsage_token");
    setUser(null);
  };

  const isAdmin = user?.user_metadata?.is_admin === true;
  const isPro   = user?.user_metadata?.is_pro   === true || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isPro, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
