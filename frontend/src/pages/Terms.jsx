import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

export default function Terms() {
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
          <Shield size={28} color="#C8A951" />
          <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "2rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
            Terms of Service
          </h1>
        </div>
        <p style={{ color: "#8899cc", fontSize: "13px", marginBottom: "2.5rem" }}>Last updated: May 2026</p>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          {[
            {
              title: "1. Acceptance of Terms",
              body: "By accessing or using DraftSage (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.",
            },
            {
              title: "2. Description of Service",
              body: "DraftSage is a web-based SaaS application that provides AI-powered draft analysis for League of Legends. DraftSage is not affiliated with, endorsed by, or sponsored by Riot Games. League of Legends is a trademark of Riot Games, Inc. DraftSage uses Riot Games' public API under Riot's developer agreement.",
            },
            {
              title: "3. Subscriptions",
              body: "DraftSage offers a free tier and a Pro subscription plan. Pro subscriptions are billed monthly or yearly and auto-renew unless cancelled. You may cancel your subscription at any time from your account dashboard.",
            },
            {
              title: "4. User Accounts",
              body: "You are responsible for maintaining the security of your account. You must provide accurate information when registering. We reserve the right to suspend accounts that violate these terms.",
            },
            {
              title: "5. Prohibited Use",
              body: "You may not use DraftSage to: (a) violate any applicable law; (b) attempt to gain unauthorized access to any system; (c) resell or redistribute the Service without permission; (d) use automated bots to abuse the free tier.",
            },
            {
              title: "6. Intellectual Property",
              body: "All content, branding, and code belonging to DraftSage is owned by DraftSage. Game data, champion names, and related assets belong to Riot Games and are used under their developer policy.",
            },
            {
              title: "7. Disclaimer of Warranties",
              body: 'The Service is provided "as is" without warranty of any kind. We do not guarantee that AI-generated draft suggestions will result in wins. Use at your own discretion.',
            },
            {
              title: "8. Limitation of Liability",
              body: "To the maximum extent permitted by law, DraftSage shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service.",
            },
            {
              title: "9. Changes to Terms",
              body: "We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.",
            },
            {
              title: "10. Contact",
              body: null,
              contact: "support@draftsage.pro",
            },
          ].map((section, i) => (
            <section key={i}>
              <h2 style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>{section.title}</h2>
              {section.body && (
                <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>{section.body}</p>
              )}
              {section.contact && (
                <p style={{ color: "#aabbdd", fontSize: "0.875rem", lineHeight: "1.7", margin: 0 }}>
                  For questions about these Terms, contact us at:{" "}
                  <a href={`mailto:${section.contact}`} style={{ color: "#C8A951", textDecoration: "none" }}>
                    {section.contact}
                  </a>
                </p>
              )}
            </section>
          ))}
        </div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem", fontSize: "13px" }}>
          <Link to="/privacy" style={{ color: "#8899cc", textDecoration: "none" }}>Privacy Policy</Link>
          <Link to="/refund"  style={{ color: "#8899cc", textDecoration: "none" }}>Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
