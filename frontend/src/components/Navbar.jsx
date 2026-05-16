import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sword, ChevronDown, LogOut, User, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform relative overflow-hidden">
                <Sword size={18} className="text-navy-900 relative z-10" />
                <div className="absolute inset-0 bg-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity mix-blend-overlay" />
              </div>
              <div className="absolute -inset-0.5 rounded-lg bg-cyan/30 blur opacity-0 group-hover:opacity-60 transition-opacity -z-10" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-gradient-gold tracking-wider">DRAFTSAGE</span>
            <span className="hidden sm:block text-[10px] text-cyan font-mono font-medium mt-1 uppercase tracking-widest">v2</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/draft" className="text-navy-300 hover:text-gold transition-colors font-medium text-sm">
              Draft Board
            </Link>
            <Link to="/pricing" className="text-navy-300 hover:text-gold transition-colors font-medium text-sm">
              Pricing
            </Link>
            {user && (
              <Link to="/dashboard" className="text-navy-300 hover:text-gold transition-colors font-medium text-sm">
                Dashboard
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-navy-600 hover:border-gold/40 transition-all text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center">
                    <User size={12} className="text-navy-900" />
                  </div>
                  <span className="text-navy-200 max-w-[120px] truncate">{user.email}</span>
                  <ChevronDown size={14} className="text-navy-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-48 card border-gold/20 rounded-xl overflow-hidden shadow-gold animate-fade-in">
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-navy-200 hover:bg-navy-700 hover:text-gold transition-colors"
                    >
                      <User size={14} /> Dashboard
                    </Link>
                    <Link
                      to="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-gold hover:bg-navy-700 transition-colors"
                    >
                      <Zap size={14} /> Upgrade to Pro
                    </Link>
                    <div className="divider-gold my-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-navy-300 hover:text-gold text-sm font-medium transition-colors">
                  Sign In
                </Link>
                <Link to="/draft" className="btn-gold text-sm py-2 px-4">
                  Try Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
