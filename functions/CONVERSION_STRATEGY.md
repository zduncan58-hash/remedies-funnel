# Wei Remedies — Full Funnel Autopsy & 10x Plan
*Data: ManyChat flow stats + today's event log (July 2) + live sales page*

## 1. The math — where the funnel actually dies

| Stage | Number | Rate |
|---|---|---|
| Comment triggers (Msg #1 sent) | 215,000 | — |
| Msg #1 delivered | ~47,300 | **22%** 🔴 |
| Clicked TAP HERE | ~13,700 | 29% ✅ |
| Msg #2 delivered | ~9,860 | 72% 🟡 |
| Clicked "Secret Remedies" link | ~8,470 | 86% ✅ |
| **Sales** | **3** | **0.035%** 🔴🔴🔴 |

Today alone: 361 sessions → 83 clicked to checkout (23%, healthy) → ~0 purchases.

**The page is not the problem. The click-to-checkout rate (23%) is fine. People click, land on the Lemon Squeezy payment form, and vanish.** Your leak is between the promise you make and the payment you ask for.

Smoking gun from today's data: **median time from landing to checkout click is 22 seconds. 55% click within 30 seconds.** Nobody reads a page in 22 seconds. They aren't buying — they're still chasing the free thing you promised in the DM. The button says "Get Instant Access" (sounds free), they tap it, hit a $12 card form, feel tricked, and leave. Only 81 of 361 sessions even scrolled.

## 2. Leak #1 (fatal): The broken promise

Your comment CTAs promise a **gift**:
- "Comment yes and **I will send you** the exact morning routine"
- "**I will send you** one remedy I cannot mention in this video"

The DM never sends it. Instead it pitches and links to a paywall. Classic bait-and-switch — and the data shows exactly the psychology: high CTR everywhere (they keep chasing the freebie) and zero purchases (trust is dead by the time the card form appears).

**Fix: actually deliver the promised remedy, free, in full, inside the DM. Then sell the other 9.**

This is Reciprocity 101. The person who just received a real recipe from "Wei" and reads it is 50x more likely to pay $12 for the other nine than the person who feels baited. Your notebook has 10 remedies — giving away 1 costs you nothing and is your single highest-leverage change.

## 3. Leak #2 (fatal): Message ≠ Page

Msg #2 in your flow sells **Yerba Magic** — a gut-healing *scoop you drink instead of coffee* ("cortisol", "one scoop in water", "the formula I give my patients"). The button then lands on… **a $12 ebook of Chinese tea and soup recipes by Wei.**

Someone primed to buy a coffee-replacement powder lands on an ebook page. Someone primed for "the secret remedy" lands on a checkout. Zero congruence at two consecutive steps. Every step of a funnel must sell the *next* step and pay off the *previous* one. Right now no step does either.

**Fix:** One funnel, one promise, one product per flow. If the video is about remedies → DM delivers a remedy → sells the notebook. Run Yerba Magic as its own separate flow with its own page.

## 4. Leak #3: One-shot close, no follow-up, no email capture

You get ONE message sequence and then the lead is gone forever (Meta's 24h window). 8,470 people clicked and you have no way to reach 8,467 of them again. At a $12 impulse price, most sales on cold DM traffic come from touches 2–5, not touch 1.

**Fix:**
- Add 2 follow-up messages inside the 24h window (see flow below).
- Capture email inside ManyChat ("Where should I send the PDF of this recipe?") before sending the freebie. Then a 5-email sequence sells the notebook. You have beehiiv connected — I can build the automation for you next.
- Make Msg #1 a **quick-reply button ("YES, send it")**, not a URL button. A user *reply* re-opens the window and measurably improves delivery of Msg #2 (your 72% will climb).

## 5. Leak #4: Traffic quality

Only 59% of today's traffic is Tier-1 (US/UK/CA/AU/NZ/EU). The rest is PG, ZA, PK, BD, SR, FJ, GY… — engagement-bait comment CTAs on broad-targeted video pull global low-income audiences who will never pay $12 USD. That's also a chunk of your 22% delivery failure.

**Fix:** Geo-target the ads/boosts to T1 only. In ManyChat, branch by locale and don't burn sends on non-buyer geos (or send them a cheaper PPP offer — Lemon Squeezy supports purchasing-power-parity pricing).

## 6. Leak #5: Blind spots in tracking

- **No purchase or checkout-started events.** You literally can't see where checkout dies. Add a Lemon Squeezy webhook → POST to `/api/track` (`event_type: purchase`), and fire a `checkout_opened` beacon. Your `track.js` already accepts arbitrary event types — this is a 30-minute job. I can write it.
- **Scroll-depth events carry no depth value** (confirmed in today's CSV — all empty). Put the % in `reason`. Right now you can't see where readers bail.
- **Verify the Lemon Squeezy checkout yourself on mobile**: does it show "$12", the product image, and Apple Pay/Google Pay above the fold? 95% of your traffic is mobile — wallet buttons are the difference between a 22-second impulse buy and an abandoned card form. If wallets aren't first, fix that today.

## 7. The rewritten flow (copy included)

### Comment CTA (under the video)
> Comment "TEA" and I will send you the full recipe — ingredients, exact preparation, when to drink it. Free. You must be following me or Messenger will not let me send it.

(One specific word beats "yes" — filters bots, signals topic, and "TEA" comments are themselves social proof.)

### Msg #1 — instant (quick-reply button, NOT a link)
> You asked for the recipe 🌿 I have it right here, written out the way my family makes it.
>
> Tap below and I'll send it to you.
> **[ YES — SEND THE RECIPE ]**

### Msg #2 — the payoff (deliver the FULL free remedy)
> {First Name}, here it is — **Hawthorn After-Meal Tea**. The oldest after-dinner tea in China, for the bloat that arrives after heavy meals.
>
> 🌿 5–6 dried hawthorn berries (shan zha)
> 🌿 Hot water, 90°C, cover and steep 10 minutes
> 🌿 Drink warm, 20 minutes after your biggest meal
>
> Do this for 7 days. Most people feel the difference by day 3.
>
> One question — where should I send the PDF version so you don't lose it?
> **[ text input → email → beehiiv ]**

### Msg #3 — the pitch (immediately after email)
> Sent ✉️ Check your inbox in 2 minutes.
>
> That tea is 1 of the 10 remedies in my family notebook. The other 9 cover stubborn weight, water retention, puffy face and legs, deep tiredness, and sleep.
>
> The notebook is $12 today (launch price — it goes to $24 after).
> 👇 It's all here:
> **[ GET THE NOTEBOOK — $12 ]**

### Msg #4 — +4 hours
> Did you get a chance to look at the notebook, {First Name}? The remedy people write to me about most is the Pearl Barley Water — for ankles and face that hold water for years. That one is on page 14.
> **[ SEE THE NOTEBOOK — $12 ]**

### Msg #5 — +22 hours (last message the window allows)
> Last note from me — Messenger closes this chat after today. The $12 launch price is still on. If bloat, water, or tiredness is your fight, the notebook is the full system: 10 remedies, exact preparations, where to buy every ingredient for $40–60 total.
> **[ GET IT BEFORE THE CHAT CLOSES — $12 ]**

(The urgency here is *real* — the 24h window genuinely closes. Use that, not fake countdowns.)

## 8. Sales page changes (in priority order)

1. **Put the price on every button.** "Get Instant Access" reads as free — that's why 55% click in under 30s and bounce at the card form. Change to **"Get the Notebook — $12"**. You will lose junk clicks and gain buyers. Your click rate will drop; your sales will rise. Let it.
2. **Add a DM-bridge bar for ManyChat traffic** (you already pass `mcp_token` — detect it): *"👋 From my message? The tea I sent you is remedy #3. Here are the other 9."* Congruence restored, one line of JS.
3. **Fix the price story.** Header says $39 → $12 (70% off); timer section says it "returns to $24". Two anchors = zero credibility. One story: ~~$24~~ **$12 launch price**, and actually enforce it.
4. **Kill the fake Facebook-post testimonials and the "my patients" claim.** Direct warning, marketer to marketer: fabricated testimonials styled as real FB posts + implied medical practitioner + "they will take this video down" = the exact pattern Meta's health-scam classifier is trained on. That's not a compliance nicety — it's how this page and your ad account get nuked before you ever hit 10/day, and FTC exposure on top. Real early-buyer quotes (plain format, "results vary") sell nearly as well and keep the machine running. You have a 60-day guarantee and real recipes — you don't need to fake anything.
5. **Order bump at checkout (+30–40% AOV instantly):** "$7 — Wei's 7-Day Morning Routine: which remedy to drink on which day." Lemon Squeezy supports multi-product checkouts; this is the cheapest revenue you'll ever add.
6. **Post-purchase upsell:** the Yerba-style morning drink or a $29 "Personal Remedy Plan". Your backend is where 10x actually lives — front-end $12 buys the customer, the bump and upsell make the profit.

## 9. Expected math after fixes

Conservative, using today's volume (361 sessions/day):

| Step | Now | After |
|---|---|---|
| Msg→page congruence + freebie delivered | trust = 0 | trust = high |
| Sessions/day | 361 | 361 (same traffic) |
| Checkout clicks (priced buttons) | 83 junk | ~45 qualified |
| Checkout CVR (warm, wallet-first) | ~0% | 15–25% |
| **Sales/day (DM flow)** | **~0.4** | **7–11** |
| + email sequence on captured leads | 0 | +2–4/day |
| AOV with $7 bump | $12 | ~$16 |

That's your 10/day from *existing* traffic — before scaling spend or fixing the 22% delivery rate, which is your next multiplier (T1 geo targeting + quick-reply engagement will move both delivery numbers).

## 10. Do this week, in order

1. **Today:** Price on buttons + fix price story + test LS checkout on mobile (wallets first).
2. **Today:** Rebuild ManyChat flow per §7 — deliver the freebie, quick-reply first, 2 follow-ups.
3. **Tomorrow:** Email capture in flow → beehiiv 5-email sequence (I can build this).
4. **Tomorrow:** LS webhook → `/api/track` purchase events + scroll depth values, so we finally see the funnel end-to-end.
5. **Day 3:** Order bump live.
6. **Day 4–5:** Swap fake FB testimonials for real-format quotes; kill "patients"/"they'll take it down" claims before Meta does it for you.
7. **Day 7:** Read the data, then scale spend on T1 geos only.
