# Homepage redesign (work in progress)

`homepage-redesign.html` is the mockup Michael approved as a starting direction on 2026-11-04. Private preview: https://claude.ai/artifact/XRQag4DZdHmLm9Lp8Fk8cj

This folder is outside `docs/`, so nothing here is on the live site. Open any page in a browser from this folder; logos load from `../docs/assets/`. To edit an inner page, change `content/<page>.html` (or `_towns.py` for town pages), then run `python3 design/_towns.py && python3 design/_build.py`. The homepage wording now says "working with local businesses across the US"; the live SEO title will be "Local SEO & AI Search for Service Businesses | Albany, NY".

## Staging site (branch `redesign`)

Working copy of the full new site: https://redesign.localrankauthority.pages.dev (hidden from search engines; the live site is untouched).

- Edit drafts here in `design/`, then run `python3 design/_towns.py && python3 design/_build.py && python3 design/_lp.py && python3 design/_stage.py`, commit, and push the `redesign` branch. Cloudflare redeploys staging in about a minute.
- `_stage.py` copies everything into `docs/` with real links and carries over the live homepage's free score, unlock flow, AI search section, demos and contact form.
- **Free score and forms on staging** need Cloudflare's *Preview* settings to match Production: Workers & Pages → localrankauthority → Settings → Bindings (KV `REPORTS` → `lra-reports`, Workers AI `AI`) and Variables and Secrets (`PSI_KEY`, `SERPAPI_KEY`, `GEMINI_KEY`, `RESEND_KEY`, `OWNER_EMAIL`, `FROM_EMAIL`, `AGENT_TOKEN`), each set for the Preview environment. Michael pastes the keys himself.
- **Going live** = merge `redesign` into `main` (with Michael's OK), after removing the staging banner.

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
- [x] **Inner pages drafted** (in this folder, built from `content/` by `_build.py`): Privacy Policy, Terms of Service, SMS Terms, Accessibility, Contact (simple form plus a Google Map of the Albany area, no home address), Why Us, Packages, Results, Sample report, Areas we serve (38 towns by county), and 8 town pages: Troy, Schenectady, Saratoga Springs, Clifton Park, Colonie and Latham, Glens Falls and Lake George, Bethlehem and Delmar, Amsterdam. Town pages come from `_towns.py`; each needs real local detail, never a copy with the name swapped.
- [ ] **Michael to fill in:** a mailing address that isn't his home (PO box or mailbox service) for the policy pages, phone hours, refund and cancellation policy, payment terms, data retention periods, texting and voice providers, and the effective dates. Then a lawyer or Michael approves the policy pages.
- [ ] **Pricing review:** packages page shows today's prices (monthly plans as "starting at"), marked "to confirm."
- [x] **Email removed from the live site** (replaced with "Send a message" links).
- [ ] **Real proof:** Michael's photo, Atlantic Flagpole numbers, one real client quote (yellow tags in the mockup).
- [ ] **Booking:** Cal.com or Calendly account for the booking box.
- [ ] Then rebuild the live `docs/index.html` in this design, keeping the free score form, unlock flow, schema and SEO tags.
