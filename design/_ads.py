"""Writes design/lp/ads.md: search ads (Google + Microsoft, same format), Meta ads,
keywords, and negatives for each landing page. Fails if any line breaks a platform limit.
Run: python3 design/_ads.py
"""
import pathlib
OUT = pathlib.Path(__file__).parent / "lp" / "ads.md"
H, DESC, MH, MD = 30, 90, 40, 30  # RSA headline, RSA description, Meta headline, Meta description

ADS = [
 dict(slug="local-seo-albany-ny", name="Local SEO & AI Search",
  h=["Local SEO in Albany, NY","Get Found on Google Maps","Show Up in AI Answers","Free Visibility Score","See Where You Rank Free","Rank in the Map Pack","Capital Region Local SEO","Work With the Owner","No Long Contracts","Plain-English Reports","Get Recommended by AI","More Calls From Google"],
  d=["See where you rank on Google, Bing, and in AI answers. Free score in about a minute.",
     "Google profile, town pages, listings, and reviews, done for you. No long contracts.",
     "Run by a local business owner. You work with Michael directly, not an account manager.",
     "Monthly reports on rankings, AI mentions, and calls, in plain English."],
  meta=["Your best customers are searching Google Maps and asking ChatGPT who to hire. Are they finding you, or your competitor?\n\nGet your free Local Visibility Score: speed, SEO, rankings, and AI recommendations in about a minute.",
        "Most calls go to the three businesses at the top of Google Maps. Find out where you stand in the Capital Region, free, in about a minute."],
  mh=["See where you rank, free","Are you in the top 3 on Maps?"], md=["Free score in 1 minute"],
  kw=["local seo albany ny","local seo company albany","seo company near me","google maps ranking help","local seo services capital region","seo for small business albany","ai search optimization","get my business on google maps"],
  neg=["jobs","salary","course","free tools","wordpress plugin","what is"]),
 dict(slug="website-design-albany-ny", name="Website Design",
  h=["Website Design Albany NY","Websites That Book Jobs","Mobile-First Websites","Free Website Score","Built to Turn Visits to Calls","Capital Region Web Design","You Own Your Website","Fast, Clear, Easy to Book","Booking and Quotes Built In","Work With the Owner","Is Your Site Losing Calls?","Get a Free Site Check"],
  d=["Fast, mobile-first websites for service businesses, built to turn visitors into calls.",
     "Get a free score of your current site: speed, SEO, and how you show up on Google.",
     "Booking, quote forms, and click-to-call on the first screen. You own the site.",
     "Run by a local business owner. A fixed price in writing before you commit."],
  meta=["Most of your website visitors are on a phone, and they decide in seconds whether to call.\n\nGet a free score of your current site, then see what a site built to book jobs looks like.",
        "Is your website bringing in calls, or sending visitors to your competitor? Free website and visibility score for Capital Region businesses."],
  mh=["Free website score in 1 minute","A site that books jobs"], md=["Albany & Capital Region"],
  kw=["website design albany ny","web designer albany","small business website design","contractor website design","website redesign albany","web design capital region ny","mobile friendly website for business"],
  neg=["free website builder","template","jobs","course","logo only","wix login"]),
 dict(slug="ai-receptionist-albany-ny", name="AI Receptionist",
  h=["AI Receptionist for Business","Never Miss Another Call","Answer Calls 24/7","Books Appointments for You","Texts You Every Call Summary","Stop Losing After-Hours Calls","Natural-Sounding AI Voice","Albany AI Receptionist","Trained on Your Business","You Approve What It Says","Book a Live Demo","Missed Calls Cost Jobs"],
  d=["An AI receptionist answers missed and after-hours calls, books the job, and texts you.",
     "Trained only on what you approve. Anything unusual goes straight to you.",
     "Keep your number. It picks up the calls you can't, nights, weekends, and busy days.",
     "Set up and tested by a local business owner. See a live demo on a short call."],
  meta=["You're on a job. The phone rings. They don't leave a voicemail, they call the next company.\n\nAn AI receptionist answers in a natural voice, books the appointment, and texts you the details.",
        "What happens to calls you miss after 5 pm? An AI receptionist answers, books, and sends you a summary, every time."],
  mh=["Never miss another call","Answer every call, 24/7"], md=["Built for local businesses"],
  kw=["ai receptionist","ai receptionist for small business","virtual receptionist albany","answering service for contractors","after hours answering service","ai phone answering service","missed call answering"],
  neg=["jobs","receptionist salary","hiring","free trial app","chatgpt voice","how to"]),
 dict(slug="ai-chat-agent-albany-ny", name="AI Chat Agent",
  h=["AI Chat for Your Website","Turn Visitors Into Leads","Answers Questions 24/7","Website Chatbot for Business","Captures Leads While You Work","Trained on Your Services","Sends You Every Lead","No Made-Up Answers","Works With Most Websites","Albany AI Chat Agent","See a Live Demo","Live in 1 to 2 Weeks"],
  d=["A chat assistant trained on your services answers questions and collects lead details.",
     "Every conversation ends with a lead summary sent to you. Works 24/7.",
     "Answers only from information you approve, and hands off anything it isn't sure of.",
     "Works with WordPress, Wix, Squarespace, Shopify, and custom sites."],
  meta=["Visitors come to your website with one quick question. If they can't get an answer, they leave.\n\nAn AI chat agent answers 24/7, collects their details, and sends you the lead.",
        "Your website could be booking jobs at 2 a.m. See how an AI chat agent trained on your business works."],
  mh=["Turn visitors into leads, 24/7","Your website, answering for you"], md=["See a live demo"],
  kw=["ai chatbot for website","website chatbot small business","ai chat agent","chatbot for contractors","lead capture chatbot","ai customer service chat small business"],
  neg=["free chatbot","chatgpt login","jobs","course","open source","api"]),
 dict(slug="lead-follow-up-albany-ny", name="Lead Capture & Follow-Up",
  h=["Stop Losing Paid Leads","Instant Lead Alerts","Follow-Up on Autopilot","Quotes Customers Price Fast","Reply First, Win the Job","Lead Follow-Up System","Texts and Emails You Approve","Every Lead in One Place","Booking and CRM Connected","Albany Lead Follow-Up","Live in 2 to 4 Weeks","Work With the Owner"],
  d=["Instant alerts, estimate builders, booking, and follow-up so no inquiry goes cold.",
     "The first business to reply usually wins. Get every lead on your phone in seconds.",
     "Follow-up texts and emails in your voice, that stop as soon as the customer replies.",
     "Set up around the tools you already use by a local business owner."],
  meta=["You paid for that lead. Then you got busy, and they hired someone who called back first.\n\nInstant alerts, quote builders, and follow-up you approve, so every inquiry gets an answer.",
        "How many quotes went out last month with no follow-up? Set it up once and every lead gets a timely reply."],
  mh=["Stop losing leads you paid for","Reply first, win the job"], md=["Capital Region businesses"],
  kw=["lead follow up system","crm for contractors","automated follow up texts","lead management small business","estimate builder for website","speed to lead"],
  neg=["jobs","free crm","salesforce login","course","template download"]),
 dict(slug="google-review-system-albany-ny", name="Review System",
  h=["Get More Google Reviews","Reviews on Autopilot","Ask Every Customer, Simply","Google-Compliant Requests","One-Tap Review Links","Reply Drafts for New Reviews","Compete on Google Maps","Albany Review System","No Chasing Customers","Track Your Rating Monthly","Works With Your Software","More Reviews, More Calls"],
  d=["Automatic review requests after every job, with one-tap Google links and reply drafts.",
     "Follows Google's rules: every customer asked the same way, no incentives, no filtering.",
     "Reviews help decide who shows up on Google Maps. Get yours flowing in weeks.",
     "Set up by a local business owner, connected to the tools you already use."],
  meta=["Happy customers say they'll leave a review. Then life happens.\n\nAutomatic, Google-compliant review requests after every job, plus reply drafts for each new review.",
        "When a competitor has more Google reviews, it's usually not better service. It's a better system for asking."],
  mh=["More Google reviews, no chasing","Reviews on autopilot"], md=["Google-compliant"],
  kw=["get more google reviews","google review software","review management small business","review request text","how to get more reviews for my business","reputation management albany"],
  neg=["buy reviews","fake reviews","jobs","free","remove bad review"]),
 dict(slug="custom-jingles-albany-ny", name="Custom Ad Jingles",
  h=["Custom Business Jingles","A Jingle People Remember","Make Your Number Stick","Original Music for Your Ads","Radio, Video, and On-Hold","Jingles for Local Businesses","You Own the Rights","Ready in 2 to 3 Weeks","Short and Long Cuts","Albany Jingle Writer","Stand Out From Every Ad","Be the Name They Remember"],
  d=["A short, original jingle built around your name or number for radio, video, and ads.",
     "Short and long cuts for radio, social ads, and on-hold, delivered ready to run.",
     "Original melody and lyrics written for your business. You own the rights.",
     "Pair it with a free visibility score so people find you when they search your name."],
  meta=["People need you once a year. Will they remember your name when they do?\n\nA short, original jingle built around your business name or phone number, for radio, video, social, and on-hold.",
        "The ads people remember have a tune. Get an original jingle for your business, ready in 2 to 3 weeks."],
  mh=["A jingle people remember","Make your number stick"], md=["Original, you own it"],
  kw=["custom jingle for business","business jingle","radio jingle production","jingle writer","company jingle","on hold music with jingle"],
  neg=["free jingle","royalty free music","jingle bells","jobs","sound effects"]),
 dict(slug="growth-audit-albany-ny", name="Comprehensive Growth Audit",
  h=["Local Marketing Audit","Find What Costs You Calls","Expert Audit in 5 Days","Every Fix Written and Ranked","20-25 Page Expert Report","Walkthrough With Michael","Competitor Comparison","See What AI Says About You","A Plan, Not a Pitch","Credited Toward Any Package","Albany Marketing Audit","Honest Second Opinion"],
  d=["A 20-25 page expert review of your website, Google profile, listings, and competitors.",
     "Every fix written out and ranked, plus a 45-minute walkthrough with Michael.",
     "$2,000, credited in full toward any package you start within 30 days.",
     "Not an automated report. Five business days of hands-on review by a business owner."],
  meta=["Before you spend more on marketing, find out exactly what's costing you calls.\n\nA 20-25 page expert audit of your website, Google profile, listings, competitors, and AI answers, with every fix ranked.",
        "An honest second opinion on your marketing, with proof for every finding and a 30/60/90-day plan you can use with anyone."],
  mh=["Find what's costing you calls","Expert audit in 5 days"], md=["$2,000, credited later"],
  kw=["marketing audit small business","local seo audit","website audit service","google business profile audit","digital marketing audit albany","seo audit service"],
  neg=["free seo audit tool","jobs","course","template","financial audit","tax audit"]),
]

def check(items, limit, label):
    for x in items:
        assert len(x) <= limit, f"{label} too long ({len(x)}/{limit}): {x}"

lines = ["# Ad copy for the landing pages", "",
 "Search ads follow the Google responsive search ad format, which Microsoft Advertising imports as is. Character counts are checked by `design/_ads.py`. Final URL for each ad group is the page's live address with UTM tags, for example `?utm_source=google&utm_medium=cpc&utm_campaign=<slug>` (use `bing` or `meta` as the source). The pages pass ad click IDs and UTM tags through to the free score.", "",
 "**Account-wide negatives:** jobs, careers, salary, hiring, internship, course, training, certification, free template, DIY, reddit, definition.", "",
 "**Targeting to start:** Capital Region, about 40 miles around Albany, people in or regularly in the area. Meta: business owners and page admins in the same area; leave Meta's \"special ad category\" off (it doesn't apply to these services).", ""]
for a in ADS:
    check(a["h"], H, "headline"); check(a["d"], DESC, "description"); check(a["mh"], MH, "Meta headline"); check(a["md"], MD, "Meta description")
    lines += [f"## {a['name']}", f"Page: `/{a['slug']}`", "", "**Search headlines (30 max)**", ""]
    lines += [f"- {x} ({len(x)})" for x in a["h"]]
    lines += ["", "**Search descriptions (90 max)**", ""] + [f"- {x} ({len(x)})" for x in a["d"]]
    lines += ["", "**Keywords** (phrase and exact match to start)", "", ", ".join(a["kw"]), "", "**Ad group negatives**", "", ", ".join(a["neg"]), "", "**Meta primary text**", ""]
    for i, t in enumerate(a["meta"], 1):
        lines += [f"Version {i}:", "", "> " + t.replace("\n\n", "\n>\n> "), ""]
    lines += ["**Meta headlines (40 max):** " + " · ".join(f"{x} ({len(x)})" for x in a["mh"]), "",
              "**Meta description (30 max):** " + " · ".join(f"{x} ({len(x)})" for x in a["md"]), ""]
OUT.write_text("\n".join(lines))
print("ok", OUT)
