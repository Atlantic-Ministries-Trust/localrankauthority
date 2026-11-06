# CRM and AI phone calls: plan (draft, 2026-11-06)

Goal: one CRM in the website's owner dashboard (`/admin`) that holds every lead and every conversation: xAI phone calls (with transcripts and recordings), website chats (DM Champ), forms, and free scores. Keep costs and AI credits low.

## How a call flows
1. Caller dials (518) 460-1010 (Google Voice).
2. Google Voice forwards to a Twilio number. Twilio routes the call to xAI's voice agent over SIP and records it (dual channel).
3. xAI sends a signed "incoming call" webhook to our site. Our Cloudflare backend joins the call: it gives the agent its instructions and knowledge, handles its tools (save lead, transfer to Michael, later booking), and receives the live transcript of both sides.
4. When the call ends, the call is written to the CRM: caller, time, length, transcript, AI summary, urgency, and outcome. Michael gets an email summary.
5. **Recordings stay on Twilio.** The CRM stores only the recording ID, and the dashboard plays it through a signed-in proxy, so there's no second copy on our side. Twilio storage is free for the first 10,000 minutes a month.

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
- xAI voice: $0.08 per minute
- Twilio: number about $1 to $2 a month, inbound about 1¢ a minute, recording $0.0025 a minute, storage free up to 10,000 minutes a month
- Cloudflare D1, Workers and Durable Objects: free tiers cover this volume
- DM Champ: chat on Max, from the 3,000 credits

## Build phases
1. **CRM foundation**: D1 schema, move the pipeline over, contacts, timeline and pipeline screens in `/admin`, website forms flowing in.
2. **xAI call pipeline**: Twilio SIP to xAI, call handler (Durable Object), tools, transcripts, summaries, email alerts, recording playback. The agent says calls may be recorded, and the privacy policy is updated.
3. **DM Champ chat ingest** into the same timeline.
4. **Extras**: booking, daily digest, Pabbly pushes.

## What Michael needs to set up (he pastes all keys himself)
- Create a D1 database in Cloudflare and bind it to the Pages project (Production and Preview).
- A Twilio account and a local number. Set Google Voice to forward to it, showing the caller's number.
- His xAI API key as a Cloudflare secret.
- Later: a DM Champ webhook pointed at the site.
