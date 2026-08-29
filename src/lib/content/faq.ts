export interface FaqItem {
  question: string;
  answer: string;
  category: "Getting started" | "Money" | "Risk" | "Security" | "Fees";
}

/**
 * Shared between the FAQ page, the home page and the FAQPage structured data,
 * so the answers Google sees are byte-identical to the ones on screen. Google
 * treats a mismatch there as cloaking, and it is also just dishonest.
 */
export const FAQ_ITEMS: FaqItem[] = [
  {
    category: "Getting started",
    question: "What do I need to open an account?",
    answer:
      "An email address, a government photo ID, and a proof of address issued in the last three months. Verification is usually automatic and takes a few minutes; if a document needs manual review it is typically cleared within one business day.",
  },
  {
    category: "Getting started",
    question: "What is the minimum investment?",
    answer:
      "It depends on the mandate. Stable Yield starts at $500, Balanced Index at $2,500, Equity Momentum at $5,000, Digital Assets Growth at $10,000 and Quant Alpha at $50,000. You can hold more than one mandate at the same time.",
  },
  {
    category: "Getting started",
    question: "Can I invest from outside the United States or Europe?",
    answer:
      "In most cases yes. A small number of jurisdictions are restricted by sanctions or by local licensing rules. The account opening flow will tell you immediately if your country of residence is not supported, before you upload any documents.",
  },
  {
    category: "Money",
    question: "How do I fund my account?",
    answer:
      "By bank transfer in USD, EUR or GBP, or with BTC, ETH or USDT. You submit a deposit request in your dashboard, send the funds using the reference shown, and the amount is credited once our operations team matches the payment. Bank transfers usually clear within one business day; crypto after network confirmation.",
  },
  {
    category: "Money",
    question: "How long does a withdrawal take?",
    answer:
      "Withdrawal requests are reviewed on the same business day. Once approved, bank transfers settle in one to three business days depending on your bank and currency; crypto withdrawals are usually on-chain within a few hours. Capital inside a mandate that is still within its lock-up must be released first.",
  },
  {
    category: "Money",
    question: "Can I withdraw before the lock-up ends?",
    answer:
      "Yes, but an early exit fee applies — between 0.5% and 3% of the position depending on the mandate, shown on every plan page before you commit. Cash sitting in your account outside a mandate is never locked and can be withdrawn at any time.",
  },
  {
    category: "Risk",
    question: "Is my money guaranteed?",
    answer:
      "No. Every published return is a target, not a promise, and you can lose money — including, in the higher-risk mandates, a substantial part of what you put in. Any platform offering a guaranteed return on market exposure is either taking that risk onto its own balance sheet or is not being straight with you.",
  },
  {
    category: "Risk",
    question: "What happens in a severe market downturn?",
    answer:
      "Your position falls in value. Lower-risk mandates hold collateralised lending and short-dated instruments and are built to de-risk into cash rather than ride a decline. Higher-risk mandates are directional by design and have historically experienced drawdowns of 40% or more. That range is stated on each plan page precisely so it is not a surprise.",
  },
  {
    category: "Security",
    question: "Where are client assets held?",
    answer:
      "Fiat sits in designated client money accounts held separately from the company's own funds. Digital assets are held with a qualified custodian in cold storage with multi-party approval. Client assets are never used as collateral for the company's own positions.",
  },
  {
    category: "Security",
    question: "Can I see exactly what happened to my money?",
    answer:
      "Yes. Every movement is recorded as a balanced double-entry journal entry, and your dashboard shows each one with its reference, timestamp, amount and running balance. You can export the full history at any time.",
  },
  {
    category: "Fees",
    question: "What do you charge?",
    answer:
      "A management fee of 1% to 2% a year on assets, a performance fee of 10% to 25% charged only on profit, a 0.5% withdrawal fee, and an early exit fee if you leave a mandate inside its lock-up. Exact figures for each mandate are on its plan page, and the fees page works through a full example in dollars.",
  },
  {
    category: "Fees",
    question: "Are there hidden charges?",
    answer:
      "No. There is no account opening fee, no monthly fee, no inactivity fee and no deposit fee. Third-party network fees on crypto withdrawals are passed through at cost and shown before you confirm.",
  },
];

export const HOME_FAQ = FAQ_ITEMS.filter((item) =>
  [
    "What is the minimum investment?",
    "How do I fund my account?",
    "Is my money guaranteed?",
    "Where are client assets held?",
    "What do you charge?",
    "How long does a withdrawal take?",
  ].includes(item.question),
);
