"""Build the DM Champ chat agent's knowledge base from the same content as the website.

    python3 design/_chat_kb.py  ->  design/chat-agent/knowledge-base.md

Paste or upload that file into the DM Champ agent's Knowledge Base. Rerun it whenever the
site's services, FAQs, or prices change, so the chat agent never says something the site doesn't.
A curated file is cheaper than importing the whole website (DM Champ charges credits per chunk
it reads) and leaves out drafts, placeholders, and staging notes.
"""
import html
import re
from pathlib import Path

import _services

D = Path(__file__).resolve().parent
OUT = D / "chat-agent" / "knowledge-base.md"

# Flip to True once Michael confirms package prices; until then the agent quotes only the audit.
PRICES_CONFIRMED = False


def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def homepage_faqs():
    t = (D / "homepage-redesign.html").read_text()
    sec = re.search(r'<section id="faq".*?</section>', t, re.S).group(0)
    return [(clean(q), clean(a)) for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", sec, re.S)]


BUSINESS = """# Local Rank Authority: facts for the chat assistant

## The business
- Name: Local Rank Authority
- Website: https://localrankauthority.com
- Phone: (518) 460-1010
- Hours: Monday to Friday, 9 AM to 5 PM Eastern. Messages sent after hours are answered the next business day.
- Based in New York's Capital Region (Albany area). Works with local businesses across the United States; most clients are in and around Albany, Schenectady, Troy, Saratoga Springs, and Clifton Park.
- Owner: Michael Carlson. Clients work with Michael directly, with no account managers.
- Michael has owned Atlantic Flagpole (flagpole sales and installation, now a national online store) since 2008, and co-founded The Christmas Guys (holiday lighting installation, Clifton Park) in 2009. He sold his share of The Christmas Guys in 2023.
- Slogan: Get found. Win the conversation. Stay remembered.
- How to get in touch: call (518) 460-1010, send a message at https://localrankauthority.com/contact, or start with the free score at https://localrankauthority.com/#book
- No long contracts. Clients own their website, content, domain, and Google Business Profile. Rank-and-rent lead sites are the exception: Local Rank Authority owns those.

## Who it helps
Local service businesses that depend on calls and bookings: contractors and home services, professional offices, event and rental companies, seasonal businesses, shops and studios.

## How working together usually goes
1. Free Local Visibility Score: about a minute, free, no call needed. It checks website speed, SEO basics, where the business ranks on Google, Bing, and DuckDuckGo, and whether AI assistants recommend it. https://localrankauthority.com/#book
2. Comprehensive Growth Audit: $2,000, delivered in 5 business days. A 20 to 25 page report, a private client portal, copy ready to paste, a finished landing page, a 30/60/90-day plan, and a 45-minute walkthrough with Michael. The full $2,000 is credited toward any setup package started within 30 days. https://localrankauthority.com/comprehensive-audit
3. A setup package that fixes the biggest problems, with a written proposal and a fixed price.
4. Monthly care: steady improvement and a plain-English monthly report.
"""

PRICES_CONFIRMED_TEXT = """
## Prices
- Free Local Visibility Score: free.
- Comprehensive Growth Audit: $2,000.
- Setup packages: Get Found $7,500 (4 to 6 weeks), Win the Conversation $19,000 (8 to 10 weeks), Market Authority $25,000 (10 to 12 weeks).
- Monthly care, starting at: Essentials $2,500, Growth $5,000, Authority $7,500, Dominate $10,000 per month.
- Not included: costs paid to other companies, such as ad spend, call tracking, phone and texting fees, and software subscriptions. Each is listed in the proposal.
- Full details: https://localrankauthority.com/packages
"""

PRICES_PENDING_TEXT = """
## Prices
- Free Local Visibility Score: free.
- Comprehensive Growth Audit: $2,000, credited toward a setup package started within 30 days.
- Setup packages and monthly care are quoted in a written proposal with a fixed price, after the audit or a call with Michael. The scope depends on the business, its market, and what it already has.
- Costs paid to other companies (ad spend, call tracking, phone and texting fees, software subscriptions) are listed separately in the proposal.
- Do not quote any other dollar amounts. If someone wants a ballpark, offer a call with Michael at (518) 460-1010 or the free score.
"""


PENDING_COST_ANSWER = ("The Comprehensive Growth Audit is $2,000, credited in full toward any package you start within 30 days. "
                       "Setup packages and monthly care are priced in a written proposal with a fixed price before you commit to anything.")


def services_section():
    out = ["\n## Services\n"]
    for s in _services.SERVICES:
        out.append(f"### {s['name']}\nPage: https://localrankauthority.com/services/{s['slug']}\n")
        out.append(s["desc"] + "\n")
        out.append("What's included:\n" + "\n".join(f"- {h}: {p}" for h, p in s["included"]) + "\n")
        out.append("Good fit for: " + "; ".join(s["fit"]) + ".\n")
        out.append("Timing: " + s["timeline"] + "\n")
        out.append("Questions:\n" + "\n".join(f"- Q: {q}\n  A: {a}" for q, a in s["faqs"]) + "\n")
    return "\n".join(out)


def main():
    parts = [BUSINESS, PRICES_CONFIRMED_TEXT if PRICES_CONFIRMED else PRICES_PENDING_TEXT, services_section()]
    faqs = homepage_faqs()
    if not PRICES_CONFIRMED:
        faqs = [(q, PENDING_COST_ANSWER if q == "How much does local SEO cost?" else a) for q, a in faqs]
    parts.append("\n## General questions\n" + "\n".join(f"- Q: {q}\n  A: {a}" for q, a in faqs))
    parts.append("""
## Pages worth sharing
- Free score: https://localrankauthority.com/#book
- Contact: https://localrankauthority.com/contact
- Why work with us: https://localrankauthority.com/why-us
- Results: https://localrankauthority.com/results
- Sample audit report: https://localrankauthority.com/sample-report
- Areas we serve: https://localrankauthority.com/areas
- Privacy policy: https://localrankauthority.com/privacy
""")
    text = "\n".join(parts)
    if not PRICES_CONFIRMED:
        # the FAQ answers can mention package prices; keep the agent to the audit price until confirmed
        assert "$7,500" not in text and "$19,000" not in text, "unconfirmed package prices leaked into the knowledge base"
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(D.parent)} ({len(text):,} characters)")


if __name__ == "__main__":
    main()
