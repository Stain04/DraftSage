import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import api from "../api/geminiApi";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "";

export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Restore session — Supabase persists it in localStorage automatically
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
    const { data } = await api.post("/api/auth/register", {
      email, password, summoner_name: summonerName,
    });
    return data;
  };

  const signIn = async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("draftsage_token", data.access_token);

    if (supabase) {
      // Hand the real Supabase session to the client so auth.uid() works
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      // onAuthStateChange fires above and calls setUser with the full user object
    } else {
      // Fallback: no Supabase client — use what the backend returned
      setUser(data.user);
    }
    return data;
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    await api.post("/api/auth/logout").catch(() => {});
    localStorage.removeItem("draftsage_token");
    setUser(null);
  };

  // Read admin/pro flags directly from user_metadata (stored in the JWT)
  // This works whether via Supabase client session or backend login response
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
