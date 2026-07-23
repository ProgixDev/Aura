# Bulk SMS providers for Congo & Africa — price and how hard to ship

Six providers compared for **DR Congo first**, then the wider African / francophone markets: **Africa's Talking, AfrikSMS, BulkSMS, Plivo, Infobip, Orange Developer**. Two things decide this, not one — what a message *costs*, and how much *work* it is to actually go live. A route that's 3× cheaper is worthless if it needs a two-month enterprise onboarding for a pilot.

They split into two families:

- **Local / Africa-native** — AfrikSMS, Africa's Talking, Orange Developer. Cheapest per SMS, but each has a catch (francophone-only, per-country registration, or single-network).
- **Global aggregators** — Plivo, BulkSMS, Infobip. Easier reach and one integration for many countries, but pricier and/or sales-gated.

---

## DR Congo — price per SMS

| Provider | $/SMS to DRC | Networks reached | How solid is the number |
|---|---|---|---|
| **Orange Developer** | **0.018–0.02** | Orange RDC **only** (on-net) | Verified — Orange official pricing page |
| **AfrikSMS** | **~0.027** (16 FCFA) | multi-network | Verified — afriksms.com |
| **Africa's Talking** | **~0.027** (CDF 77) | multi-network | Weak — third-party blog; not on AT's own site |
| **Plivo** | Vodacom **0.084** · Africell 0.230 · Orange 0.240 · Airtel 0.283 | per-carrier | Verified — plivo.com |
| **BulkSMS.com** | quote only (credit-based) | multi-network | Not published |
| **Infobip** | quote only (enterprise) | multi-network | Not published |
| *Twilio (current baseline)* | *0.258 flat* | *multi-network* | *Verified — twilio.com* |

**Reading it:**
- **Orange direct is the cheapest** by a wide margin (~$0.018) — but it only reaches Orange subscribers. To cover the whole country you'd still need a second route for Vodacom/Airtel/Africell numbers.
- **AfrikSMS and Africa's Talking (~$0.027)** are the cheapest *cross-network* options — one integration hits every DRC carrier. AfrikSMS's number is confirmed on its own site; AT's isn't (see caveats), so test it live before trusting it.
- **Plivo is carrier-dependent and mostly expensive** — great on Vodacom ($0.084), brutal on Airtel ($0.283). Since you can't pick which network a recipient is on, budget for the blended average, which lands near Twilio.
- **BulkSMS and Infobip don't publish DRC rates** — you have to ask. Infobip is enterprise; expect a sales conversation.
- Everything here beats Twilio's $0.258 except Plivo-on-Airtel.

*Rep. of Congo (Brazzaville) is a different country and thinner: Orange operates there and Twilio lists ~$0.337, but AfrikSMS/AT coverage is unconfirmed. If Brazzaville is the real target, say so and I'll pull it properly.*

---

## Other African countries — price per SMS

Sample rates per provider (USD/segment). "—" means the provider doesn't serve that market; "quote" means published only on request. FCFA converted at ~600/USD.

| Country | AfrikSMS | Africa's Talking | Orange Developer (on-net) | Plivo (major carriers) |
|---|---|---|---|---|
| Côte d'Ivoire | ~0.017 (10 FCFA) | 0.021–0.032 | ~0.013 | Orange 0.30 / MTN 0.33 |
| Togo | ~0.012 (7 FCFA) | ~0.052 | ~0.013 | quote |
| Benin | ~0.015 (9 FCFA) | ~0.030 | — | quote |
| Cameroon | ~0.02 | ~0.032 | ~0.013 (8 FCFA) | quote |
| Senegal | covered (rate on request) | 0.032–0.038 | ~0.013 | quote |
| Kenya | — (francophone only) | **0.006** | — | Safaricom 0.14 / Airtel 0.71 |
| Nigeria | — | **0.004** | — | MTN 0.27 / Glo 0.54 |
| South Africa | — | ~0.015 | — | quote |

**Pattern that matters:**
- **AfrikSMS wins francophone West/Central Africa** — 7–16 FCFA ($0.012–0.027) across Togo, Benin, CI, Cameroon, DRC. Built for exactly this region.
- **Africa's Talking wins East Africa** — Kenya $0.006, Nigeria $0.004 are the cheapest numbers anywhere in this whole document.
- **Orange Developer is cheapest per message (~$0.013)** wherever Orange operates — but on-net only, so it's a supplement, not a whole solution.
- **Plivo stays expensive on the major carriers** everywhere. It's the easy global option, not the cheap African one.
- **BulkSMS / Infobip** = quote-only across the board.

---

## Implementation — will it just work, or do you need to file a request?

| Provider | Sign-up | Test immediately? | Production needs approval? | API surface | Effort |
|---|---|---|---|---|---|
| **AfrikSMS** | Self-serve web portal, 100 free SMS on first buy | Yes | Sender ID request via portal (francophone, usually quick) | HTTP API + web dashboard | **Easy** |
| **Africa's Talking** | Self-serve, free dev sandbox | Yes (sandbox) | **Yes** — per-country Sender ID registration (letterhead + samples, 2–5 business days; DRC Sender ID is free) | REST, mature SDKs, strong docs | **Easy–Medium** |
| **BulkSMS.com** | Self-serve, buy credits | Yes | Sometimes — Sender ID rules vary by country | HTTP / REST / SMPP, very mature | **Easy–Medium** |
| **Plivo** | Self-serve, global | Yes | **Often** — many African routes need Sender ID / number pre-registration | REST, good SDKs & docs | **Medium** |
| **Orange Developer** | Orange Developer account, subscribe per-country API | Yes (sandbox) | **Yes** — "Configure" form per country for sender name + expected volumes | REST, **separate integration per country** | **Medium** |
| **Infobip** | Talk to sales, contract + account manager | No (guided) | Handled for you by their compliance engine | REST, omnichannel platform | **Hard to onboard, smooth after** |

**Translation:**
- **Fastest to a working pilot:** AfrikSMS (sign up, buy, send — minutes) and BulkSMS. Plivo and AT let you test instantly in sandbox but need Sender ID registration before real traffic.
- **Needs paperwork before production:** Africa's Talking (per-country Sender ID), Orange (per-country Configure form). Budget a few days per country.
- **Needs a sales cycle:** Infobip — weeks, not minutes. You don't touch registration yourself, but you don't ship this week either.
- **Hidden multiplier for Orange Developer:** one API *per country*, and on-net only. Covering DRC fully = Orange integration + a second provider for the other networks. Cheap per SMS, most integration work.

---

## Quick take per provider

- **AfrikSMS** — best fit for a francophone-Africa app. Cheap ($0.012–0.027), covers DRC + 15 more markets, self-serve, trivial to start. Downsides: smaller vendor, francophone-only support, lighter docs/tooling than the globals. Confirm deliverability with a live test.
- **Africa's Talking** — cheapest in East/West Africa, solid API and docs, USSD + airtime as bonuses. DRC rate unconfirmed on their own site; onboarding needs per-country Sender ID registration.
- **BulkSMS.com** — mature, reliable, global, but pricing is quote/credit-based (no transparency) and it's a messaging gateway, not a full CPaaS.
- **Plivo** — easiest self-serve global reach with clean per-carrier pricing, but expensive on Africa's major carriers; you pay for convenience.
- **Infobip** — best deliverability and compliance handling for serious volume, direct carrier links across Africa — but enterprise onboarding and opaque pricing. Overkill for a pilot.
- **Orange Developer** — unbeatable per-SMS (~$0.013–0.02) on Orange networks, pay by Orange Money/airtime, but on-net only and one integration per country. Best as a cost-cutting supplement where Orange share is high, not a standalone solution.

---

## Recommendation for Congo

1. **For broad DRC coverage in one integration:** start with **AfrikSMS** (confirmed ~$0.027, self-serve, francophone-native) and **Africa's Talking** as the comparison. Run a live test blast on both to Vodacom/Airtel/Orange/Africell numbers and measure *delivered* rate + real billed cost — not the quoted rate.
2. **If a large share of the audience is on Orange RDC:** add **Orange Developer** direct (~$0.018) for those numbers and route the rest through AfrikSMS/AT. Saves money, costs you a second integration.
3. **Skip for a pilot:** Infobip (sales cycle), BulkSMS (opaque pricing), Plivo for DRC (blended cost ≈ Twilio). Keep Plivo/Infobip in mind only if you later need many countries or enterprise deliverability guarantees.
4. **Build provider-agnostic** — one `sendSms(to, body)` that routes by country (and, for DRC, optionally by network prefix). Then switching or mixing providers is config, not a rewrite.

---

## Caveats & sources

- **Africa's Talking DRC rate is unconfirmed** — CDF 77 comes from a third-party blog (helloduty.com); AT's own pricing page does not list a CDF/DRC rate. Verify with AT before relying on it.
- **Orange Developer is on-net only** — the ~$0.018 rate reaches Orange subscribers, not the whole country.
- **BulkSMS / Infobip pricing is quote-based** — numbers require contacting them; DRC support is confirmed, rates are not public.
- **FX** ≈ XOF/FCFA 600, CDF 2,800 per USD. All rates per segment (160 GSM-7 / 70 Unicode chars), VAT usually excluded.
- **Sources:** afriksms.com; africastalking.com/pricing + help center; plivo.com/sms/pricing/{cd,ke,ci,ng}; developer.orange.com/apis/sms-cd + sms-cm; bulksms.com/pricing; infobip.com/sms/pricing; twilio.com (baseline); DRC AT rate via helloduty.com/country/drc.
