# Miles weekly lessons

Miles (on the phone through xAI, and in the website chat through DM Champ) learns from real conversations once a week. Agents do the work, and Michael approves anything new.

## How it works

1. **Every Monday at 8 AM** a Claude scheduled task on Michael's Mac follows [weekly-prompt.md](weekly-prompt.md):
   - A **drafter** reads the week's unanswered questions and what Miles said, and drafts fixes.
   - A separate **checker** agent fails anything it can't trace to the website, and any draft with a price, a promise, or a guarantee.
2. **The server checks again** (`lib/lessons.js`), whatever the agents said:
   - It refuses unapproved dollar amounts, guarantee language, answers with no source, and search words aimed at a question that doesn't exist.
3. **What goes where:**

| Kind | What it is | Goes live |
|---|---|---|
| `keywords` | Extra search words for an answer Miles already has. The answer text can't change. | Automatically. It's in the weekly email, and you can undo it in /admin → Lessons. |
| `answer` | A new answer drafted from facts already on the website | Only after Michael approves it, or edits and then approves it |
| `question` | Something only Michael knows | Only after Michael writes the answer and approves it |

4. **Phone Miles** uses approved lessons on the next call, with no deploy. They live in the CRM database (`kb_lessons`), and `search_knowledge_base` adds them to the generated knowledge base.
5. **Chat Miles** (DM Champ) needs approved answers pasted into FAQs & Knowledge → Legacy text. /admin → Lessons has a Copy box for that.
6. **Michael gets one email per week**, only when there's something in it.

## Run it by hand

```bash
python3 ~/.claude/skills/local-growth-audit/scripts/lra_tools.py lessons inputs --days 7
```

```bash
python3 ~/.claude/skills/local-growth-audit/scripts/lra_tools.py lessons list
```

## Making a lesson permanent

Approved lessons work as they are. Once in a while, fold the good ones into the website copy or `design/_chat_kb.py`, so the site, the phone, and the chat all say the same thing. Then undo the lesson, since the knowledge base now covers it.

## Not yet connected

- **DM Champ chats.** Until its webhook posts to `/api/crm/ingest`, the job only sees phone calls.
- **Pasting into DM Champ.** Approved answers still have to be pasted by hand.
