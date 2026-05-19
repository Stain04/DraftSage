import React from "react";

export default function Terms() {
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
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>Terms of Service</h1>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "32px" }}>Last updated: May 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>1. Acceptance of Terms</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>By accessing or using DraftSage ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>2. Description of Service</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>DraftSage is a web-based SaaS application that provides AI-powered draft analysis for League of Legends. DraftSage is not affiliated with, endorsed by, or sponsored by Riot Games. League of Legends is a trademark of Riot Games, Inc. DraftSage uses Riot Games' public API under Riot's developer agreement.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>3. Subscriptions</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>DraftSage offers a free tier and a Pro subscription plan. Pro subscriptions are billed monthly or yearly and auto-renew unless cancelled. You may cancel your subscription at any time from your account dashboard.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>4. User Accounts</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>You are responsible for maintaining the security of your account. You must provide accurate information when registering. We reserve the right to suspend accounts that violate these terms.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>5. Prohibited Use</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>You may not use DraftSage to: (a) violate any applicable law; (b) attempt to gain unauthorized access to any system; (c) resell or redistribute the Service without permission; (d) use automated bots to abuse the free tier.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>6. Intellectual Property</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>All content, branding, and code belonging to DraftSage is owned by DraftSage. Game data, champion names, and related assets belong to Riot Games and are used under their developer policy.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>7. Disclaimer of Warranties</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>The Service is provided "as is" without warranty of any kind. We do not guarantee that AI-generated draft suggestions will result in wins. Use at your own discretion.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>8. Limitation of Liability</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>To the maximum extent permitted by law, DraftSage shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>9. Changes to Terms</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>10. Contact</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>For questions about these Terms, contact us at: <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a></p>
          </div>

        </div>

        <div style={{ marginTop: "32px", display: "flex", gap: "24px", fontSize: "13px", color: "#8899cc" }}>
          <a href="/privacy" style={{ color: "#8899cc" }}>Privacy Policy</a>
          <a href="/refund"  style={{ color: "#8899cc" }}>Refund Policy</a>
        </div>
      </div>
    </div>
  );
}
