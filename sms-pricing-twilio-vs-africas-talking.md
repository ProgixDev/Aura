# Twilio vs Africa's Talking — what SMS actually costs

## The short version

The client is right, and it isn't close. For African destinations, Twilio costs roughly **10 to 50 times more per SMS** than Africa's Talking. Across the 27 African markets where AT publishes local rates, AT is cheaper in **27 of them** — median saving around **90%**.

This isn't a discount you can negotiate away. It's structural: Twilio buys international A2P termination through global aggregators and bills in USD; Africa's Talking plugs straight into the local carriers (Safaricom, MTN, Airtel, Orange, Vodacom…) and bills in local currency at wholesale rates. No amount of haggling closes a 50× gap.

The cleanest way to see it — Nigeria at 100,000 messages a month:

- Twilio: ~$0.20–0.39 per SMS → **$20,000–$39,000/month**
- Africa's Talking: ~$0.0037 per SMS → **~$370/month**

Same messages. Same phones. Two orders of magnitude apart.

That said, AT is not a drop-in replacement for everything, and it has real operational overhead. The rest of this covers where each one wins and what to watch for.

---

## Africa — per-SMS, side by side

Twilio figures are its published list price per outbound segment. Africa's Talking is shown at its entry tier ("Basic") and its best tier ("Max"), converted to USD at mid-2026 rates. All prices are per **segment** — see the encoding note below, it matters.

| Country | Twilio $/SMS | AT entry $/SMS | AT best $/SMS | Twilio premium |
|---|---|---|---|---|
| Nigeria | 0.1982 | ~0.0040 (₦5.80) | ~0.0032 (₦4.60) | ~50× |
| Uganda | 0.2122 | ~0.0075 (UGX 27) | ~0.0053 (UGX 19) | ~28× |
| Rwanda | 0.1849 | ~0.0069 (RWF 10) | ~0.0041 (RWF 6) | ~27× |
| Ghana | 0.1468 | ~0.0048 (GHS 0.053) | ~0.0027 (GHS 0.030) | ~30× |
| Tanzania | 0.1804 | ~0.0082 (TZS 20) | ~0.0078 (TZS 19) | ~22× |
| Zambia | 0.2229 | ~0.0104 (ZMW 0.24) | ~0.0074 (ZMW 0.17) | ~21× |
| Malawi | 0.2270 | ~0.0086 (MWK 15) | ~0.0086 | ~19× |
| Kenya | 0.1050 | ~0.0062 (KES 0.80) | ~0.0031 (KES 0.40) | ~17× |
| Burundi | 0.2578 | 0.0320 | 0.0260 | ~8× |
| Botswana | 0.0998 | ~0.0133 (BWP 0.18) | ~0.0111 | ~7.5× |
| Niger | 0.2509 | 0.0420 | 0.0350 | ~6× |
| Senegal | 0.2044 | 0.032–0.038 | 0.025–0.030 | ~6× |
| DR Congo (Kinshasa) | 0.1680 | ~0.0275 (CDF 77) | ~0.0230 | ~6× |
| Rep. of Congo (Brazzaville) | 0.3371 | not covered by AT | — | — |
| Benin | 0.1445 | 0.0300 | 0.0220 | ~5× |
| Cameroon | 0.1383 | 0.0320 | 0.0260 | ~4× |
| Côte d'Ivoire | 0.1255 | ~0.021 (Orange) / ~0.032 (MTN) | ~0.016 / ~0.026 | ~4–6× |
| Zimbabwe | 0.1407 | 0.0350 | 0.0400 | ~4× |
| Ethiopia | 0.2282 | ~0.0613 (ETB 9.50, flat) | 0.0613 | ~3.7× |
| Mali | 0.1574 | 0.0520 | 0.0450 | ~3× |
| Gambia | 0.1660 | 0.0580 | 0.0500 | ~2.9× |
| Guinea | 0.1517 | 0.0580 | 0.0500 | ~2.6× |
| Burkina Faso | 0.1329 | 0.0520 | 0.0450 | ~2.6× |
| Togo | 0.1523 | 0.0600 | 0.0520 | ~2.5× |
| South Africa | 0.0284 | ~0.0146 (ZAR 0.24, flat) | 0.0146 | ~1.9× |


---

## Where Twilio isn't the loser

Two places, and it's worth saying them out loud so the recommendation doesn't read as blind cheerleading.

**South Africa.** $0.0284 vs $0.0146 — only about 2× more. And AT's South Africa Sender ID carries setup + monthly fees that can wipe out the gap at low volume. Basically a wash.

**Everywhere outside Africa.** This is the part the client probably hasn't weighed. Twilio's list rates where you'd send outside the continent:

| Destination | Twilio $/SMS |
|---|---|
| USA / Canada | 0.0079 (+ US carrier fees) |
| UK | 0.0420 |
| France | 0.0798 |
| Germany | 0.0940 |
| Spain | 0.0875 |
| Italy | 0.0927 |
| Belgium | 0.1050 |
| Morocco | 0.1463 |
| Egypt | 0.1851 |
| Tunisia | 0.2091 |
| Algeria | 0.2575 |

Africa's Talking does list international regions (Europe, Asia, Americas…), but the rates are gated behind a sales conversation, the routes are resold rather than direct, and third-party benchmarks put its US outbound near $0.03 — about 4× Twilio's. Outside Africa, AT is the wrong tool.


---


## What Africa's Talking costs beyond the per-SMS rate

The message price is only part of the bill:

- **Sender ID.** Free in a lot of markets (DR Congo, for instance). But Kenya is ~KES 8,700 one-off; Uganda is UGX 250,000 *per month*; Burkina Faso runs to CFA ~1.3M in regulator + setup fees. Registration takes company letterhead and sample messages, and 2–5 business days per market — it is not the instant, self-serve experience Twilio gives you.
- **Prepaid only.** Wallet top-up, no permanent free tier (there's a free dev sandbox). No credit terms.
- **Tax.** Quoted rates are usually VAT-exclusive — add ~16% (Kenya), 18% (Uganda/Tanzania), 7.5% (Nigeria).
- **The multi-country trap — flag this one explicitly.** If a single Sender ID sends into more than one country, a carrier like Airtel can re-rate the traffic as "international" and the price jumps from local (KES 0.80) to roughly USD 0.22 — silently. For any multi-country app, register a separate Sender ID per country or the economics quietly fall apart.

Twilio's side of this is lighter operationally: Alphanumeric Sender ID is free in most markets (150 locales), you're sending in minutes, and it carries the compliance tooling (US 10DLC, GDPR posture) AT doesn't. You pay for that convenience in the per-SMS rate.

---

## When to use each

**Africa's Talking** — when most recipients are in its African markets, when SMS cost is the thing that matters, and when the app can absorb per-country Sender ID registration. It also gives you USSD and airtime top-up, which are core to African products and which Twilio effectively doesn't do locally. Independent benchmarks put its API around 322 ms median response with a near-zero error rate, so reliability isn't a reason to avoid it.

**Twilio** — when you need broad global reach from one integration, when you also lean on Verify/Voice/WhatsApp/Studio, when one vendor and one codebase beats the lowest unit price, or when you're sending outside AT's covered markets.

