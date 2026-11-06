# CRM and AI phone calls: plan (draft, 2026-11-06)

Goal: one CRM in the website's owner dashboard (`/admin`) that holds every lead and every conversation: xAI phone calls (with transcripts and recordings), website chats (DM Champ), forms, and free scores. Keep costs and AI credits low.

## How a call flows (decision 2026-11-06: xAI-hosted voice agents, no Twilio)
1. Caller dials (518) 460-1010 (Google Voice), which forwards to the xAI voice agent's phone number, the same setup as Atlantic Flagpole.
2. During the call, the agent uses a tool on our site (an MCP server or a custom function, secured with a secret token) to save the caller's details, the reason for the call, a summary, and how urgent it is.
3. The call appears in the CRM and Michael gets an email summary.
4. **Recordings and full transcripts stay in xAI.** The CRM links to them and stores no copy. To confirm in phase 2, in Michael's xAI console: whether the console agent builder allows custom tools or MCP, whether it has call logs and recordings with linkable URLs, and whether it can send a webhook after each call. If none of these exist, the CRM keeps the agent's summary and a link to the console's call history.

## CRM data (Cloudflare D1, a free SQLite database)
- **Companies and contacts**, merged by phone, email, or website.
- **Timeline**: calls (player, transcript, summary), chats, form messages, free scores, emails, notes.
- **Pipeline**: today's stages (New lead → Won/Lost), value, package, follow-up date. The existing KV pipeline records move over.
- **Tasks and follow-ups**, tags, search, and filters (missed or urgent calls, no reply yet).
- Optional daily email digest.

## Other inputs
- **DM Champ chats**: DM Champ webhook → `/api/crm/ingest` → chat transcript and lead on the contact's timeline.
- **Website forms** (contact page, free score unlock, audit intake): written to the CRM as well as today's KV.
- **Pabbly Connect**: only for pushing CRM events to apps we don't want to code against (Google Sheets, another CRM). It doesn't lower xAI or DM Champ costs.

## Running costs (estimates; confirm on each vendor's pricing page)
- xAI voice: $0.08 per minute, plus about $0.01 a minute for an xAI-provided number
- Cloudflare D1, Workers and Durable Objects: free tiers cover this volume
- DM Champ: chat on Max, from the 3,000 credits

## Status
- **Phase 1 is live (2026-11-06)** on localrankauthority.com/admin: Contacts, Calls & activity, and Tasks tabs. D1 database `lra-crm` is bound as `CRM` (Production only). Existing records were imported: 2 contacts.
- Preview (staging) has no bindings or secrets at all, so the staging dashboard can't sign in. That's fine until launch.
- For phase 2, set the `CRM_INGEST_TOKEN` secret in Cloudflare (Production), then give the xAI agent a tool that posts to `/api/crm/ingest`.
- Michael's Cloudflare account also has `afp_command_center` (Atlantic Flagpole). Check whether his xAI agent already logs calls there; that would show the pattern to reuse.

## Build phases
1. **CRM foundation**: D1 schema, move the pipeline over, contacts, timeline and pipeline screens in `/admin`, website forms flowing in.
2. **xAI calls**: a save-the-call tool for the xAI agent, the call log in the CRM, email alerts, and links to xAI recordings. The privacy policy mentions call recording if xAI records calls.
3. **DM Champ chat ingest** into the same timeline.
4. **Extras**: booking, daily digest, Pabbly pushes.

## What Michael needs to set up (he pastes all keys himself)
- Create a D1 database in Cloudflare and bind it to the Pages project (Production and Preview).
- Google Voice forwarding to the xAI agent's number, showing the caller's number.
- His xAI API key as a Cloudflare secret.
- Later: a DM Champ webhook pointed at the site.
