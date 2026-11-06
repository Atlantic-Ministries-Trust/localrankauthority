# Website chat agent (DM Champ, AppSumo Tier 6)

The chat bubble on localrankauthority.com is a DM Champ AI agent trained on the new site's content.

## Files
- `instructions.md`: the agent's rules, tone, and handoff steps. Paste into the agent's **AI Instructions** tab.
- `knowledge-base.md`: facts about the business, every service, and 71 questions and answers, built from the new site by `python3 design/_chat_kb.py`. Rerun that script after any change to services, FAQs, or prices, then re-upload the file.
- `widget.html`: paste the DM Champ embed snippet here. The staging build (`design/_stage.py`) adds it to every new page.

## Setup in DM Champ (Michael does these, signed in to his own account)
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
