/**
 * Legal document source.
 *
 * These are working drafts written to be readable and specific, not templates
 * copied from another site. They still MUST be reviewed by a qualified lawyer
 * in your operating jurisdiction before you accept a single real deposit — the
 * pages render a visible notice saying exactly that until `reviewed` is set to
 * true here.
 */

export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  /** Flip to true once a lawyer has signed the document off. */
  reviewed: boolean;
  content: string;
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "risk-disclosure",
    title: "Risk Disclosure",
    summary:
      "What can go wrong, stated plainly. Read this before funding an account — it is the most useful document on the site.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## The short version

You can lose money. In the higher-risk mandates you can lose a large part of what you invest, and that loss can be permanent. Nothing on this platform is capital-protected, insured against investment loss, or guaranteed.

If that sentence changes your mind, it has done its job.

## Your capital is at risk

The value of an investment can fall as well as rise. You may get back less than you put in, and in adverse conditions you may get back substantially less.

Target returns published on plan pages are objectives derived from a strategy's assumptions. They are not forecasts, not promises, and not a floor. When the assumptions behind a strategy stop holding, the outcome falls outside the target range — in either direction.

## Past performance tells you very little

Historical returns describe a market regime that has already happened. They do not predict the next one. A strategy that produced 30% a year through a bull market can produce −40% through a bear market using exactly the same rules.

Where performance figures are shown, read carefully whether they are gross or net of fees, whether they include strategies that were closed, and over how long a period they were measured.

## Cryptoassets carry additional risks

Digital assets are volatile in a way that has no equivalent in traditional markets. Declines of 70–85% from a peak have occurred repeatedly, and recovery has sometimes taken years. Specific risks include:

- **No earnings floor.** There are no cash flows to anchor valuation, so there is no level at which a price becomes "cheap" on fundamentals.
- **Regulatory change.** A jurisdiction can restrict or prohibit an activity with little notice, and that has happened to major assets and venues.
- **Protocol and smart contract risk.** Code can contain flaws. Bridges, staking contracts and lending protocols have been exploited for the full value of deposits.
- **Liquidity.** Order books thin out fastest exactly when everyone wants to sell.
- **Custody.** Losing keys means losing assets, permanently and without recourse.
- **No compensation scheme.** In most jurisdictions, including the UK and the EU, cryptoasset activity is outside investor compensation schemes. If value is lost, no scheme makes you whole.

## Equity market risks

Equities can fall for reasons unrelated to any company's performance — interest rates, currency, policy, sentiment. Broad indices have declined 50% or more within a single cycle. Concentrated strategies can decline further and for longer.

## Lock-ups restrict your access

Most mandates lock capital for a stated period. During a lock-up you cannot access those funds on demand. Early exit is possible but incurs a fee and, more importantly, exits at the value on the day — which may be during precisely the decline you are trying to escape.

Never invest money you may need at short notice. Keep an emergency reserve entirely outside any investment product.

## Concentration and leverage

Allocating a large share of your wealth to a single mandate concentrates risk. We recommend digital assets remain a minority of any diversified portfolio, sized so that a total loss would be survivable.

Do not borrow money to invest here. Leverage converts a recoverable decline into a permanent loss.

## Operational and counterparty risk

Axiom relies on banks, custodians, trading venues and data providers. Any of them can fail, suspend service, or be subject to a regulatory action. Client assets are held in segregated accounts to limit the consequences, but no structure eliminates counterparty risk entirely.

## Tax is your responsibility

Investment gains, disposals and income may be taxable where you live, and in many jurisdictions swapping one asset for another is itself a taxable event. Axiom does not provide tax advice and does not withhold tax on your behalf. Keep your own records and consult a qualified adviser.

## This is not advice

Nothing published by Axiom — on this site, in your dashboard, in an article or in an email — is personal financial advice. We do not assess whether an investment is suitable for your circumstances, objectives or tolerance for loss. If you are unsure, take independent advice before investing.

## Before you fund an account

Ask yourself, honestly:

1. Could I lose this entire amount without changing how I live?
2. Can I leave it untouched for the full lock-up, and longer?
3. Have I read what this mandate's worst historical drawdown looks like?
4. Would I still hold it after a 40% decline, or would I sell?

If the answer to any of those is no, invest less — or do not invest at all. That is a legitimate answer and it is often the correct one.`,
  },

  {
    slug: "terms",
    title: "Terms of Service",
    summary:
      "The agreement between you and Axiom Capital: eligibility, your account, our obligations, and how the relationship ends.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## 1. About these terms

These terms govern your use of the Axiom Capital platform and any investment mandate you allocate capital to. By opening an account you agree to them. If you do not agree, do not open an account.

We may change these terms. Material changes will be notified to you by email at least 30 days before they take effect, and you may close your account without penalty during that period.

## 2. Eligibility

To open an account you must:

- be at least 18 years old;
- have legal capacity to enter a binding agreement;
- not be resident in, or a national of, a jurisdiction subject to comprehensive sanctions;
- not appear on any applicable sanctions list;
- provide accurate identity information and keep it current.

We may decline an application or close an account without giving reasons, subject to our regulatory obligations. Where we do so, funds are returned to their verified source.

## 3. Your account

You are responsible for keeping your credentials secure. Notify us immediately at the support address if you suspect unauthorised access. We will never ask you for your password or a one-time code.

You may hold only one account unless we agree otherwise in writing. Accounts are personal and may not be operated on behalf of a third party without disclosure and approval.

## 4. Identity verification

Before you can move funds, you must complete identity verification. We are required to collect and retain identity documents, proof of address and information about the source of your funds.

We may request updated documents at any time and may suspend transactions until verification is complete. Providing false information is grounds for immediate account closure and may be reported to the relevant authorities.

## 5. Deposits

Deposits must originate from an account in your own name. Third-party payments will be returned to source and may trigger a compliance review.

We credit your balance once we have matched the incoming payment to your deposit request. Until then, funds are not available to invest or withdraw.

## 6. Investment mandates

Allocating to a mandate authorises us to manage that capital according to the published strategy. We exercise discretion within the mandate's stated parameters — we do not accept individual trade instructions.

Each mandate's minimum, lock-up, fee schedule and expected drawdown are published on its plan page and form part of this agreement.

**We do not guarantee any return.** Target returns are objectives. Your capital is at risk. See the Risk Disclosure, which forms part of these terms.

## 7. Fees

Fees are as published on the relevant plan page and summarised on the fees page:

- a management fee, accrued on assets;
- a performance fee, charged only on profit;
- a withdrawal fee;
- an early exit fee where you leave a mandate before its lock-up ends.

Every fee posts as a separate ledger entry visible in your account. We will give 30 days' notice of any increase.

## 8. Withdrawals

You may request a withdrawal of available cash at any time, subject to the minimum. Requests are reviewed on the same business day and settled to the destination captured at the time of the request.

We may delay or decline a withdrawal where we are required to do so by law, where verification is incomplete, or where we have reasonable grounds to suspect fraud. Where we do, we will tell you unless prohibited from doing so.

## 9. Client assets

Client money is held in designated client accounts separate from our own funds. Digital assets are held with a qualified custodian. We do not use client assets as collateral for our own positions or lend them out.

## 10. Our liability

We are liable for losses caused by our own negligence, fraud or wilful default, and for any liability that cannot lawfully be excluded.

We are not liable for investment losses arising from market movements, nor for losses caused by your own actions — including disclosing your credentials, providing incorrect withdrawal details, or acting on general information as if it were personal advice.

## 11. Complaints

Send complaints to the compliance address. We acknowledge within 5 business days and aim to resolve within 8 weeks. If you remain dissatisfied you may be entitled to escalate to the relevant ombudsman or regulator in your jurisdiction.

## 12. Closing your account

You may close your account at any time. Open positions must be closed first; lock-up and early exit terms still apply. Remaining cash is returned to a verified account in your name.

We may close your account on 30 days' notice, or immediately where required by law, where you have breached these terms, or where we reasonably suspect fraud or money laundering.

## 13. Governing law

These terms are governed by the laws of the jurisdiction in which Axiom Capital is incorporated, and the courts of that jurisdiction have exclusive jurisdiction over any dispute — without affecting any mandatory consumer protections available to you where you live.`,
  },

  {
    slug: "privacy",
    title: "Privacy Policy",
    summary:
      "What personal data we collect, why we hold it, how long we keep it, and the rights you have over it.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## Who we are

Axiom Capital is the data controller for the personal data described here. Contact the compliance address for any privacy question or to exercise a right described below.

## What we collect

**You give us:** name, email, phone, date of birth, nationality, residential address, identity documents, a selfie, proof of address, source-of-funds information, tax residency, and bank or wallet details for withdrawals.

**We collect automatically:** IP address, browser and device information, pages viewed, and timestamps of logins and account actions.

**We receive from others:** sanctions and politically-exposed-person screening results, identity verification results, and payment confirmations from banks and custodians.

## Why we hold it, and on what basis

| Purpose | Lawful basis |
| --- | --- |
| Operating your account and executing mandates | Performance of a contract |
| Identity verification, sanctions screening, transaction monitoring | Legal obligation |
| Fraud prevention and platform security | Legitimate interests |
| Service emails about your account | Performance of a contract |
| Marketing emails | Consent — withdrawable at any time |
| Improving the platform | Legitimate interests |

We do not sell personal data. We do not use it to train models. We do not share it for advertising.

## Who we share it with

Only where necessary: identity verification providers, banks and custodians holding client assets, our regulator and law enforcement where legally required, and infrastructure providers (hosting, email, error monitoring) acting under contract on our instructions.

Where data leaves your region, we rely on adequacy decisions or standard contractual clauses.

## How long we keep it

- **Account and transaction records:** 5 years after the relationship ends, as required by anti-money-laundering law.
- **Identity documents:** 5 years after the relationship ends, then deleted.
- **Marketing consent records:** until withdrawn, plus 2 years.
- **Server logs:** 90 days.

We cannot delete records we are legally required to retain, even at your request. Once the retention period lapses, they are deleted.

## How we protect it

Identity documents are encrypted at rest and accessible only to compliance staff, with every access logged against a named reviewer. Passwords are hashed with bcrypt. Sessions use opaque tokens stored only as HMACs, so a database dump cannot be replayed as a login. Documents are never sent by email or stored in shared drives.

## Your rights

Depending on where you live, you may have the right to:

- **access** the personal data we hold about you;
- **correct** anything inaccurate;
- **delete** data we no longer have a legal basis to keep;
- **restrict** or **object to** certain processing;
- **port** your data to another provider in a machine-readable format;
- **withdraw consent** for marketing at any time;
- **complain** to your data protection authority.

Email the compliance address to exercise any of these. We respond within 30 days.

## Cookies

We use strictly necessary cookies for authentication and security. These cannot be disabled without breaking sign-in. We do not use advertising or cross-site tracking cookies. See the cookie policy for the full list.

## Changes

We will notify you by email of material changes at least 30 days before they take effect.`,
  },

  {
    slug: "aml",
    title: "Anti-Money Laundering Policy",
    summary:
      "How we verify customers, monitor transactions and report suspicious activity — and what that means for your account.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## Our commitment

Axiom Capital operates a risk-based anti-money-laundering and counter-terrorist-financing programme. We do not treat this as paperwork: a platform that cannot say where its money came from is a platform that will eventually be used to move criminal proceeds.

## Customer due diligence

Before any account can transact, we verify:

- **Identity** — a government-issued photo ID validated against tamper checks, plus a liveness check confirming the document belongs to you.
- **Address** — a utility bill, bank statement or government correspondence issued within the last three months.
- **Source of funds** — where the money you are investing came from, with supporting documentation for larger amounts.
- **Sanctions and PEP screening** — against applicable sanctions lists and lists of politically exposed persons, rescreened continuously.

## Enhanced due diligence

Additional scrutiny applies where the risk is higher: politically exposed persons and their close associates, customers resident in high-risk jurisdictions, unusually large or complex funding patterns, and any case where the source of wealth is unclear.

Enhanced due diligence means more documentation, senior sign-off before the account is approved, and more frequent review afterwards.

## Ongoing monitoring

We monitor transactions for patterns inconsistent with a customer's stated profile — including rapid deposit-and-withdrawal cycles, funding from unexpected third parties, structuring around thresholds, and activity that does not match the declared source of funds.

Where a pattern warrants it, we will ask for an explanation. Providing one promptly is usually the end of it.

## Restrictions we apply

- Deposits must come from an account in your own name. Third-party payments are returned to source.
- Cash is not accepted in any form.
- Anonymity-enhancing coins and mixed or tumbled funds are not accepted.
- We do not open accounts for shell companies or for customers who will not disclose beneficial ownership.

## Suspicious activity reporting

Where we have reasonable grounds to suspect money laundering or terrorist financing, we are legally required to file a report with the relevant financial intelligence unit. We may be prohibited by law from telling you that we have done so, and we may be required to freeze the account pending instruction.

This obligation overrides our duty of confidentiality to you.

## Record keeping

Identity documents, transaction records and the reasoning behind any decision are retained for at least five years after the relationship ends, and are made available to regulators and law enforcement on lawful request.

## Training and governance

Staff receive AML training at onboarding and annually. The Head of Compliance owns the programme, reports to the board, and holds a veto over any product change that would weaken these controls.`,
  },

  {
    slug: "fees",
    title: "Fees and Charges",
    summary:
      "Every charge on the platform, in one place, with a worked example in dollars.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## What you pay

| Charge | Amount | When |
| --- | --- | --- |
| Account opening | Free | — |
| Account maintenance | Free | — |
| Deposit (bank or crypto) | Free | — |
| Management fee | 1.00% – 2.00% a year | Accrued on assets in a mandate |
| Performance fee | 10% – 25% | On profit only, at close or period end |
| Withdrawal fee | 0.50% | Per withdrawal, minimum $50 withdrawal |
| Early exit fee | 0.50% – 3.00% | Only if you leave a mandate inside its lock-up |
| Inactivity | Free | — |
| Closing your account | Free | — |

Exact management, performance and early exit figures vary by mandate and are published on each plan page.

## Network fees

Crypto withdrawals incur a blockchain network fee, which we pass through at cost with no markup. The amount is shown before you confirm, and it varies with network conditions rather than with us.

## A worked example

$25,000 allocated to Balanced Index for one year. Management fee 1.25%, performance fee 15%. Assume a 13% gross return.

1. Gross return: **+$3,250**
2. Management fee, 1.25% of $25,000: **−$312.50**
3. Profit after management fee: $2,937.50
4. Performance fee, 15% of $2,937.50: **−$440.63**
5. **Net return: +$2,496.87 — 9.99% net on $25,000**

If you then withdraw the full $27,496.87:

6. Withdrawal fee, 0.50%: **−$137.48**
7. **Received: $27,359.39**

Total fees on the year: **$890.61**, or 3.56% of the starting amount — on a 13% gross return.

## If the year goes badly

Assume the same $25,000 loses 8%.

1. Gross return: **−$2,000**
2. Management fee, 1.25% of $25,000: **−$312.50**
3. Performance fee: **$0** — there is no profit to charge on
4. **Net: −$2,312.50, a 9.25% loss**

Note what this shows: the management fee is charged whether or not the mandate makes money. That is standard across the industry, and it is the reason a management fee should be small.

## No high-water-mark games

Performance fees are charged on profit above your entry value. If a mandate loses money in one period and recovers in the next, no performance fee is charged until the position exceeds its previous high. You never pay a performance fee twice for the same gain.

## How fees appear in your account

Every fee posts a separate ledger entry with the rate that produced it. In your transaction history you will see the fee, the reference, the timestamp and the resulting balance — not a net figure with the deduction buried inside it.

## Changes

We give 30 days' written notice before any fee increase. Existing positions keep their original fee schedule until their lock-up ends.`,
  },

  {
    slug: "cookies",
    title: "Cookie Policy",
    summary:
      "The short list of cookies this site sets, and what each one does.",
    updated: "2026-01-15",
    reviewed: false,
    content: `## The short version

This site sets one cookie, and it exists so you can stay signed in. There is no advertising cookie, no cross-site tracking pixel, and no third-party analytics that follows you around the web.

## What we set

| Name | Purpose | Duration | Type |
| --- | --- | --- | --- |
| \`axiom_session\` | Keeps you signed in and secures form submissions | 14 days, extended on use | Strictly necessary |

The cookie is \`httpOnly\` — JavaScript cannot read it — and it is marked \`Secure\` and \`SameSite=Lax\` in production. It contains an opaque random token, not your identity; the server stores only an HMAC of that token, so the cookie value cannot be reconstructed from our database.

## Why there is no consent banner

Strictly necessary cookies do not require consent under the ePrivacy Directive or equivalent regimes: without this one you could not sign in, which is a service you asked for. We do not set any cookie that would require consent.

If that changes, a consent banner will appear before any such cookie is set, and declining will not affect your ability to use your account.

## Local storage

We store your interface preferences — for example, table density — in your browser's local storage. This never leaves your device and is not readable by us.

## Blocking cookies

Every browser lets you block or delete cookies. Blocking \`axiom_session\` will prevent you signing in. Deleting it signs you out, which is a reasonable thing to do on a shared computer.

## Changes

Any change to this list will be reflected here with a new date at the top of the page.`,
  },
];

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => doc.slug === slug);
}
