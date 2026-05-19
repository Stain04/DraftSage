import React from "react";

export default function Privacy() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0b1128",
      paddingTop: "80px",
      paddingLeft: "32px",
      paddingRight: "32px",
      paddingBottom: "64px",
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff"
    }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>Privacy Policy</h1>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "32px" }}>Last updated: May 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>1. Information We Collect</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, marginBottom: "8px" }}>We collect the following information when you use DraftSage:</p>
            <ul style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li>Email address (for account creation and login)</li>
              <li>Summoner name (optional, provided during registration)</li>
              <li>Draft history (saved for Pro users only)</li>
              <li>Usage data (number of daily Engine runs, stored locally in your browser)</li>
              <li>Payment information (processed by Paddle — we never store card details)</li>
            </ul>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>2. How We Use Your Information</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>We use your information to: provide and improve the Service, manage your account and subscription, send transactional emails (e.g. account confirmation), and enforce our Terms of Service.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>3. Data Storage</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>User account data is stored securely in Supabase (a managed Postgres database). We use industry-standard encryption for data at rest and in transit.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>4. Third-Party Services</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, marginBottom: "8px" }}>We use the following third-party services:</p>
            <ul style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li><strong style={{ color: "#fff" }}>Supabase</strong> — authentication and database</li>
              <li><strong style={{ color: "#fff" }}>Paddle</strong> — payment processing and subscription management</li>
              <li><strong style={{ color: "#fff" }}>Groq</strong> — AI inference (draft analysis)</li>
              <li><strong style={{ color: "#fff" }}>Riot Games API</strong> — game data (champion stats, matchup data)</li>
            </ul>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>5. Cookies</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>We use session cookies required for authentication. We do not use advertising or tracking cookies.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>6. Data Retention</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>7. Your Rights</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a> to exercise these rights.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>8. Contact</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>For privacy-related questions: <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a></p>
          </div>

        </div>

        <div style={{ marginTop: "32px", display: "flex", gap: "24px", fontSize: "13px" }}>
          <a href="/terms"  style={{ color: "#8899cc" }}>Terms of Service</a>
          <a href="/refund" style={{ color: "#8899cc" }}>Refund Policy</a>
        </div>
      </div>
    </div>
  );
}
