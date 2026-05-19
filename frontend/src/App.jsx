// v2.1 — routes: home, draft, pricing, login, dashboard, reset-password, admin, terms, privacy, refund
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import EmailWatermark from "./components/EmailWatermark";
import Home from "./pages/Home";
import Draft from "./pages/Draft";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-navy-900">
          <Navbar />
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/draft"          element={<Draft />} />
            <Route path="/pricing"        element={<Pricing />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin"          element={<Admin />} />
            <Route path="/terms"          element={<Terms />} />
            <Route path="/privacy"        element={<Privacy />} />
            <Route path="/refund"         element={<Refund />} />
          </Routes>
          <EmailWatermark />

          {/* ── Sitewide footer — legal links (required for Paddle domain approval) ── */}
          <footer style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            background: "#080e22",
          }}>
            <span style={{ color: "#4a5578", fontSize: "12px" }}>
              © 2026 DraftSage. Not affiliated with Riot Games.
            </span>
            <div style={{ display: "flex", gap: "20px" }}>
              <a href="/terms"   style={{ color: "#6677aa", fontSize: "12px", textDecoration: "none" }}>Terms of Service</a>
              <a href="/privacy" style={{ color: "#6677aa", fontSize: "12px", textDecoration: "none" }}>Privacy Policy</a>
              <a href="/refund"  style={{ color: "#6677aa", fontSize: "12px", textDecoration: "none" }}>Refund Policy</a>
            </div>
          </footer>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111C4E",
              color: "#fff",
              border: "1px solid rgba(200,169,81,0.3)",
              borderRadius: "12px",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#C8A951", secondary: "#111C4E" } },
            error:   { iconTheme: { primary: "#f87171", secondary: "#111C4E" } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
