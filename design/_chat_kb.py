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
    """All 21 answers from the Questions and Answers page (design/content/faq.html); the homepage shows six of them."""
    t = (D / "content" / "faq.html").read_text()
    return [(clean(q), clean(a)) for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", t, re.S)]


BUSINESS = """# Local Rank Authority: facts for the chat assistant

## The business
- Name: Local Rank Authority
- Website: https://localrankauthority.com
- Phone: (518) 460-1010
- Hours: Monday to Friday, 9 AM to 5 PM Eastern. Messages sent after hours are answered the next business day.
- Based in New York's Capital Region (Albany area). Works with local businesses across the United States; most clients are in and around Albany, Schenectady, Troy, Saratoga Springs, and Clifton Park.
- Owner: Michael Carlson. Clients work with Michael directly, with no account managers.
- Michael has owned Atlantic Flagpole (flagpole sales and installation, now a national online store) since 2008, and co-founded The Christmas Guys (holiday lighting installation, Clifton Park) in 2009. He sold his share of The Christmas Guys in 2023.
- Slogan: Get found. Win the conversation. Stay remembered. That's the customer journey; services are grouped in three categories.
- Service categories: Online Presence (website design and improvements, SEO and AI search visibility, Google Business Profile and listings, content marketing and podcast syndication, branding). AI Automation (AI receptionist, AI chat agents, lead capture, estimate builders, inquiry routing and follow-up). Customer Growth (marketing and business consulting, Google Search Ads, YouTube video advertising, landing pages and video landing pages, custom jingles and audio branding, review systems). All at https://localrankauthority.com/services
- Outside the three categories: Ongoing Care is the monthly plan that keeps everything working after launch (updates, review replies, upkeep, a plain monthly report). Rank & Rent lead sites are a different arrangement: Local Rank Authority builds and owns a lead site and rents its leads to one business.
- Not sure which service fits: Michael starts with a conversation (marketing and business consulting) to find what to fix first. The Comprehensive Growth Audit stays the starting point for setup packages.
- New services (content, Search Ads, YouTube ads, landing pages beyond the audit's one, consulting, jingles) are priced in a written proposal; there is no published price for them. Ad spend is billed by Google directly to the client where agreed, in an account the client owns. Never quote a price for these.
- How to get in touch: call (518) 460-1010, send a message at https://localrankauthority.com/contact, or start with the free score at https://localrankauthority.com/#book
- No long contracts. Clients own their website, content, domain, and Google Business Profile. Rank-and-rent lead sites are the exception: Local Rank Authority owns those.

## Who it helps
Local service businesses that depend on calls and bookings: contractors and home services, professional offices, event and rental companies, seasonal businesses, shops and studios.

## How working together usually goes
1. Free Local Visibility Score: about a minute, free, no call needed. It checks website speed, SEO basics, where the business ranks on Google and Bing for its service and city, and the mentions returned in selected AI answers. https://localrankauthority.com/#book
2. Comprehensive Growth Audit: $2,000, delivered in 5 business days. A 20 to 25 page report, a private client portal, copy ready to paste, a finished landing page, a 30/60/90-day plan, and a 45-minute walkthrough with Michael. The full $2,000 is credited toward any setup package started within 30 days. https://localrankauthority.com/comprehensive-audit
3. A setup package that fixes the biggest problems, with a written proposal and a fixed price.
4. Monthly care: steady improvement and a plain-English monthly report.
"""

BRANDING_PRICES = ("- Branding packages (one time, published at https://localrankauthority.com/packages#branding): "
                   "Brand Refresh $2,000 (about 2 weeks), Brand Identity $5,500 (3 to 4 weeks), Brand + Rollout $12,000 (6 to 8 weeks). "
                   "They start with a Brand Discovery Session for $500, credited in full toward any branding package started within 30 days; no audit needed. "
                   "Printing, vehicle wraps, signs, and installation are quoted separately.\n")

PRICES_CONFIRMED_TEXT = """
## Prices
- Free Local Visibility Score: free.
- Comprehensive Growth Audit: $2,000.
- Setup packages: Get Found $7,500 (4 to 6 weeks), Win the Conversation $19,000 (8 to 10 weeks), Market Authority $25,000 (10 to 12 weeks).
- Monthly care, starting at: Essentials $2,500, Growth $5,000, Authority $7,500, Dominate $10,000 per month.
""" + BRANDING_PRICES + """- Not included: costs paid to other companies, such as ad spend, call tracking, phone and texting fees, and software subscriptions. Each is listed in the proposal.
- Full details: https://localrankauthority.com/packages
"""

PRICES_PENDING_TEXT = """
## Prices
- Free Local Visibility Score: free.
- Comprehensive Growth Audit: $2,000, credited toward a setup package started within 30 days.
- Setup packages and monthly care are quoted in a written proposal with a fixed price, after the audit or a call with Michael. The scope depends on the business, its market, and what it already has.
- Costs paid to other companies (ad spend, call tracking, phone and texting fees, software subscriptions) are listed separately in the proposal.
""" + BRANDING_PRICES + """- Do not quote any dollar amounts other than the ones listed here. If someone wants a ballpark, offer a call with Michael at (518) 460-1010 or the free score.
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


VOICE_OUT = D.parent / "lib" / "voicekb.js"


# How to get around the website, for both Mileses (keep in step with the header menu in design/homepage-redesign.html)
SITE_GUIDE = """
## Finding your way around the website
Help visitors find pages like a support assistant on a store website: say where to tap or click, and share the direct link.
- On a phone: the menu button is at the top right (three short lines). The magnifying glass next to it searches the site. Two buttons stay at the bottom of the screen: Call and Free score.
- On a computer: the top bar has Services, Audits, Demos, Our Work, About, and FAQs, plus Client login, the phone number, and a Get My Free Score button.
- All services on one page, grouped three ways and with a "start with what you need" list: https://localrankauthority.com/services
- The menu has four groups. Services, in three categories: Online Presence (Website design, SEO & AI search, Google profile & listings, Content marketing & podcasts, Branding & brand identity), AI Automation (AI receptionist, AI chat agents, Lead capture & follow-up), and Customer Growth (Marketing & business consulting, Google Search Ads, YouTube video ads, Landing pages, Custom jingles & audio branding, Review systems), then After launch (Ongoing care & reporting), Lead sites (Rank & rent lead sites), and All services. Audits & pricing (Free Local Visibility Score, Comprehensive Growth Audit, Sample audit report, Packages & pricing). Areas we serve (Albany, Troy, Schenectady, Saratoga Springs, Clifton Park, and more). Company (Why work with us, About Michael, Results, the Marquee Moments case study, Live demos, Questions & answers, Contact, Client login).
- Every page's footer repeats these links, plus Privacy, Terms, SMS terms, and Accessibility.
- Clients sign in at Client login (https://localrankauthority.com/portal/) with a link sent to their email; there's no password.
- Never say you can't help with the website or don't have access to it.
"""


def write_voice_kb(general_faqs):
    """The phone agent's knowledge base: short question/answer entries its search_knowledge_base tool searches.
    Built from the same content as the chat knowledge base, so phone and chat answers match."""
    import json
    entries = []
    for line in BUSINESS.strip().splitlines():
        if line.startswith("- ") and ":" in line:
            k, v = line[2:].split(":", 1)
            entries.append({"q": k.strip(), "a": v.strip(), "tags": "business facts"})
    prices = PRICES_CONFIRMED_TEXT if PRICES_CONFIRMED else PRICES_PENDING_TEXT
    entries.append({"q": "Prices and what things cost", "a": " ".join(l[2:] for l in prices.strip().splitlines() if l.startswith("- ")), "tags": "price cost pricing how much"})
    entries.append({"q": "How much does branding cost?", "a": BRANDING_PRICES[2:].strip(), "tags": "branding brand identity logo rebrand refresh price cost how much package discovery session"})
    entries.append({"q": "How working together usually goes", "a": " ".join(l[3:] for l in BUSINESS.split("## How working together usually goes")[1].strip().splitlines()), "tags": "process steps start"})
    for s in _services.SERVICES:
        url = f"https://localrankauthority.com/services/{s['slug']}"
        entries.append({"q": f"What is {s['name']}?", "a": f"{s['desc']} Includes: " + "; ".join(h for h, _ in s["included"]) + f". Timing: {s['timeline']} More: {url}",
                        "tags": s["name"] + " " + s["service_type"]})
        for q, a in s["faqs"]:
            entries.append({"q": q, "a": a, "tags": s["name"]})
    for q, a in general_faqs:
        entries.append({"q": q, "a": a, "tags": "general"})
    entries.append({"q": "How do I find my way around the website?", "a": " ".join(l[2:] for l in SITE_GUIDE.strip().splitlines() if l.startswith("- ") and "Never say" not in l),
                    "tags": "website menu navigate navigation hamburger find page where tap click search login portal footer"})
    VOICE_OUT.write_text("// Generated by design/_chat_kb.py from the website's content. Do not edit by hand.\n"
                         "export const VOICE_KB = " + json.dumps(entries, ensure_ascii=False, indent=1) + ";\n")
    print(f"wrote lib/voicekb.js ({len(entries)} entries)")


def main():
    parts = [BUSINESS, PRICES_CONFIRMED_TEXT if PRICES_CONFIRMED else PRICES_PENDING_TEXT, services_section()]
    faqs = homepage_faqs()
    if not PRICES_CONFIRMED:
        faqs = [(q, PENDING_COST_ANSWER if q in ("How much does local SEO cost?", "How much does implementation cost?") else a) for q, a in faqs]
    parts.append("\n## General questions\n" + "\n".join(f"- Q: {q}\n  A: {a}" for q, a in faqs))
    parts.append(SITE_GUIDE)
    parts.append("""
## Pages worth sharing
- Free score: https://localrankauthority.com/#book
- Contact: https://localrankauthority.com/contact
- Why work with us: https://localrankauthority.com/why-us
- Results: https://localrankauthority.com/results
- Sample audit report: https://localrankauthority.com/sample-report
- Areas we serve: https://localrankauthority.com/areas
- Packages and pricing: https://localrankauthority.com/packages
- Case study, Marquee Moments: https://localrankauthority.com/results/marquee-moments
- Live demos: https://localrankauthority.com/#demos
- Questions and answers: https://localrankauthority.com/#faq
- Client login: https://localrankauthority.com/portal/
- Privacy policy: https://localrankauthority.com/privacy
""")
    text = "\n".join(parts)
    if not PRICES_CONFIRMED:
        # the FAQ answers can mention package prices; keep the agent to the audit price until confirmed
        assert "$7,500" not in text and "$19,000" not in text, "unconfirmed package prices leaked into the knowledge base"
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text)
    write_voice_kb(faqs)
    print(f"wrote {OUT.relative_to(D.parent)} ({len(text):,} characters)")


if __name__ == "__main__":
    main()
