import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Sword, CheckCircle } from "lucide-react";
import { supabase } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [ready, setReady]             = useState(false);
  const [done, setDone]               = useState(false);

  // Supabase automatically parses the recovery token from the URL hash
  // and fires an onAuthStateChange event with event === "PASSWORD_RECOVERY"
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Also check if there's already a session (token was already parsed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
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

          {done ? (
            /* Success state */
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-sm text-navy-400">Redirecting you to sign in…</p>
            </div>
          ) : !ready ? (
            /* Waiting for Supabase to parse the token */
            <div className="text-center py-4">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-navy-400">Verifying reset link…</p>
            </div>
          ) : (
            /* Reset form */
            <>
              <h2 className="font-display text-xl font-bold text-white mb-1">Set New Password</h2>
              <p className="text-sm text-navy-400 mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
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

                {/* Confirm password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-10 py-3 bg-navy-800 border border-navy-600 rounded-xl text-sm text-white placeholder-navy-500
                               focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <p className={`text-xs ${
                    password.length < 6 ? "text-red-400" :
                    password.length < 10 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {password.length < 6 ? "Too short (min 6 characters)" :
                     password.length < 10 ? "Moderate strength" : "Strong password ✓"}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                    : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
