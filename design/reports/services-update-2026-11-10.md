# Services Update: implementation report (internal, not published)

Branch: `try-services-update` (from `staging`). Nothing is live. Miles changes are local files only and are not published to xAI or DM Champ.

## Method disclosure

The handoff asked for the heroes-of-copywriting skill. That skill is not installed in this environment, so the five lenses were applied directly from their published principles:

- **Halbert:** start with the buyer's real problem, using concrete situations.
- **Kennedy:** one clear offer and one clear next step per page.
- **Cialdini:** use only real proof and authority (Michael's ownership history, the Marquee jingle with disclosure). No invented social proof or scarcity.
- **Schwartz:** match the reader's awareness level. Most visitors are problem-aware, so pages lead with the problem, not the mechanism.
- **Carlton:** plain, specific benefit statements, with no hype words.

The substitution is noted here and in the handoff summary.

## Route inventory

| Route | Status | CTA (topic passed to inquiry form) |
|---|---|---|
| /services | **New** overview: 3 categories, need-based chooser, journey explainer, Talk With Michael | Talk With Michael (Not sure yet) |
| /services/content-marketing-podcasts | **New** | Discuss My Content Plan (Content marketing and podcasts) |
| /services/google-search-ads | **New** | Discuss My Search Campaign (Search or YouTube ads) |
| /services/youtube-video-advertising | **New** | Discuss My Video Campaign (Search or YouTube ads) |
| /services/landing-pages | **New** | Discuss My Landing Page (Landing pages) |
| /services/marketing-business-consulting | **New** | Talk With Michael (Marketing and business consulting) |
| /services/custom-jingles | **Revised** as Custom Jingles & Audio Branding | Discuss My Jingle (Branding or a jingle) |
| /services/* (10 others) | Category eyebrow and breadcrumb now point to /services. Copy unchanged. | Free score (unchanged) |
| / (homepage) | Services section rebuilt as 3 categories, plus a Content feature and a consulting intro. Demos, free score, FAQ (6), and contact are unchanged. | unchanged free score CTA |
| /faq | +2 groups, +9 answers (21 → 30). FAQPage schema updated. | — |
| /packages | New `#other-services` section, with no prices | — |
| /comprehensive-audit | One paragraph added on assessing content, ads, and conversion paths | — |
| /custom-jingles-albany-ny (ad page) | Fixed cuts, ownership, and timeline softened to "as agreed in your proposal" | — |

### Other changes

- **Inquiry form:** added the topics Content marketing and podcasts, Search or YouTube ads, Landing pages, and Marketing and business consulting. "Not sure yet" stays the default. Service pages pass `?topic=`, and topics that aren't listed are added automatically.
- **Menu (drawer):** Services are grouped as Online Presence, AI Automation, and Customer Growth, followed by All services. Header links are unchanged.
- **Footer:** one link added, "All services →" at the end of the Services column. Nothing else changed.
- **Anchors:** all homepage anchors are preserved (#visibility-score, #book, #check, #contact, #services, #demos, #results, #about, #faq, #audit). New anchors: /services#online, #ai, #growth, #by-need, #journey; /packages#other-services; /faq#content-and-podcasts, #ads-landing-pages-and-jingles.

### Category placement

| Service | Category | Note |
|---|---|---|
| Branding | Online Presence | Not listed in the brief. Michael can move it. |
| Rank & rent | Online Presence | Not listed in the brief. Michael can move it. |
| Ongoing care | Customer Growth | Not listed in the brief. Michael can move it. |
| Newsletters and reactivation | Not added | No existing material, so no claimed capability (per the brief) |

## Category copy reviews

### Online Presence

- **Audience:** owners whose customers can't find them or don't understand what they offer.
- **Desire:** show up and make sense when buyers compare options.
- **Awareness:** problem-aware.
- **Objection:** "Do I need a new website?" The lede answers that we review what's working first.
- **Offer:** website, SEO and AI visibility, GBP, content.
- **Mechanism:** consistent information plus useful content.
- **Proof:** the free score.
- **CTA:** service links, plus the free score.
- **Corrections:** none.
- **Unresolved claims:** none.

### AI Automation

- **Audience:** busy owners who miss calls and messages.
- **Desire:** never lose an inquiry.
- **Awareness:** problem-aware.
- **Objection:** "Will AI say the wrong thing?" Answered by approved information, limits, testing, and handoff to a person.
- **Offer:** receptionist, chat, estimates, routing.
- **Mechanism:** approved knowledge with a route to a person.
- **Proof:** live demos (Miles, chat, estimate builder).
- **CTA:** demos, plus the free score.
- **Corrections:** none.
- **Unresolved claims:** none.

### Customer Growth

- **Audience:** owners who want more of the right customers now and repeat business later.
- **Desire:** predictable inquiries.
- **Awareness:** solution-aware (they know ads exist).
- **Objection:** "Ads wasted money before." Answered by intent, negatives, tracking, and client-owned accounts.
- **Offer:** consulting, search and YouTube ads, landing pages, jingles, reviews.
- **Mechanism:** priorities first, then campaigns that match intent.
- **Proof:** the Marquee jingle (disclosed).
- **CTA:** per-page Discuss CTAs and Talk With Michael.
- **Corrections:** none.
- **Unresolved claims:** pricing for all new services. They are "priced in your written proposal" with no number.

## Page copy reviews

### Content Marketing & Podcast Syndication

- **Audience:** experts with no time to write.
- **Desire:** a steady, credible voice online.
- **Awareness:** problem-aware ("I know more than my site says").
- **Objection:** time, voice, and control. Answered by "you share and approve; we handle the rest".
- **Offer:** a topic plan, articles, matching episodes, distribution, and a monthly check-in.
- **Mechanism:** real customer questions become the article and the episode.
- **Proof:** none yet. Atlantic Flagpole is a possible future pilot. No sample is claimed, and ownership must be disclosed if it's used.
- **CTA:** Discuss My Content Plan.
- **Corrections applied:**
  - RSS is mentioned only in the process ("a podcast feed (called RSS)"), not in headlines.
  - AI voice only with explicit permission, defined in the proposal. Generated audio is never presented as a self-recording.
  - Distribution is "where setup and publishing are supported," with no guaranteed acceptance.
  - Client responsibilities: provide information and approve scripts.
  - No episode counts, durations, prices, or schedules.
  - Add-ons are listed as "quoted separately".
- **Unresolved claims:** narration options, publishing volume, add-on pricing, and the ownership/licensing wording in the agreement.

### Google Search Ads

- **Audience:** owners who want inquiries sooner, or who were burned by ads before.
- **Desire:** pay for buyers, not clicks.
- **Awareness:** solution-aware.
- **Objection:** wasted spend and unreadable reports. Answered by intent, negatives, client-owned accounts, and reporting that separates clicks from inquiries.
- **Offer:** keyword themes, match types, negatives, geo and schedule, ads, destination, tracking, and testing.
- **Mechanism:** intent matching through to a page that answers the click.
- **Proof:** none claimed.
- **CTA:** Discuss My Search Campaign.
- **Corrections applied:**
  - Paid-repair example ("water heater repair near me") contrasted with a DIY query.
  - Broad match is not called wrong by default.
  - Geo targeting is described as "close, not an exact fence".
  - CTR is defined (5 per 1,000 = 0.5%) with no universal minimum.
  - No guaranteed leads.
- **Unresolved claims:** management fee and minimum budget. The account-ownership and direct-billing wording says "where agreed" and needs Michael's confirmation.

### YouTube Video Advertising

- **Audience:** businesses building a recognizable name.
- **Desire:** be known before the need arises.
- **Awareness:** unaware or problem-aware.
- **Objection:** "People skip ads" and cost. Answered by designing the first 5 seconds and explaining billing plainly.
- **Offer:** creative, production within scope, optional jingle, targeting, a destination page, and reporting.
- **Mechanism:** name and hook in the first five seconds.
- **Proof:** none claimed.
- **CTA:** Discuss My Video Campaign.
- **Corrections applied:**
  - Skippable after 5 seconds.
  - CPV charges at 30 seconds, completion of a shorter ad, or interaction. Other strategies may charge by impression.
  - TV screens are "one possible placement," not traditional TV.
  - A full jingle isn't required before the offer is explained.
- **Unresolved claims:** production tiers and pricing.

### Landing Pages & Video Landing Pages

- **Audience:** advertisers whose clicks don't convert.
- **Desire:** more inquiries from the same traffic.
- **Awareness:** problem-aware.
- **Objection:** "Will it work with my site?" Answered as "usually yes, we check first".
- **Offer:** one page per offer, with proof, one action, optional video, and tracking.
- **Mechanism:** message match.
- **Proof:** none claimed.
- **CTA:** Discuss My Landing Page.
- **Corrections applied:**
  - Faucet-repair example.
  - Content works without video; captions and controls; no forced autoplay.
  - No mass near-identical town pages.
  - No invented guarantees.
  - Clarifies that the Growth Audit includes one page.
- **Unresolved claims:** platform hosting costs, and pricing per page.

### Marketing & Business Consulting

- **Audience:** owners unsure where to spend next.
- **Desire:** clarity and priorities.
- **Awareness:** problem-aware but solution-confused.
- **Objection:** "You'll just sell me your services." Answered by "sometimes the best answer is a small fix or keeping a tool".
- **Offer:** discovery, diagnosis, recommendations, scoped implementation, and optional review.
- **Mechanism:** a whole-journey review.
- **Proof:** Michael's ownership history (on other pages).
- **CTA:** Talk With Michael.
- **Corrections applied:**
  - The Growth Audit remains the entry to setup packages.
  - Not legal, tax, or financial advice.
  - No sales-training offer.
- **Unresolved claims:** consulting format and price (hourly, session, or project).

### Custom Jingles & Audio Branding (revised)

- **Audience:** businesses running video, audio, or podcasts.
- **Desire:** be remembered and recognized.
- **Awareness:** solution-aware.
- **Objection:** "Will it sound cheesy?" Answered by style range and approving the direction first.
- **Offer:** brief, original lyrics and melody, production, hooks and versions as agreed, approval steps, files, and documented rights.
- **Mechanism:** name plus what you do plus how to reach you.
- **Proof:** the real Marquee jingle (14s, controls, no autoplay, preload none) with Laiala's quote and the relationship disclosure.
- **CTA:** Discuss My Jingle.
- **Corrections applied:**
  - Removed the fixed "5, 15, 30-second versions", "revision rounds", and "two to four weeks". These are now "as agreed in your scope/proposal".
  - Added uses: podcasts, YouTube, landing-page video.
  - No recall or sales promise.
  - The mentor's $2,000 price, no-choice policy, and bonus were not adopted.
- **Unresolved claims:** price, versions included, revision count, and rights wording.

## Content rules checked

- **Mentor examples:** Haynes Pest Control, Nashville Party Boat Rental, and Mount Lawley Pest Control appear nowhere.
- **No new offers** for sales training, Microsoft Ads, Meta Ads, or social management. Note: the existing Monthly care "Dominate" row already lists "Meta ads" and "video and jingle placements". It is unchanged, but it conflicts with the brief's "no Meta Ads offers", so Michael should decide whether to keep it.
- **No external actions:** no ad accounts created, no campaigns launched, no money spent.
- **No em dashes** in new copy. The only one is inside Laiala's own quote.

## Tests

- `node --test tests/`: 22 of 22 pass.
- Built docs/: 48 pages. Internal link and anchor check: 0 broken.
- Inquiry topic list verified in the built homepage.
- Preview checked at desktop and phone widths (see the handoff message).

## Unavailable assets

- Content and podcast sample: none exists. Atlantic Flagpole is a possible future pilot.
- Ad, YouTube, landing-page, and consulting case studies: none.
- Newsletter or reactivation material: none, so it was not added.

## Commercial decisions still unset (Michael)

1. Prices or price ranges for: content and podcasts, search ads management, YouTube production and management, extra landing pages, consulting, and jingles.
2. Content: publishing cadence options, narration options (narrator vs. AI voice), and add-on menu.
3. Ads: minimum ad budget, and confirmation that client-owned accounts with direct billing are standard.
4. Jingles: versions included, revision count, and rights wording.
5. Consulting format (session, project, or retainer).
6. Category placement of Branding, Rank & rent, and Ongoing care.
7. Whether the "Meta ads" line in the Dominate plan stays.

## Separation of actions

| Area | Status |
|---|---|
| Code and content | On branch `try-services-update`. Experiment preview only. |
| Deploy | Not live. Needs Michael's "Yes, go live" (staging → main, then a live tag). |
| Miles phone | Local edits in `design/voice-agent/instructions.md`. Must be pasted into xAI and published. lib/voicekb.js (search tool) updates automatically on deploy. |
| Miles chat | Local edits in `design/chat-agent/*`. Must be pasted into DM Champ and published. |
| External | None taken. |
