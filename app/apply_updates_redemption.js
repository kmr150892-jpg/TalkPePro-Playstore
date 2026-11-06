/**
 * TalkPe Pro - patch B (keeps "Reward" and "Redemption" wording everywhere).
 *
 * Run from the project root (D:\TalkPe-Playstore):
 *     node apply_updates_redemption.js
 *
 * Do NOT run apply_updates.js (the payout-wording version) together with this one.
 *
 * Safety:
 *  - Every edit must match EXACTLY once. If any edit fails, NOTHING is written.
 *  - Line endings (CRLF / LF) are preserved.
 *  - No logic, styles or animations are touched. Use `git diff` to review.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || '.';

const EXTRA_FAQ_BLOCK = `// 🆕 EXTRA HOST FAQS (rewards to INR clarity + Play UGC rules)
const HOST_FAQS_EXTRA = [
    {
        id: 9,
        question: "How do rewards become INR?",
        answer: "Rewards you receive from video calls and gifts are converted to INR (100 rewards = ₹1) and shown in your wallet. When your balance reaches ₹500, you can submit a redemption request from the wallet. Our admin team verifies it and transfers the approved amount to your bank account outside the app."
    },
    {
        id: 10,
        question: "How do I report a user?",
        answer: "Open Support Hub and tap Trust & Safety Desk to fill the in-app report form. During calls you can also use Block & Report. Our team verifies reports and takes action if a violation is found. You can track your report under MY REPORTS in the Support Hub."
    },
    {
        id: 11,
        question: "What content is not allowed on my profile and Spotlight?",
        answer: "Nudity, sexual content, harassment, hate speech, threats, violence, illegal content, scams, fake profiles, sharing personal contact details, and asking users to pay outside the app are not allowed. Violating content may be removed, and accounts may be warned, restricted or banned."
    }
];
const ALL_FAQS = [...FAQS, ...HOST_FAQS_EXTRA];

`;

const PRESS_ANCHOR = '// ✨ PRESS-SCALE BUTTON (ovvoru tap-kum springy premium feel)';

const JOBS = [
  {
    file: 'app/expert/support.tsx',
    edits: [
      // FAQ 1: add "transferred outside the app + notified" (redemption wording kept)
      ['FAQ1 answer end', `Please make sure your redemption details and ID document`, `After verification, our admin team transfers the approved amount to your bank account outside the app, and you are notified in the app. Please make sure your redemption details and ID document`],

      // FAQ 2: Spotlight
      ['FAQ2 question', `How does the Profile Spotlight (Algorithm Boost) work?`, `How does Profile Spotlight work?`],
      ['FAQ2 answer',
        `Profile Spotlight pushes your profile up to get more genuine call requests. Note: All Spotlight videos are subject to strict UGC (User Generated Content) guidelines. Users can report videos, which triggers a mandatory 24-hour admin review to ensure platform safety.`,
        `Spotlight lets you showcase short videos on your profile so more users can discover you. Videos must follow our content rules (no nudity, sexual content, harassment, hate speech, threats or contact details). Users can report videos. Reports are sent to our admin team, who verify them and take action if a video violates the rules.`],

      // FAQ 3: remove KYC / Aadhaar-PAN claim, keep redemption wording
      ['FAQ3 answer',
        `submission of a valid ID proof (Aadhaar or PAN) is mandatory for KYC compliance.`,
        `submission of a valid ID proof is required.`],

      // FAQ 4: remove unverified "interaction rating" point
      ['FAQ4 rating line',
        `3. Maintain a positive interaction rating with users.\\n4. Keep your app updated to the latest Play Store version.`,
        `3. Keep your app updated to the latest Play Store version.`],

      // FAQ 5: video calls + gifts, rewards converted to INR
      ['FAQ5 question', `How do Broadcast & Audio/Video Calls work?`, `How do calls and gift rewards work?`],
      ['FAQ5 answer',
        `You earn rewards directly based on your Tier's 'Rewards per Minute' rate during active audio or video sessions. If a user disconnects due to poor network, our system automatically calculates your earnings up to the exact second of disconnection to protect your legitimate time spent.`,
        `You earn rewards based on your Tier's 'Rewards per Minute' rate during active video calls (if a user turns the camera off, the call continues as an audio call). You also earn rewards from gifts you receive. Rewards from calls and gifts are converted to INR and shown in your wallet. If you think a call was calculated incorrectly, contact support@talkpepro.com.`],

      // FAQ 6: restricted account / delete
      ['FAQ6 answer',
        `Accounts are restricted automatically for strict policy violations (e.g., sharing personal numbers, inappropriate behavior). Contact support to appeal. Additionally, as per data safety rules, you retain full rights to use the 'Delete Account' option to permanently wipe your data at any time.`,
        `Accounts may be restricted for policy violations (for example sharing personal numbers or inappropriate behavior). Contact support to appeal. You can also delete your account anytime: tap the Delete Account button at the bottom of the Home screen. This deletes your account and personal data; limited redemption and transaction records may be kept where the law requires.`],

      // FAQ 7
      ['FAQ7 answer',
        `Our Trust & Safety team reviews all reports within 24 hours to enforce permanent platform bans on violators.`,
        `Our team verifies reports and takes action if a violation is found. We aim to review within 24 hours.`],

      // FAQ 8
      ['FAQ8 answer',
        `rate every 30 minutes. Rest assured, for your absolute privacy, TalkPe Pro operates under a Zero Recording Policy—private calls are NEVER recorded.`,
        `rate.`],

      // 3 new FAQs
      ['Insert extra FAQs', PRESS_ANCHOR, EXTRA_FAQ_BLOCK + PRESS_ANCHOR],
      ['Use ALL_FAQS (count)', `{FAQS.length} ANSWERS`, `{ALL_FAQS.length} ANSWERS`],
      ['Use ALL_FAQS (map)', `{FAQS.map((faq, index) => (`, `{ALL_FAQS.map((faq, index) => (`],

      // hero + quick fact (24h claim softened)
      ['Hero title', `24/7 COMMAND RESOLUTION`, `SUPPORT & SAFETY`],
      ['Hero desc', `Our dedicated administrator team is strictly monitoring platform integrity and is ready to assist you.`, `Our team reviews your questions and reports and will get back to you.`],
      ['Fact REVIEW TARGET', `SAFETY REVIEW</Text>`, `REVIEW TARGET</Text>`],

      // email subject + trust & safety wording
      ['Email subject', `subject=TalkPe%20Pro%20Consultant%20General%20Support`, `subject=TalkPe%20Pro%20Host%20Support`],
      ['T&S card line', `In-App Report • Reviewed in 24 Hrs`, `In-App Report • Reviewed by our team`],
      ['Report success text', `Our Trust & Safety team will review your report within 24 hours.`, `Our Trust & Safety team aims to review your report within 24 hours.`],
      ['Report form header', `Confidential • Reviewed within 24 hours`, `Trust & Safety • We aim to review within 24 hours`],
      ['Report info box',
        `Your report goes directly to our Trust & Safety team and is handled confidentially. Please do not include passwords, OTPs or banking details.`,
        `Your report goes to our Trust & Safety team. Please do not include passwords, OTPs or banking details.`],
      ['Report user placeholder', `placeholder="User name or ID (if known)"`, `placeholder="Pick from recent contacts or enter user name / ID"`],
    ],
  },

  {
    file: 'app/expert/legal.tsx',
    edits: [
      // Terms: align to Reward / Redemption wording used in the app
      ['Terms 2 - gifts', `credited to hosts as earnings under these Terms.`, `credited to hosts as rewards under these Terms.`],
      ['Terms 4 - title', `4. Host Earnings & Payouts`, `4. Host Rewards & Redemption`],
      ['Terms 4 - rewards to INR',
        `Earnings are shown in INR in the host wallet at rates set by TalkPe, which may change from time to time.`,
        `Hosts receive rewards for these interactions. Rewards are converted to INR (100 rewards = ₹1) and shown in the host wallet at rates set by TalkPe, which may change from time to time.`],
      ['Terms 4 - redemption request',
        `a host can submit a payout request in the app with bank details. A transaction charge of ₹100 applies per payout, and a valid ID proof is required for payout requests above ₹5,000.`,
        `a host can submit a redemption request in the app with bank details. A transaction charge of ₹100 applies per redemption, and a valid ID proof is required for redemption requests above ₹5,000.`],
      ['Terms 4 - games', `Games are never a source of earnings.`, `Games are never a source of rewards.`],
      ['Terms 4 - fraud', `Payout requests found to involve fraud`, `Redemption requests found to involve fraud`],
      ['Terms 4 - taxes', `taxes that apply to their earnings.`, `taxes that apply to the amounts they redeem.`],
      ['Terms 5 - report status (no push notification claim)',
        `The person who submitted the report is notified in the app when its status changes.`,
        `You can see the status of your report in the Support Hub in the app.`],
      ['Terms 10 - pending requests', `Pending payout requests of accounts terminated`, `Pending redemption requests of accounts terminated`],

      // Privacy: same wording
      ['Privacy 2', `submitted with a payout request.`, `submitted with a redemption request.`],
      ['Privacy 3', `process payout requests`, `process redemption requests`],
      ['Privacy 7 - title', `7. Host Payout & Verification Data`, `7. Host Redemption & Verification Data`],
      ['Privacy 7 - text', `Hosts who submit a payout request provide bank details`, `Hosts who submit a redemption request provide bank details`],
      ['Privacy 7 - approved', `to send the approved payout.`, `to send the approved amount.`],
      ['Privacy 7 - records', `limited payout and transaction records.`, `limited redemption and transaction records.`],
      ['Privacy 9 - records', `limited payout and transaction records after deletion`, `limited redemption and transaction records after deletion`],
    ],
  },

  {
    file: 'app/expert/components/WalletSystem.tsx',
    edits: [
      // only two clarity lines in the "How rewards work" box; all Reward/Redemption labels stay
      ['Info line 1',
        `Rewards are earned through your creator activity on TalkPe Pro.`,
        `Rewards are earned from video calls and gifts you receive. They are converted to INR in this wallet (100 rewards = ₹1), and you can redeem the INR once your balance reaches ₹500.`],
      ['Info line 2',
        `Every redemption request is reviewed and verified before it is processed.`,
        `Every redemption request is reviewed and verified before it is processed. Once approved, the amount is transferred to your bank account outside the app.`],
    ],
  },
];

// ---------------------------------------------------------------------------
// ENGINE: all-or-nothing
// ---------------------------------------------------------------------------
const results = [];
const failures = [];

for (const job of JOBS) {
  const full = path.join(ROOT, job.file);
  if (!fs.existsSync(full)) {
    failures.push(`${job.file}: file not found (run this from the project root)`);
    continue;
  }
  const raw = fs.readFileSync(full, 'utf8');
  const crlf = raw.includes('\r\n');
  let src = raw.replace(/\r\n/g, '\n');

  for (const [label, oldStr, newStr] of job.edits) {
    const count = src.split(oldStr).length - 1;
    if (count !== 1) {
      failures.push(`${job.file} -> "${label}": expected 1 match, found ${count}`);
      continue;
    }
    src = src.replace(oldStr, () => newStr);
  }

  results.push({ full, text: crlf ? src.replace(/\n/g, '\r\n') : src, edits: job.edits.length, file: job.file });
}

if (failures.length) {
  console.log('\n❌ NOTHING WAS CHANGED. These edits did not match:\n');
  failures.forEach((f) => console.log('  - ' + f));
  console.log('\nSend this list to Claude - the file probably has a small difference from the version that was pasted.\n');
  process.exit(1);
}

results.forEach((r) => {
  fs.writeFileSync(r.full, r.text, 'utf8');
  console.log(`✅ ${r.file}  (${r.edits} edits applied)`);
});
console.log('\nDone. Review with: git --no-pager diff --stat\n');