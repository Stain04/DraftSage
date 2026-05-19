import React from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowLeft } from "lucide-react";

export default function Refund() {
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
          <RefreshCw size={28} color="#C8A951" />
          <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "2rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
            Refund Policy
          </h1>
        </div>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "2.5rem" }}>Last updated: May 2026</p>

        {/* 14-day guarantee highlight box */}
        <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>🛡️</div>
          <div>
            <p style={{ color: "#4ade80", fontWeight: "700", fontSize: "0.95rem", margin: "0 0 4px 0" }}>14-Day Money-Back Guarantee</p>
            <p style={{ color: "#aabbdd", fontSize: "0.85rem", lineHeight: "1.6", margin: 0 }}>
              Not happy? Email us within 14 days of your first purchase and we'll refund every cent — no questions asked.
            </p>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Overview</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              We want you to be satisfied with DraftSage Pro. This policy outlines when and how refunds are issued.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>14-Day Money-Back Guarantee</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: "0 0 0.5rem 0" }}>
              If you are not satisfied with your Pro subscription, you may request a full refund within{" "}
              <strong style={{ color: "#ffffff" }}>14 days</strong> of your initial purchase. No questions asked.
            </p>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              To request a refund, email us at{" "}
              <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951", textDecoration: "none" }}>support@draftsage.pro</a>{" "}
              with your account email and we will process the refund within 5 business days.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Renewals</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              Subscription renewals (monthly or yearly) are generally non-refundable after the renewal date. If you believe a renewal charge was made in error, contact us within 48 hours and we will review your case.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Cancellations</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period — you retain Pro access until then. No partial refunds are issued for unused days in the current period.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>How to Cancel</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              Log in to DraftSage → Dashboard → Manage Subscription. You can also email us at{" "}
              <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951", textDecoration: "none" }}>support@draftsage.pro</a>{" "}
              and we will cancel on your behalf.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Contact</h2>
            <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
              For refund requests or questions:{" "}
              <a href="mailto:support@draftsage.pro" style={{ color: "#C8A951", textDecoration: "none" }}>support@draftsage.pro</a>
            </p>
          </section>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem", fontSize: "13px" }}>
          <Link to="/terms"   style={{ color: "#8899cc", textDecoration: "none" }}>Terms of Service</Link>
          <Link to="/privacy" style={{ color: "#8899cc", textDecoration: "none" }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
