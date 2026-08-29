export interface PostSeed {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  seoTitle: string;
  seoDescription: string;
  daysAgo: number;
  content: string;
}

/**
 * The organic-search surface. Each post targets a real query with a real
 * answer — thin, keyword-stuffed pages are worse than no pages at all, both
 * for ranking and for the kind of investor this platform wants.
 */
export const POST_SEEDS: PostSeed[] = [
  {
    slug: "how-to-invest-in-cryptocurrency-safely",
    title: "How to invest in cryptocurrency safely: a risk-first guide",
    excerpt:
      "Most crypto losses have nothing to do with picking the wrong coin. They come from position sizing, custody and leverage. Here is the order in which to think about it.",
    category: "Getting Started",
    tags: ["crypto", "risk management", "beginners", "custody"],
    authorName: "Nadia Rahman",
    authorRole: "Head of Portfolio Risk",
    seoTitle: "How to Invest in Cryptocurrency Safely — A Risk-First Guide (2026)",
    seoDescription:
      "A practical framework for investing in crypto without blowing up: position sizing, custody models, leverage, tax records and the questions to ask any platform.",
    daysAgo: 6,
    content: `Most people approach crypto by asking which coin to buy. That is the last question that matters, and asking it first is why so many portfolios end up underwater in a market that has, over any long horizon, gone up.

The order that actually matters is: how much, held where, with what leverage, and recorded how. Get those four right and asset selection becomes a comparatively small decision.

## Start with the number you can lose entirely

The honest starting point is a number you could write off without changing your life. Not the number that would hurt — the number that would be genuinely survivable if it went to zero.

For most people building long-term wealth, that is somewhere between 1% and 10% of investable assets. Under 1% and the position is too small to matter even if it does well. Over 10% and a routine 70% drawdown — which crypto has delivered four separate times — stops being an inconvenience and starts driving decisions you would otherwise never make.

Write the number down before you look at a single chart. The decision you make while watching a price move is not the same decision you make in the quiet.

## Understand what you actually own

There are three custody models, and they carry genuinely different risks:

**Self-custody.** You hold the private keys. Nobody can freeze your assets, and nobody can recover them if you lose the keys. The failure mode is permanent and self-inflicted: a lost seed phrase, a phishing signature, a house fire.

**Exchange custody.** The exchange holds the keys and owes you a balance. This is convenient and it is a credit exposure — you are an unsecured creditor of that business. Everyone who learned this in 2022 learned it the expensive way.

**Qualified custody.** A regulated custodian holds the assets in segregated accounts, typically with insurance and independent attestation. You give up some convenience for a materially better answer to "what happens if the platform fails?"

None of these is universally correct. What matters is knowing which one you are in. If you cannot answer that question about a platform in one sentence, that is the finding.

## Leverage is the actual killer

Bitcoin has never gone to zero. Plenty of Bitcoin *positions* have. The difference is leverage.

A 3x position gets liquidated by a 33% move. Crypto delivers 33% moves in a bad week. At that point the direction of your original thesis is irrelevant — you were right and you are still gone, because liquidation is path-dependent in a way that being right is not.

If you are investing rather than trading, the correct amount of leverage is none.

## Decide your rebalancing rule in advance

A rule written in advance is worth more than a good instinct in the moment. Two that work:

- **Calendar rebalancing.** On a fixed date each quarter, sell back to your target weight. Mechanical, unemotional, and it forces you to trim into strength.
- **Threshold rebalancing.** When a position drifts more than, say, 25% from target, rebalance. Fewer transactions, and it responds to actual volatility rather than the calendar.

Both beat "I'll know when the time is right." You will not.

## Keep records from day one

Every jurisdiction treats crypto disposals as taxable events, and "disposal" usually includes swapping one token for another — not just selling to fiat. People who start reconstructing three years of transactions in April discover that exchanges delete history, wallets get abandoned, and the cost basis is genuinely unrecoverable.

Export your transactions monthly. Keep the CSV. It takes four minutes and it saves an accountant's week.

## Questions worth asking any platform

Before you move money anywhere, get answers to these in writing:

1. Who holds the assets, and are client assets segregated from company assets?
2. What happens to my position if the company enters administration?
3. What are the total fees — management, performance, spread, withdrawal — as one number on a realistic example?
4. Can I see every transaction on my account, including the fee lines?
5. What is the withdrawal process, and what is the longest it has taken in the last quarter?

A platform that answers these plainly is telling you something. So is one that does not.

## The uncomfortable conclusion

Safe crypto investing is boring. It is a small, unleveraged, well-custodied position, rebalanced on a schedule, recorded properly, held through drawdowns that feel unbearable at the time.

That is the whole method. The exciting version is the one that loses money.

*Capital is at risk. Nothing here is personal financial advice. Past performance does not predict future results.*`,
  },

  {
    slug: "crypto-vs-stocks-portfolio-allocation",
    title: "Crypto or stocks? The allocation question, answered properly",
    excerpt:
      "The two asset classes fail in different ways and at different times. That, not expected return, is the real argument for holding both — and it dictates the split.",
    category: "Portfolio Strategy",
    tags: ["asset allocation", "equities", "crypto", "diversification"],
    authorName: "Marcus Feld",
    authorRole: "Chief Investment Officer",
    seoTitle: "Crypto vs Stocks: How to Split Your Portfolio (Data-Backed Guide)",
    seoDescription:
      "Correlation, drawdown depth and recovery time for crypto and equities — and a framework for choosing an allocation you can actually hold through a bear market.",
    daysAgo: 13,
    content: `"Crypto or stocks" is the wrong question, in the same way "seatbelt or airbag" is the wrong question. The useful version is: what proportion of each, and why?

## They are not the same kind of risky

Equities and crypto are both volatile, but the volatility has a different character.

A broad equity index is a claim on the earnings of several hundred profitable businesses. It falls when those earnings are expected to fall or when the rate used to discount them rises. Its drawdowns are deep — 50% or so in a genuine crisis — and its recovery is measured in years, underwritten by companies that keep producing cash the entire time.

Crypto is a claim on network adoption with no cash flows to anchor it. Drawdowns of 70–85% are normal, not exceptional, and there is no earnings floor to arrest the fall. The flip side is convexity: the same absence of an anchor that permits an 80% decline permits a 10x.

Sizing an asset by its expected return while ignoring the shape of its downside is how portfolios end up with positions their owners cannot hold.

## Correlation moves exactly when you need it not to

The diversification argument for crypto rests on low correlation to equities. That correlation is real on average and unreliable when it matters.

In calm markets, crypto and equities move fairly independently. In genuine liquidity crises — March 2020, the 2022 rate shock — correlations converge toward one, because investors sell what they can rather than what they want to. Everything liquid goes down together.

So: crypto diversifies an equity portfolio most of the time, and stops diversifying it in precisely the weeks you most needed it to. Plan around that. It is a source of long-run return with an imperfect hedge attached, not a hedge.

## A framework instead of a number

Rather than a universal split, work backwards from the drawdown you can tolerate.

Take your maximum tolerable portfolio drawdown — the loss at which you would abandon the plan. Call it **D**. Assume equities can fall 50% and crypto 80% in the same event, because historically they have.

Then: \`0.5 × equity_weight + 0.8 × crypto_weight ≤ D\`

Someone who can stomach a 30% portfolio drawdown, holding 50% equities, has 0.5 × 0.5 = 25% from stocks alone, leaving 5% of budget — about a 6% crypto allocation. That is smaller than most crypto enthusiasts want and larger than most conservative advisers suggest, which is usually a sign the arithmetic is doing its job.

The point is not the precise output. It is that the allocation is derived from something you know about yourself rather than from a forecast you cannot make.

## Rebalancing is where the return actually comes from

Two uncorrelated volatile assets, rebalanced, produce a portfolio return higher than the weighted average of their returns. This is not a trick; it is the mathematics of buying low and selling high enforced by a rule instead of a judgement.

The catch is that rebalancing requires selling the thing that has done well, which never feels correct at the time. That is exactly why it works, and exactly why it needs to be a written rule with a date on it.

## What this looks like in practice

A defensible long-horizon portfolio for someone with a moderate risk appetite:

- **60–70% global equities** — the engine, diversified across regions
- **15–25% fixed income or stablecoin yield** — the ballast, and the source of rebalancing cash
- **5–10% digital assets** — the convexity, sized so it cannot dictate outcomes
- **5% cash** — optionality, and the thing that stops you selling at the bottom

Rebalance quarterly. Do not touch it in between.

## The one thing that beats optimal

An allocation you hold for ten years beats a better allocation you abandon in month fourteen. Every model in this article assumes you stay invested through the drawdown. If a 6% crypto position keeps you invested where a 15% position would not, then 6% is the better allocation, whatever the optimiser says.

*Capital is at risk. Nothing here is personal financial advice.*`,
  },

  {
    slug: "understanding-apy-target-returns",
    title: "APY, APR and 'target return': what the numbers on a platform mean",
    excerpt:
      "The same underlying performance can be advertised three different ways. Here is how to read the number, and how to work out what actually lands in your account.",
    category: "Investor Education",
    tags: ["fees", "returns", "APY", "transparency"],
    authorName: "Nadia Rahman",
    authorRole: "Head of Portfolio Risk",
    seoTitle: "APY vs APR vs Target Return — How to Read Investment Numbers",
    seoDescription:
      "Compounding, fee drag, gross versus net and why a 'target return' is not a promise. A plain-English guide to the numbers investment platforms advertise.",
    daysAgo: 21,
    content: `Three platforms advertise 12%. One means 12% before fees, one means 12% compounded, one means 12% if a set of assumptions holds. The number is identical and the outcome is not.

## APR and APY are not the same number

**APR** is the simple annual rate. 1% a month is 12% APR.

**APY** includes compounding. That same 1% a month, reinvested, is 12.68% APY.

The gap widens with rate and frequency. At 2% monthly, APR is 24% and APY is 26.8%. At 5% monthly — a rate that should itself raise questions — APR is 60% and APY is 79.6%.

Neither is dishonest. But quoting APY while a competitor quotes APR makes an identical product look better, so read which one you are being shown.

## Gross and net are separated by more than you expect

An advertised return is usually gross. What reaches you is net of:

- **Management fee** — a percentage of assets, charged whether or not you make money
- **Performance fee** — a percentage of profits, sometimes only above a hurdle
- **Spread** — the gap between the price the platform gets and the price you get
- **Withdrawal fee** — flat or percentage, per transfer out

Work a real example. On $10,000 at a 12% gross return, with a 2% management fee and a 20% performance fee:

- Gross profit: $1,200
- Management fee: $200
- Performance fee on the remaining $1,000: $200
- **Net: $800 — an 8% return, not 12%**

A third of the return went to fees. That may still be a good deal for a strategy you could not run yourself. It is not the number on the homepage.

## "Target" means target

A target return is an objective, not a commitment. It says: this is what the strategy is built to deliver if its assumptions hold.

Assumptions do not always hold. A basis-capture strategy targeting 20% assumes futures trade at a premium to spot; when the market flips into backwardation, that spread inverts. A momentum strategy targeting 18% assumes trends persist; in a choppy, mean-reverting market it whipsaws.

The right question is not "will you hit the target?" but "what has to be true for this target, and what happens when it isn't?" A platform that can answer both is describing a strategy. One that cannot is describing a hope.

## What a guaranteed return would actually mean

If a platform guarantees a fixed return regardless of market conditions, one of three things is true: it is taking the risk onto its own balance sheet (so its solvency is now your risk), it is a deposit product from a licensed bank (so it is covered by a deposit scheme, and pays deposit-scheme rates), or it is paying earlier investors with later investors' money.

The third has a name. High guaranteed returns with no explanation of the source is the single most reliable warning sign in finance.

## Reading a track record honestly

When performance history is shown, check:

1. **Is it net of all fees?** If it does not say, assume gross.
2. **Does it include closed strategies?** Quietly dropping the losers inflates the average — this is survivorship bias, and it is common.
3. **Is it audited or self-reported?** Self-reported numbers are marketing.
4. **What was the worst drawdown, and how long to recover?** A strategy that returned 30% annually with a 60% drawdown is a very different product from one that returned 18% with a 12% drawdown.
5. **How long is the record?** Three years covers one market regime. It does not tell you how a strategy behaves in a different one.

## The one calculation worth doing

Before committing capital, work out the total cost as a single number on a realistic outcome. Not the fee schedule — the euros or dollars, on your amount, at a plausible return.

If a platform cannot produce that figure on request, it is not a transparency problem. It is an answer.

*Capital is at risk. Target returns are objectives, not guarantees.*`,
  },

  {
    slug: "kyc-aml-explained-for-investors",
    title: "Why an investment platform asks for your passport",
    excerpt:
      "KYC feels like friction and looks like surveillance. It is neither optional nor arbitrary — and the way a platform handles it tells you a lot about the platform.",
    category: "Compliance",
    tags: ["KYC", "AML", "compliance", "regulation"],
    authorName: "Elena Whitfield",
    authorRole: "Head of Compliance",
    seoTitle: "KYC and AML Explained: Why Investment Platforms Verify Your Identity",
    seoDescription:
      "What Know Your Customer and Anti-Money Laundering checks involve, what happens to your documents, how long verification takes, and what to watch out for.",
    daysAgo: 28,
    content: `Handing a photograph of your passport to a website is a genuinely reasonable thing to hesitate over. Here is what the requirement is, where it comes from, and what a platform should be doing with the document once it has it.

## The requirement is not the platform's choice

Any business that holds client funds or facilitates investment sits under anti-money-laundering law: the EU's AML directives, the US Bank Secrecy Act, the UK Money Laundering Regulations, and equivalents almost everywhere else. These require regulated firms to establish who their customers are before accepting funds.

This is not a policy a platform can waive for a good customer. Operating without it is a criminal matter for the directors, not a compliance ticket.

So when a platform offers to skip verification, it is telling you it is either unlicensed or unbothered by the law. Neither is a reason to trust it with money.

## What is actually being checked

**Identity.** A government photo ID plus a selfie or liveness check, confirming the document is real and belongs to you.

**Address.** A utility bill or bank statement, usually under three months old, confirming where you live. Jurisdiction determines which rules apply to your account.

**Source of funds.** Where the money came from — salary, business income, a property sale, inheritance. Larger amounts attract more documentation. This is the question people find most intrusive, and it is the one doing the most work: it is how proceeds of crime are separated from savings.

**Sanctions and PEP screening.** Your name against sanctions lists and lists of politically exposed persons. Being a PEP is not disqualifying; it means enhanced ongoing monitoring.

## What should happen to your documents

A platform handling this properly:

- **Encrypts documents at rest**, with access restricted to compliance staff
- **Logs every access**, so it can show who viewed your file and when
- **Retains for the statutory period** — typically five years after the relationship ends — then deletes, rather than keeping everything forever
- **Never emails documents around** or stores them in a shared drive
- **Publishes a retention policy** you can read before uploading anything

You are entitled to ask which of these apply. Under GDPR and similar regimes you are also entitled to know what is held about you and to have it deleted once the retention period lapses.

## How long it takes

Automated checks clear in minutes. Manual review — triggered by a poor-quality scan, a name mismatch, an address that does not resolve, or a larger initial deposit — typically takes one to three business days.

The commonest delays are avoidable: a photo with glare across the document, a cropped edge, an expired ID, or an address document in a different name from the account.

## Reverification

Verification is not permanent. Documents expire, addresses change, and regulations require periodic refresh — usually every one to three years, sooner for higher-risk profiles. A request to reverify is routine housekeeping, not suspicion.

## The warning signs

Be cautious of a platform that:

- Accepts unlimited deposits with no verification at all
- Verifies you on the way in but demands *additional* documents only when you try to withdraw
- Cannot say which regulator supervises it, or names one you cannot confirm on that regulator's own register
- Asks for your full banking credentials rather than a statement
- Requests documents over email or a chat app instead of an encrypted upload

The second of those is the classic pattern. Verification exists to gate deposits, not to obstruct withdrawals. A platform that reverses that order is doing something other than compliance.

## The reasonable trade

Verification is a real cost in privacy and time. What it buys is a market where client funds are traceable, sanctioned parties are excluded, and a firm holding your money is accountable to a regulator that can act.

The alternative — an unverified market with no recourse — has been tried repeatedly. It is not better for investors.

*If you have questions about how your documents are handled, ask the platform's compliance team directly and get the answer in writing.*`,
  },

  {
    slug: "dollar-cost-averaging-vs-lump-sum",
    title: "Dollar-cost averaging vs lump sum: what the data actually shows",
    excerpt:
      "Lump sum wins about two-thirds of the time. Averaging in still makes sense for most people, and the reason has nothing to do with returns.",
    category: "Portfolio Strategy",
    tags: ["DCA", "investing", "behaviour", "timing"],
    authorName: "Marcus Feld",
    authorRole: "Chief Investment Officer",
    seoTitle: "Dollar-Cost Averaging vs Lump Sum Investing — The Evidence",
    seoDescription:
      "Historical data on lump-sum versus phased investing across equities and crypto, why lump sum usually wins, and when averaging in is still the better decision.",
    daysAgo: 35,
    content: `You have a sum to invest. Do you put it in at once, or spread it over months?

The research is unusually clear, and the clear answer is not the one most people should follow.

## Lump sum wins about two-thirds of the time

Study after study, across decades of US and international equity data, lands in the same place: investing a lump sum immediately beats averaging it in over twelve months roughly 66–75% of the time, by an average of one to two percentage points.

The reason is structural, not clever. Markets rise more often than they fall. Money sitting in cash waiting to be deployed is money not earning the return you are invested for. Averaging in guarantees that a portion of your capital misses the market's most common behaviour.

The same holds in crypto over full cycles, with wider dispersion in both directions.

So on expected return, the answer is: invest it now.

## The other third is the problem

Lump sum loses when you invest immediately before a significant decline. It loses badly. Someone who deployed everything in October 2007 waited five and a half years to break even.

Expected value says take the bet. Being the person in the losing third says something different, because the cost is not only financial. The investor who deploys everything and watches a 40% decline in month two does not calmly hold to year ten. They sell, and they stay out, and the realised loss is permanent in a way the paper loss was not.

## Averaging in is insurance you pay for in returns

Phasing in over six or twelve months is not a return-maximising strategy. It is a regret-minimising one, and it costs about 1–2% in expected return to buy.

That premium is worth paying when:

- **The sum is large relative to your existing portfolio.** Doubling your invested assets in one transaction is psychologically different from adding 5%.
- **The money arrived suddenly.** Inheritance, a business sale, a bonus. Windfalls are held to a different emotional standard than money saved gradually.
- **You have never held through a drawdown.** Conviction untested by a real decline is not conviction; it is an untested hypothesis.
- **You would not be able to sleep.** Not a soft consideration. An investor who cannot sleep sells.

Lump sum is right when the amount is modest relative to your portfolio, you have held through a bear market before and did not sell, and the horizon is genuinely long.

## Continuous contributions are a different thing

Investing a fixed amount from every paycheque is often called dollar-cost averaging, but it is not the same decision. You are not choosing to hold cash back — you are investing money as it arrives, immediately. That is lump-sum investing on a rolling basis, and it is optimal.

The averaging-in debate only applies to a sum you already hold.

## A workable compromise

If the decision is genuinely paralysing, a structure that works:

1. Invest **50% immediately.** This captures the majority of the expected-return advantage.
2. Invest the remaining 50% in **four monthly instalments** on fixed dates.
3. **Accelerate on drawdowns.** If the market falls more than 10% from your entry, deploy the remainder immediately.

That last rule is what converts a decline from a source of regret into a source of advantage — which is exactly the reframing that keeps people invested.

## The rule that outranks all of this

Time in the market beats timing the market, and both are dwarfed by whether you keep contributing. An investor who adds monthly for twenty years, through every drawdown, ends up ahead of one who deployed perfectly once and then stopped.

Pick the approach you will actually follow. Then follow it.

*Capital is at risk. Historical patterns do not predict future results.*`,
  },

  {
    slug: "how-segregated-client-funds-work",
    title: "What happens to your money if an investment platform fails",
    excerpt:
      "Segregated accounts, custodians and the difference between a balance you own and a balance you are owed. The distinction only matters once — and by then it is settled.",
    category: "Compliance",
    tags: ["custody", "client money", "insolvency", "due diligence"],
    authorName: "Elena Whitfield",
    authorRole: "Head of Compliance",
    seoTitle: "Segregated Client Funds Explained — What If the Platform Fails?",
    seoDescription:
      "How client money segregation, qualified custody and insolvency waterfalls work, and the questions to ask a platform before you deposit.",
    daysAgo: 44,
    content: `Every platform looks solvent right up until it is not. The question worth answering in advance is what your claim looks like the day after.

## Two kinds of balance

When a platform shows you $50,000, that number means one of two fundamentally different things.

**Assets held for you.** The platform holds the assets in an account legally separated from its own, as your property. It has custody but not ownership. In an insolvency, those assets are not part of the estate — they are returned to clients.

**A debt owed to you.** The platform took your money onto its own balance sheet and owes you a balance. In an insolvency you are an unsecured creditor, ranking behind secured lenders, employees and tax authorities. Recoveries in that position are typically measured in cents.

Both look identical in a dashboard. They are not remotely the same thing, and the difference is set out in the terms of service — usually under "client money" or "custody."

## What segregation actually requires

Genuine segregation is a specific arrangement, not a promise:

- Client funds sit in **separately designated accounts** at a bank or custodian, titled to show they are client assets
- The platform's **operating costs never come out of those accounts** — salaries and rent are paid from company funds
- **Daily reconciliation** between what clients are owed and what is held
- **Independent audit** of that reconciliation, at least annually
- In many jurisdictions, a **statutory trust** over the funds, so segregation survives insolvency as a matter of law rather than policy

The failures that have destroyed client capital almost always trace to the second point. Assets were commingled, then used as collateral for the company's own positions. When those positions failed, so did the client balances.

## Crypto custody has its own version

For digital assets the equivalent is a qualified custodian: a regulated entity holding keys in cold storage, with multi-party approval, insurance and periodic proof-of-reserves attestation.

Proof of reserves is worth understanding precisely. It demonstrates that a platform holds assets — it does not demonstrate that it holds them free of liabilities. A platform can prove reserves and still be deeply insolvent if it has borrowed against them. Ask for **proof of reserves and liabilities**, attested by an independent auditor. The second half is the half that matters.

## Compensation schemes and their limits

Some jurisdictions run investor compensation schemes — the UK's FSCS, the US SIPC, national equivalents in the EU. Their limits are worth knowing exactly:

- They cover **failure of the firm**, not investment losses. Nobody compensates you for a strategy that lost money.
- They apply only to **regulated activities** carried out by an **authorised firm**. Most crypto activity is outside their scope in most jurisdictions.
- They cap per person, per firm — typically £85,000 or $500,000 depending on the regime.

A platform describing itself as "regulated" without naming the regulator and the permission is saying nothing. Registration for anti-money-laundering purposes is not the same as authorisation to hold client money, and the two are routinely conflated in marketing.

## The five questions

Before depositing anywhere:

1. **Who is the regulator and what is the firm reference number?** Then check it on the regulator's own register, not the platform's website.
2. **Are client assets segregated, and under what legal mechanism?**
3. **Who is the custodian, and are they independent of the platform?**
4. **When was the last reconciliation audit, and by whom?**
5. **What does the insolvency waterfall look like — where do I rank?**

Every one of these has a short, factual answer. A platform that cannot give it quickly is not being careful; it is being evasive.

## Why this matters more than returns

Investors compare platforms on advertised returns and fees, because those are the numbers on the page. Custody structure is the variable that determines whether any of it is real.

A 6% return on segregated assets is worth more than a 20% target on a balance you merely have a claim to. That comparison looks academic until the day it is the only comparison that matters.

*This article is general information, not legal advice. Verify a firm's status with the relevant regulator before investing.*`,
  },
];
