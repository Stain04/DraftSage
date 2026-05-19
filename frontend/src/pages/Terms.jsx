import React from "react";

export default function Terms() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-navy-400 text-sm mb-8">Last updated: May 2026</p>

        <div className="space-y-6 text-navy-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using DraftSage ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. Description of Service</h2>
            <p>DraftSage is a web-based SaaS application that provides AI-powered draft analysis for League of Legends. DraftSage is not affiliated with, endorsed by, or sponsored by Riot Games. League of Legends is a trademark of Riot Games, Inc. DraftSage uses Riot Games' public API under Riot's developer agreement.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. Subscriptions</h2>
            <p>DraftSage offers a free tier and a Pro subscription plan. Pro subscriptions are billed monthly or yearly and auto-renew unless cancelled. You may cancel your subscription at any time from your account dashboard.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. User Accounts</h2>
            <p>You are responsible for maintaining the security of your account. You must provide accurate information when registering. We reserve the right to suspend accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Prohibited Use</h2>
            <p>You may not use DraftSage to: (a) violate any applicable law; (b) attempt to gain unauthorized access to any system; (c) resell or redistribute the Service without permission; (d) use automated bots to abuse the free tier.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Intellectual Property</h2>
            <p>All content, branding, and code belonging to DraftSage is owned by DraftSage. Game data, champion names, and related assets belong to Riot Games and are used under their developer policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranty of any kind. We do not guarantee that AI-generated draft suggestions will result in wins. Use at your own discretion.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, DraftSage shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">9. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">10. Contact</h2>
            <p>For questions about these Terms, contact us at: <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
