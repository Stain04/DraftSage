import React from "react";

export default function Refund() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-navy-400 text-sm mb-8">Last updated: May 2026</p>

        <div className="space-y-6 text-navy-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">Overview</h2>
            <p>We want you to be satisfied with DraftSage Pro. This policy outlines when and how refunds are issued.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">14-Day Money-Back Guarantee</h2>
            <p>If you are not satisfied with your Pro subscription, you may request a full refund within <strong className="text-white">14 days</strong> of your initial purchase. No questions asked.</p>
            <p className="mt-2">To request a refund, email us at <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a> with your account email and we will process the refund within 5 business days.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">Renewals</h2>
            <p>Subscription renewals (monthly or yearly) are generally non-refundable after the renewal date. If you believe a renewal charge was made in error, contact us within 48 hours and we will review your case.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">Cancellations</h2>
            <p>You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period — you retain Pro access until then. No partial refunds are issued for unused days in the current period.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">How to Cancel</h2>
            <p>Log in to DraftSage → Dashboard → Manage Subscription. You can also email us at <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a> and we will cancel on your behalf.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
            <p>For refund requests or questions: <a href="mailto:support@draftsage.pro" className="text-gold hover:underline">support@draftsage.pro</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
