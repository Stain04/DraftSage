import React from "react";

export default function Privacy() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-navy-400 text-sm mb-8">Last updated: May 2026</p>

        <div className="space-y-6 text-navy-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Information We Collect</h2>
            <p>We collect the following information when you use DraftSage:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-navy-300">
              <li>Email address (for account creation and login)</li>
              <li>Summoner name (optional, provided during registration)</li>
              <li>Draft history (saved for Pro users only)</li>
              <li>Usage data (number of daily Engine runs, stored locally in your browser)</li>
              <li>Payment information (processed by Paddle — we never store card details)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. How We Use Your Information</h2>
            <p>We use your information to: provide and improve the Service, manage your account and subscription, send transactional emails (e.g. account confirmation), and enforce our Terms of Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. Data Storage</h2>
            <p>User account data is stored securely in Supabase (a managed Postgres database). We use industry-standard encryption for data at rest and in transit.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-navy-300">
              <li><strong className="text-white">Supabase</strong> — authentication and database</li>
              <li><strong className="text-white">Paddle</strong> — payment processing and subscription management</li>
              <li><strong className="text-white">Groq</strong> — AI inference (draft analysis)</li>
              <li><strong className="text-white">Riot Games API</strong> — game data (champion stats, matchup data)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Cookies</h2>
            <p>We use session cookies required for authentication. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Contact</h2>
            <p>For privacy-related questions: <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
