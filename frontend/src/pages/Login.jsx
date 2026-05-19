import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Sword, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params   = new URLSearchParams(location.search);
  const redirect = params.get("redirect") || "/draft";
  const reason   = params.get("reason");

  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [summoner, setSummoner] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email address.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent! Check your inbox.");
      setMode("login");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields.");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else {
        await signUp(email, password, summoner);
        toast.success("Account created! Check your email to confirm.");
      }
      navigate(redirect);
    } catch (err) {
      toast.error(err.message || err.response?.data?.detail || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-bounce-in relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold">
            <Sword size={20} className="text-navy-900" />
          </div>
          <span className="font-display text-2xl font-bold text-gold">DraftSage</span>
        </div>

        <div className="card-gold rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />

          {/* Session-invalidated banner */}
          {reason === "session_invalidated" && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg border border-magenta/40 bg-magenta/10 animate-fade-in">
              <AlertTriangle size={16} className="text-magenta flex-shrink-0 mt-0.5" />
              <div className="text-xs text-navy-100 leading-relaxed">
                <p className="font-semibold text-magenta mb-0.5">Signed in elsewhere</p>
                <p className="text-navy-300">
                  Your account was used to sign in on another device. Only one active session is allowed per account — please sign in again.
                </p>
              </div>
            </div>
          )}

          {/* Login-required banner (redirected from Draft Board) */}
          {reason === "login_required" && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg border border-gold/40 bg-gold/10 animate-fade-in">
              <AlertTriangle size={16} className="text-gold flex-shrink-0 mt-0.5" />
              <div className="text-xs text-navy-100 leading-relaxed">
                <p className="font-semibold text-gold mb-0.5">Sign in to use the Engine</p>
                <p className="text-navy-300">
                  A free account is required to run draft analysis. It's free forever — sign in or create one in seconds.
                </p>
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-xl overflow-hidden border border-navy-600 mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all capitalize
                  ${mode === m ? "bg-gold/15 text-gold border-gold/30" : "text-navy-400 hover:text-white"}`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Forgot password mode */}
          {mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-navy-400 mb-2">Enter your email and we'll send you a reset link.</p>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                             focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  : "Send Reset Link"}
              </button>
              <p className="text-center text-xs text-navy-500">
                <button type="button" onClick={() => setMode("login")} className="text-gold hover:underline">
                  ← Back to Sign In
                </button>
              </p>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                           focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                           focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Summoner name (register only) */}
            {mode === "register" && (
              <div className="relative animate-fade-in">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  value={summoner}
                  onChange={(e) => setSummoner(e.target.value)}
                  placeholder="Riot summoner name (optional)"
                  className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                             focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </button>

            {/* Forgot password (login mode only) */}
            {mode === "login" && (
              <p className="text-center text-xs text-navy-500">
                <button type="button" onClick={() => setMode("forgot")} className="text-gold hover:underline">
                  Forgot your password?
                </button>
              </p>
            )}
          </form>
          )}

          <p className="text-center text-xs text-navy-500 mt-5">
            {mode === "login" ? "Don't have an account? " : mode === "register" ? "Already have an account? " : ""}
            {mode !== "forgot" && (
              <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-gold hover:underline">
                {mode === "login" ? "Create one free" : "Sign in"}
              </button>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-navy-600 mt-4">
          By continuing, you agree to DraftSage's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
