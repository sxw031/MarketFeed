/**
 * Success story talking points, keyed by industry vertical (see
 * strategyEngine.js `getIndustryContext`/`INDUSTRY_CONTEXT`).
 *
 * IMPORTANT — data provenance:
 * The entries below are illustrative, anonymized industry benchmarks used
 * as placeholders until real customer data is available. Each entry is
 * tagged with `verified: false` and `source: 'illustrative_benchmark'` so
 * callers/UI can distinguish them from vetted, real anonymized case studies.
 *
 * To swap in real (anonymized) customer case studies once available,
 * without touching code:
 *   1. Create a JSON file shaped like `{ "<Vertical Name>": { customer,
 *      before, after, impact, timeframe, verified: true, source: 'case_study' } }`.
 *   2. Point `SUCCESS_STORIES_OVERRIDES_PATH` (env var) at that file.
 *   3. Restart the server — `getSuccessStories()` merges the overrides on
 *      top of the illustrative defaults below, per-vertical.
 */

const fs = require('fs');

const SUCCESS_STORIES = {
  'Banking & Financial Services': { customer: 'a leading APAC bank', before: 'relied on email and branch visits for customer communication, resulting in 12% engagement', after: 'deployed omnichannel messaging (WhatsApp + RCS + SMS fallback) for transactions', impact: '45% reduction in inbound support calls, 89% message read rate, $2.3M annual savings', timeframe: '8 weeks to full deployment' },
  'Super App & Mobility': { customer: 'a ride-hailing super app in Southeast Asia', before: 'push notifications had 35% delivery rate, causing missed rides and driver frustration', after: 'implemented SMS + in-app messaging with smart fallback for critical ride updates', impact: 'Missed ride rate dropped from 8% to 1.2%, driver satisfaction up 40%, support tickets down 55%', timeframe: '4 weeks integration' },
  'E-commerce & Cloud': { customer: 'a cross-border e-commerce platform', before: 'order notifications via email had 18% open rate, causing "where is my order" support flood', after: 'WhatsApp order tracking with proactive updates and two-way support', impact: 'WISMO tickets dropped 72%, customer satisfaction up 35%, repeat purchase rate increased 28%', timeframe: '6 weeks to live across 12 markets' },
  'Cryptocurrency & Fintech': { customer: 'a top-5 global crypto exchange', before: 'security OTPs had 25% failure rate in high-fraud regions, causing account lockouts and $5M monthly in support costs', after: 'implemented adaptive verification (silent verify + SMS OTP + voice OTP) with real-time fraud scoring', impact: 'OTP success rate reached 99.2%, fraud attempts blocked increased 300%, support tickets dropped 70%', timeframe: '6 weeks to deploy globally' },
  'E-commerce & Fintech': { customer: 'a cashback and payments platform in APAC', before: 'cashback notifications via push had 22% delivery rate, users missed time-sensitive deals', after: 'omnichannel notifications with smart timing (push + SMS + WhatsApp)', impact: 'Deal redemption rate increased 85%, MAU grew 23%, merchant satisfaction improved from 3.8 to 4.7', timeframe: '5 weeks integration' },
  'Consumer Finance': { customer: 'a consumer lending company in SEA with 5M+ borrowers', before: 'payment reminders via SMS had 40% read rate, resulting in 18% late payment rate', after: 'deployed WhatsApp payment reminders with one-tap payment links', impact: 'On-time payment rate improved from 82% to 94%, collections costs dropped 45%', timeframe: '4 weeks to pilot, 8 weeks to full portfolio' },
  'Telecommunications': { customer: 'a European telecom operator', before: 'enterprise messaging was fragmented across 4 platforms with no unified analytics', after: 'consolidated on CPaaS with white-label RCS for enterprise clients', impact: 'Enterprise messaging revenue grew 180%, client onboarding time reduced from 6 weeks to 3 days', timeframe: '12 weeks for full platform migration' },
  'Aviation & Travel': { customer: 'a major Asian airline', before: 'flight disruption notifications reached only 60% of affected passengers via email/app push', after: 'multi-channel alerts (SMS + WhatsApp + RCS) with automated rebooking links', impact: 'Passenger reach rate hit 97%, call center volume during disruptions dropped 65%', timeframe: '5 weeks integration' },
  'Travel & Hospitality': { customer: 'a leading online travel agency', before: 'booking confirmations via email had 45% open rate, causing check-in confusion', after: 'WhatsApp booking confirmations with interactive itinerary and real-time updates', impact: 'Confirmation engagement reached 94%, no-show rate dropped 40%, upsell revenue increased 22%', timeframe: '4 weeks to deploy' },
  'Technology & Gaming': { customer: 'a global gaming company', before: 'account security relied on email-based 2FA with 15% failure rate', after: 'silent number verification + SMS OTP fallback for seamless authentication', impact: 'Authentication success rate reached 99.5%, account takeover incidents dropped 85%', timeframe: '3 weeks integration' },
  'Technology & Media': { customer: 'a social media platform', before: 'creator notifications via in-app only, 40% of creators missed time-sensitive opportunities', after: 'multi-channel creator alerts (SMS + push + email) with preference management', impact: 'Creator response rate improved 3x, platform engagement hours increased 25%', timeframe: '6 weeks' },
  'Digital Banking': { customer: 'a digital-first bank in Asia', before: 'transaction alerts via push had 50% delivery rate, causing fraud detection delays', after: 'real-time SMS + WhatsApp transaction alerts with one-tap fraud reporting', impact: 'Fraud reporting speed improved 80%, false positive resolution time cut from 48h to 2h', timeframe: '4 weeks' },
  'E-commerce & Retail': { customer: 'a fast-growing e-commerce marketplace', before: 'promotional messages via email had 12% open rate, flash sales underperformed', after: 'RCS rich media promotions with carousel product displays and buy buttons', impact: 'Flash sale conversion increased 340%, unsubscribe rate dropped 60%', timeframe: '3 weeks to first campaign' },
  'Super App & Fintech': { customer: 'a Southeast Asian fintech super app', before: 'payment confirmations via push had unreliable delivery, causing user anxiety', after: 'instant SMS confirmations + WhatsApp receipts with smart channel selection', impact: 'User trust score improved 45%, payment dispute rate dropped 70%', timeframe: '4 weeks' },
  // --- Stories for newly tracked verticals / category fallbacks ---
  'Digital Payments': { customer: 'a global digital wallet and payments provider', before: 'transaction confirmations via email had 30% open rate, driving disputes and chargebacks', after: 'real-time SMS + push confirmations with one-tap dispute resolution links', impact: 'Chargeback rate dropped 38%, buyer trust score up 27%, support contact rate down 44%', timeframe: '5 weeks integration' },
  'Enterprise Software & Creative Cloud': { customer: 'a global SaaS and creative-tools provider', before: 'subscription renewal reminders via email alone had 20% open rate, driving avoidable churn', after: 'multi-channel renewal and license alerts (email + SMS + in-app) with one-tap renew', impact: 'Involuntary churn dropped 31%, renewal conversion up 19%, support tickets down 26%', timeframe: '6 weeks to roll out globally' },
  'Consumer Brands & Retail': { customer: 'a global sportswear and membership-app brand', before: 'product drop and restock alerts relied on push only, missing 45% of interested members', after: 'omnichannel drop alerts (push + SMS + WhatsApp) with waitlist and priority access links', impact: 'Drop-day conversion increased 52%, membership app engagement up 33%', timeframe: '4 weeks to first campaign' },
  'Enterprise AI & Data Analytics': { customer: 'a mission-critical enterprise/government data analytics platform', before: 'operational alerts were siloed across internal tools, delaying incident response', after: 'unified, verified operator alerting (SMS + voice escalation) for critical system events', impact: 'Incident acknowledgment time cut 65%, on-call escalation errors eliminated', timeframe: '8 weeks for phased rollout' },
  'Media & Entertainment': { customer: 'a global media and entertainment conglomerate', before: 'streaming and park-visit alerts via app push alone reached only 55% of subscribers', after: 'multi-channel lifecycle messaging (push + email + SMS) for renewals, releases, and visit reminders', impact: 'Subscriber win-back rate up 29%, renewal rate improved 14%, support calls down 22%', timeframe: '6 weeks to deploy across properties' },
  'Social Media & Community': { customer: 'a large social/community platform', before: 'account verification relied on email only, with 20% failure/abandonment in high-risk regions', after: 'adaptive verification (SMS OTP + silent verify) plus creator/moderator alerting', impact: 'Verification success rate reached 98%, fake-account signups dropped 55%, moderator response time improved 40%', timeframe: '5 weeks to deploy' },
  'Auto & Energy': { customer: 'a global EV and clean-energy manufacturer', before: 'service and firmware-update notices via app push were missed by 40% of owners', after: 'omnichannel delivery, service, and OTA update alerts (SMS + push + email)', impact: 'Missed-service-appointment rate dropped 48%, OTA update adoption up 35%', timeframe: '4 weeks integration' },
  'Aerospace & Defense': { customer: 'a commercial aerospace and launch-services company', before: 'mission and supply-chain status updates were manual and phone-tree based, slowing coordination', after: 'automated, verified status alerts (SMS + voice) across mission control and supplier network', impact: 'Coordination response time cut 60%, missed-update incidents eliminated', timeframe: '10 weeks for mission-critical rollout' },
  'Logistics': { customer: 'a major logistics and last-mile delivery operator', before: 'delivery status updates via email had 25% open rate, flooding call centers with "where is my package" calls', after: 'proactive SMS + WhatsApp tracking with two-way delivery-window rescheduling', impact: 'WISMO calls dropped 58%, on-time delivery satisfaction up 24%', timeframe: '5 weeks across major hubs' },
  'AI & Foundation Models': { customer: 'a fast-growing AI foundation-model provider', before: 'API outage and rate-limit notices were buried in a status-page blog, leaving developers blindsided', after: 'real-time developer alerts (email + SMS + webhook-triggered messaging) for usage, billing, and incident status', impact: 'Developer-reported "surprise" outages dropped 70%, support ticket volume down 33%', timeframe: '3 weeks integration' }
};

// Default provenance metadata applied to every illustrative story above.
const DEFAULT_METADATA = { verified: false, source: 'illustrative_benchmark' };

function withDefaultMetadata(stories) {
  return Object.fromEntries(
    Object.entries(stories).map(([vertical, story]) => [vertical, { ...DEFAULT_METADATA, ...story }])
  );
}

let cachedStories = null;

/**
 * Returns the success-story map, merging in real (anonymized) case studies
 * from SUCCESS_STORIES_OVERRIDES_PATH (a JSON file) when configured, so
 * verified customer stories take precedence over illustrative benchmarks
 * without any code change. Overrides are re-read on demand (not cached)
 * so an operator can update the file without restarting; falls back to
 * defaults if the file is missing, unreadable, or invalid JSON.
 */
function getSuccessStories() {
  if (!cachedStories) cachedStories = withDefaultMetadata(SUCCESS_STORIES);

  const overridesPath = process.env.SUCCESS_STORIES_OVERRIDES_PATH;
  if (!overridesPath) return cachedStories;

  try {
    if (!fs.existsSync(overridesPath)) return cachedStories;
    const raw = fs.readFileSync(overridesPath, 'utf8');
    const overrides = JSON.parse(raw);
    return { ...cachedStories, ...withDefaultMetadata(overrides) };
  } catch (err) {
    console.warn('[successStories] Failed to load SUCCESS_STORIES_OVERRIDES_PATH:', err.message);
    return cachedStories;
  }
}

module.exports = { getSuccessStories, SUCCESS_STORIES };
