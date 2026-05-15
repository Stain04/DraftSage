import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Users, ShieldCheck, Zap, Trash2, Crown,
  RefreshCw, Search, ToggleLeft, ToggleRight, AlertTriangle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();

  const [users, setUsers]           = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch]         = useState("");
  const [updating, setUpdating]     = useState(null); // userId being updated

  // ── Fetch all profiles ──────────────────────────────────────────────────────
  const loadUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, summoner_name, is_pro, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users.");
    } else {
      // Also pull emails from auth — merge via id
      setUsers(data || []);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  // ── Toggle Pro ───────────────────────────────────────────────────────────────
  const togglePro = async (userId, currentVal) => {
    setUpdating(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: !currentVal })
      .eq("id", userId);
    if (error) toast.error("Failed to update.");
    else {
      toast.success(`Pro ${!currentVal ? "granted" : "revoked"}.`);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_pro: !currentVal } : u)
      );
    }
    setUpdating(null);
  };

  // ── Toggle Admin ─────────────────────────────────────────────────────────────
  const toggleAdmin = async (userId, currentVal) => {
    if (userId === user?.id) return toast.error("Cannot change your own admin status.");
    setUpdating(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentVal })
      .eq("id", userId);
    if (error) toast.error("Failed to update.");
    else {
      toast.success(`Admin ${!currentVal ? "granted" : "revoked"}.`);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_admin: !currentVal } : u)
      );
    }
    setUpdating(null);
  };

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login?redirect=/admin" replace />;

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertTriangle size={48} className="text-red-400" />
      <h1 className="font-display text-2xl font-bold text-white">Access Denied</h1>
      <p className="text-navy-400 text-sm">You don't have admin privileges.</p>
    </div>
  );

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalUsers = users.length;
  const proUsers   = users.filter((u) => u.is_pro).length;
  const adminUsers = users.filter((u) => u.is_admin).length;

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) =>
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    (u.summoner_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={22} className="text-gold" />
              <h1 className="font-display text-3xl font-bold text-white">Admin Panel</h1>
            </div>
            <p className="text-navy-400 text-sm">Manage users and site settings</p>
          </div>
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-navy-600 text-navy-400 hover:border-gold/40 hover:text-gold transition-all text-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card rounded-2xl p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-navy-400" />
              <span className="text-sm text-navy-400">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="card-gold rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} className="text-gold" />
              <span className="text-sm text-navy-400">Pro Users</span>
            </div>
            <p className="text-3xl font-bold text-gold">{proUsers}</p>
          </div>
          <div className="card rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-accent-blue" />
              <span className="text-sm text-navy-400">Admins</span>
            </div>
            <p className="text-3xl font-bold text-accent-blue">{adminUsers}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">All Users</h2>
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID or summoner…"
                className="pl-8 pr-4 py-2 bg-navy-800 border border-navy-600 rounded-xl text-xs text-white placeholder-navy-500
                           focus:outline-none focus:border-gold/40 transition-all w-56"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-navy-500 py-10 text-sm">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-3 px-2 text-navy-500 font-medium text-xs">User ID</th>
                    <th className="text-left py-3 px-2 text-navy-500 font-medium text-xs">Summoner</th>
                    <th className="text-left py-3 px-2 text-navy-500 font-medium text-xs">Joined</th>
                    <th className="text-center py-3 px-2 text-navy-500 font-medium text-xs">Pro</th>
                    <th className="text-center py-3 px-2 text-navy-500 font-medium text-xs">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-navy-800 hover:bg-navy-800/40 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3 px-2">
                        <span className="font-mono text-xs text-navy-400 truncate block max-w-[140px]">
                          {u.id}
                        </span>
                        {u.id === user?.id && (
                          <span className="text-xs text-gold">(you)</span>
                        )}
                      </td>

                      {/* Summoner */}
                      <td className="py-3 px-2 text-white">
                        {u.summoner_name || <span className="text-navy-600 italic">—</span>}
                      </td>

                      {/* Joined */}
                      <td className="py-3 px-2 text-navy-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>

                      {/* Pro toggle */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => togglePro(u.id, u.is_pro)}
                          disabled={updating === u.id}
                          className="flex items-center justify-center mx-auto transition-all hover:scale-110 disabled:opacity-50"
                          title={u.is_pro ? "Revoke Pro" : "Grant Pro"}
                        >
                          {updating === u.id ? (
                            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                          ) : u.is_pro ? (
                            <ToggleRight size={24} className="text-gold" />
                          ) : (
                            <ToggleLeft size={24} className="text-navy-600" />
                          )}
                        </button>
                      </td>

                      {/* Admin toggle */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleAdmin(u.id, u.is_admin)}
                          disabled={updating === u.id || u.id === user?.id}
                          className="flex items-center justify-center mx-auto transition-all hover:scale-110 disabled:opacity-50"
                          title={u.is_admin ? "Revoke Admin" : "Grant Admin"}
                        >
                          {u.is_admin ? (
                            <ToggleRight size={24} className="text-accent-blue" />
                          ) : (
                            <ToggleLeft size={24} className="text-navy-600" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
