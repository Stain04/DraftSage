import React from "react";

export default function Refund() {
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
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>Refund Policy</h1>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "32px" }}>Last updated: May 2026</p>

        {/* 14-day guarantee callout */}
        <div style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start"
        }}>
          <span style={{ fontSize: "22px" }}>🛡️</span>
          <div>
            <p style={{ color: "#4ade80", fontWeight: 700, fontSize: "14px", margin: "0 0 4px 0" }}>14-Day Money-Back Guarantee</p>
            <p style={{ color: "#aabbdd", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>Not happy? Email us within 14 days of your first purchase and we'll refund every cent — no questions asked.</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>Overview</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>We want you to be satisfied with DraftSage Pro. This policy outlines when and how refunds are issued.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>14-Day Money-Back Guarantee</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, marginBottom: "8px" }}>If you are not satisfied with your Pro subscription, you may request a full refund within <strong style={{ color: "#fff" }}>14 days</strong> of your initial purchase. No questions asked.</p>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>To request a refund, email us at <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a> with your account email and we will process the refund within 5 business days.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>Renewals</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>Subscription renewals (monthly or yearly) are generally non-refundable after the renewal date. If you believe a renewal charge was made in error, contact us within 48 hours and we will review your case.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>Cancellations</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period — you retain Pro access until then. No partial refunds are issued for unused days in the current period.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>How to Cancel</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>Log in to DraftSage → Dashboard → Manage Subscription. You can also email us at <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a> and we will cancel on your behalf.</p>
          </div>

          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>Contact</h2>
            <p style={{ color: "#aabbdd", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>For refund requests or questions: <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951" }}>support@draftsage.pro</a></p>
          </div>

        </div>

        <div style={{ marginTop: "32px", display: "flex", gap: "24px", fontSize: "13px" }}>
          <a href="/terms"   style={{ color: "#8899cc" }}>Terms of Service</a>
          <a href="/privacy" style={{ color: "#8899cc" }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
