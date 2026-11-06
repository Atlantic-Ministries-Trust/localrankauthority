# Website chat agent (DM Champ, AppSumo Tier 6)

The chat bubble on localrankauthority.com is a DM Champ AI agent trained on the new site's content.

## Files
- `instructions.md`: the agent's rules, tone, and handoff steps. Paste into the agent's **AI Instructions** tab.
- `knowledge-base.md`: facts about the business, every service, and 71 questions and answers, built from the new site by `python3 design/_chat_kb.py`. Rerun that script after any change to services, FAQs, or prices, then re-upload the file.
- `widget.html`: paste the DM Champ embed snippet here. The staging build (`design/_stage.py`) adds it to every new page.

## Status (set up 2026-11-06)
- Agent: **Local Rank Authority Assistant** (id `JFz5XsehDM9jTN7C5mfG`), published. AI quality Max, "Human Like" speed, replies after 3 to 8 seconds, at most 2 message bubbles per reply and 30 AI messages per chat, AI disclosure on.
- Instructions: `dmchamp-instructions.txt` (DM Champ's text format). Knowledge: the knowledge base pasted into **FAQs & Knowledge → Legacy text**.
- Widget: brand green `#0B5D3F`, our greeting, 4 starter questions, a "Call (518) 460-1010" button, attachments off, pop-up after 20 seconds, no pre-chat form, allowed on localrankauthority.com, www.localrankauthority.com and redesign.localrankauthority.pages.dev (so it won't show on localhost).
- Lead alerts: email for new contacts, human alerts, chat summaries and low credits (already on by default).
- On staging: all 37 new pages. `widget.html` also keeps the chat bubble above the phone Call / Free score bar.
- Tested 2026-11-06: it disclosed it's an AI, gave no package prices, and refused to guarantee rankings.

## Setup in DM Champ (for reference, or to rebuild)
1. **Create the agent.** Name it something like "Local Rank Authority Assistant".
2. **AI Instructions tab:** paste all of `instructions.md`. Set **AI Quality** to **Max** (0.25 credits per reply).
3. **Knowledge base:** upload or paste `knowledge-base.md`. Don't import the website itself: the live site still has the old content, and a website import charges credits for every chunk it reads.
4. **Web chat widget:** Settings → Channels → add the website chat. Suggested settings:
   - Colors: sign green `#0B5D3F`, button amber `#FFBE00`
   - Greeting: "Hi, I'm the Local Rank Authority assistant. Want to know how your business shows up on Google and in AI answers? Ask me anything."
   - Domain whitelist: `localrankauthority.com` and `redesign.localrankauthority.pages.dev`
5. **Lead alerts:** send conversation and lead notifications to Michael's email or phone.
6. **Optional, appointment booking:** connect Google Calendar so the agent can book 20-minute calls.
7. **Copy the embed snippet** (Manage → Channels & Embed) and paste it into `widget.html`, or send it to Claude to add.
8. **Test it** on the staging site with real questions, including tricky ones: prices, guarantees, "are you a person?", and something it shouldn't know.

## Credits
Tier 6 came with 3,000 one-time credits that don't refill. At 0.25 credits per reply on Max, that's about 12,000 replies. Watch the balance on Settings → Billing, and add credits or connect an Anthropic key (BYOK) if it runs low. Avoid credit-heavy extras you don't need, such as Telegram or WhatsApp Web (50 credits a month each).

## Before it goes on the live site
- Confirm in the privacy policy what the widget stores in the browser (marked with a yellow tag).
- When package prices are confirmed, set `PRICES_CONFIRMED = True` in `design/_chat_kb.py`, rebuild, and re-upload the knowledge base.
