import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1128", paddingTop: "6rem", paddingBottom: "4rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        {/* Back link */}
        <Link
          to="/"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#8899cc", fontSize: "13px", marginBottom: "2rem", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to DraftSage
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Lock size={28} color="#C8A951" />
          <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "2rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
            Privacy Policy
          </h1>
        </div>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "2.5rem" }}>Last updated: May 2026</p>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>1. Information We Collect</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", marginBottom: "0.5rem" }}>We collect the following information when you use DraftSage:</p>
            <ul style={{ color: "#8899cc", fontSize: "0.875rem", lineHeight: "1.8", paddingLeft: "1.25rem", margin: 0 }}>
              <li>Email address (for account creation and login)</li>
              <li>Summoner name (optional, provided during registration)</li>
              <li>Draft history (saved for Pro users only)</li>
              <li>Usage data (number of daily Engine runs, stored locally in your browser)</li>
              <li>Payment information (processed by Paddle — we never store card details)</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>2. How We Use Your Information</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              We use your information to: provide and improve the Service, manage your account and subscription, send transactional emails (e.g. account confirmation), and enforce our Terms of Service.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>3. Data Storage</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              User account data is stored securely in Supabase (a managed Postgres database). We use industry-standard encryption for data at rest and in transit.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>4. Third-Party Services</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", marginBottom: "0.5rem" }}>We use the following third-party services:</p>
            <ul style={{ color: "#8899cc", fontSize: "0.875rem", lineHeight: "1.8", paddingLeft: "1.25rem", margin: 0 }}>
              <li><span style={{ color: "#ffffff", fontWeight: "600" }}>Supabase</span> — authentication and database</li>
              <li><span style={{ color: "#ffffff", fontWeight: "600" }}>Paddle</span> — payment processing and subscription management</li>
              <li><span style={{ color: "#ffffff", fontWeight: "600" }}>Groq</span> — AI inference (draft analysis)</li>
              <li><span style={{ color: "#ffffff", fontWeight: "600" }}>Riot Games API</span> — game data (champion stats, matchup data)</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>5. Cookies</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              We use session cookies required for authentication. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>6. Data Retention</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>7. Your Rights</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              You have the right to access, correct, or delete your personal data. Contact us at{" "}
              <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951", textDecoration: "none" }}>support@draftsage.pro</a>{" "}
              to exercise these rights.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>8. Contact</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              For privacy-related questions:{" "}
              <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951", textDecoration: "none" }}>support@draftsage.pro</a>
            </p>
          </section>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem", fontSize: "13px" }}>
          <Link to="/terms"  style={{ color: "#8899cc", textDecoration: "none" }}>Terms of Service</Link>
          <Link to="/refund" style={{ color: "#8899cc", textDecoration: "none" }}>Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
