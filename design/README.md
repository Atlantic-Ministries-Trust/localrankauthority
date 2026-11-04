# Homepage redesign (work in progress)

`homepage-redesign.html` is the mockup Michael approved as a starting direction on 2026-11-04. Private preview: https://claude.ai/artifact/XRQag4DZdHmLm9Lp8Fk8cj

This folder is outside `docs/`, so nothing here is on the live site. Open the file in a browser from this folder; the logo loads from `../docs/assets/`.

## To do before it replaces the live homepage

- [ ] **Offers and pricing:** check every package, retainer and audit price against real delivery costs (Michael). Then update `packages.md` in the agent repo to match.
- [ ] **Services:** Michael reviews and customizes the service list and what's in each pillar.
- [ ] **AI search section:** bring back "Be part of the answer" (Access, Clarity, Evidence, Measurement, plus the AI tools row). It's a core selling point.
- [ ] **Working demos:** replace the static phone mockup with the real demos from the live homepage (chat agent, AI receptionist, estimate builder, jingle).
- [ ] **AI voice agent:** set up the xAI voice agent plus a Google Voice number, the same way as AtlanticFlagpole.com, and connect it to the site.
- [ ] **Chat agent:** set up the site chat agent and add it to the site.
- [x] **FAQs:** all 13 live questions are back, plus 6 new ones written the way people ask AI assistants, in 4 groups, with matching FAQPage structured data (19 questions). Re-check the pricing answer ("How much does local SEO cost?") once prices are final.
- [x] **No email address shown** (it gets scraped and spammed). Visitors use "Send Michael a message", which needs a `/contact` page with a form (the live homepage has one to reuse).
- [x] **Full footer:** every service page, audits and pricing, company links, areas served, and a policy row.
- [ ] **Pages the footer links to that don't exist yet** (dotted links in the mockup): Privacy Policy, Terms of Service, SMS Terms (needed before the voice agent sends texts), Accessibility, Contact, Packages, Results, Sample report, and town pages for Troy, Schenectady, and Saratoga Springs. Policy pages are drafts until Michael (or a lawyer) approves them.
- [ ] **Remove the email from the live site too:** it's in the footer and pages of docs/ and in service pages built by functions/services/[slug].js.
- [ ] **Real proof:** Michael's photo, Atlantic Flagpole numbers, one real client quote (yellow tags in the mockup).
- [ ] **Booking:** Cal.com or Calendly account for the booking box.
- [ ] Then rebuild the live `docs/index.html` in this design, keeping the free score form, unlock flow, schema and SEO tags.
