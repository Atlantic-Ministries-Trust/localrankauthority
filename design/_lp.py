"""Ad landing pages for paid traffic (Google Ads, Microsoft Ads, Meta).

One page per advertised service, built in the redesign's look. Pages have no
main navigation (so visitors stay on the offer), one main action (the free
score, matched to the service) and a backup (call or book).

Run: python3 design/_lp.py   -> writes design/lp/<slug>.html and design/lp/index.html
"""
import json, html, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import _build  # reuses the homepage's styles

D = pathlib.Path(__file__).parent / "lp"
D.mkdir(exist_ok=True)
SITE = "https://localrankauthority.com"
PHONE, TEL = "(518) 460-1010", "+15184601010"
e = lambda t: html.escape(t, quote=False)

TOWNS = ["Albany", "Troy", "Schenectady", "Saratoga Springs", "Clifton Park", "Colonie", "Latham", "Bethlehem",
         "East Greenbush", "Guilderland", "Glens Falls", "Amsterdam"]

# Each page: what the ad promised (h1), the pain in the owner's words, what they get, a visual,
# objections answered in the FAQ. No invented stats, reviews, or results.
PAGES = [
 dict(slug="local-seo-albany-ny", service="Local SEO & AI Search", keyword="local SEO in Albany, NY",
  title="Local SEO in Albany, NY | Get Found on Google Maps and AI",
  desc="Show up in Google's map results and get recommended by ChatGPT and Google AI. Free visibility score for Capital Region businesses in about a minute.",
  eyebrow="Local SEO & AI search · Albany and the Capital Region",
  h1="Get found first when Capital Region customers search",
  sub="Most calls go to the three businesses in Google's map results, and more customers now ask ChatGPT or Google AI who to hire. See where you stand in about a minute, free.",
  visual="serp",
  pains=["Competitors with worse service show up above you on Google Maps.",
         "You ask ChatGPT for the best company in your trade near you, and it names someone else.",
         "You've paid for SEO before and got reports full of jargon, but no more calls."],
  benefits=[("A Google profile that wins the click", "Categories, services, photos, posts, and booking links set up the way Google ranks and customers choose."),
            ("Pages for every town you serve", "Service and town pages written for the searches your customers really type."),
            ("Named by AI assistants", "We work on the sources AI tools trust: consistent listings, reviews, local guides, and clear answers on your site."),
            ("Numbers you can check", "Monthly rankings, AI mentions, and calls in plain English, not traffic charts.")],
  faqs=[("How long does local SEO take to work?", "Profile and website fixes can help within weeks. Ranking gains usually build over a few months, depending on how competitive your service and town are."),
        ("Can you guarantee first place on Google or in ChatGPT?", "No one honestly can. Google and AI tools decide their own results. We improve the signals they rely on and show you the results every month."),
        ("I already have a website. Do I need a new one?", "Usually not. We start with what you have and only recommend a rebuild if the site is holding you back."),
        ("What does the free score check?", "Your homepage speed, SEO basics, where you rank on Google, Bing, and DuckDuckGo for your service and city, and whether AI assistants recommend you."),
        ("Do I have to sign a long contract?", "No. You get a written plan with a fixed price before you commit, and no long-term lock-in.")]),
 dict(slug="website-design-albany-ny", service="Website Design", keyword="website design in Albany, NY",
  title="Website Design in Albany, NY | Websites That Book Jobs",
  desc="Fast, mobile-first websites for Capital Region service businesses, built to turn visitors into calls and bookings. Free website and visibility score.",
  eyebrow="Website design · Albany and the Capital Region",
  h1="A website that turns visitors into booked jobs",
  sub="Most of your visitors are on a phone and decide in seconds. We build fast, clear sites that answer their questions and make calling or booking easy. Start with a free score of your current site.",
  visual="site",
  pains=["Your site looks dated, loads slowly, or is hard to use on a phone.",
         "Visitors land on your site and leave without calling.",
         "Your current site doesn't show up on Google for the services you sell."],
  benefits=[("Built for phones first", "A clear headline, click-to-call, and a booking button on the first screen."),
            ("Answers before they ask", "Services, service areas, pricing guidance, and proof laid out the way customers decide."),
            ("Ready for Google and AI", "Clean structure, fast loading, and the details search engines and AI assistants need to recommend you."),
            ("You own it", "Your domain, your content, and your site stay in your name.")],
  faqs=[("How long does a new website take?", "Most service business sites take 4 to 8 weeks, depending on how many pages and features you need."),
        ("Can you improve my current site instead of rebuilding it?", "Often, yes. The free score and a quick review show whether fixes or a rebuild make more sense."),
        ("Will I be able to make changes myself?", "Yes. We build on platforms you can edit, and show you how."),
        ("Can it take bookings and deposits?", "Yes. We connect booking, quote forms, deposit links, and your CRM to the tools you already use."),
        ("Who owns the website?", "You do: domain, content, and site.")]),
 dict(slug="ai-receptionist-albany-ny", service="AI Receptionist", keyword="AI receptionist for small business",
  title="AI Receptionist for Albany Businesses | Answer Every Call",
  desc="An AI receptionist that answers missed and after-hours calls, books appointments, and texts you a summary. For Capital Region service businesses.",
  eyebrow="AI receptionist · Albany and the Capital Region",
  h1="Stop losing jobs to missed calls",
  sub="When you're on a job, on the road, or closed for the night, an AI receptionist answers in a natural voice, books the appointment, and texts you the details.",
  visual="voice",
  pains=["You can't answer the phone while you're working, and callers hang up.",
         "After-hours callers move on to the next company on Google.",
         "Voicemails pile up and half never call back."],
  benefits=[("Answers every call", "After hours, on weekends, and whenever you're busy, in a natural voice trained on your business."),
            ("Books the job", "Checks your calendar, books appointments, and collects the details you'd ask for."),
            ("Texts you a summary", "Who called, what they need, and how to reach them, right after the call."),
            ("Knows its limits", "It only answers what you approve, and sends anything unusual straight to you.")],
  faqs=[("Will callers know it's an AI?", "It sounds natural, and we recommend it says it's an assistant for your business. Callers can ask for you at any time."),
        ("What can it answer?", "Only what you approve: services, service area, hours, pricing guidance, and booking. We test it with you before launch."),
        ("Does it replace my phone number?", "No. It picks up calls you miss or forward to it, so customers keep calling the number they know."),
        ("What happens with an emergency or an angry caller?", "You decide the rules. It can transfer the call, text you right away, or take a message."),
        ("Can I hear it before I buy?", "Yes. Book a call and Michael will show you a live demo.")]),
 dict(slug="ai-chat-agent-albany-ny", service="AI Chat Agent", keyword="AI chatbot for small business website",
  title="AI Chat Agent for Your Website | Albany & Capital Region",
  desc="A website chat assistant trained on your services that answers questions 24/7, qualifies leads, and sends you a summary. For local service businesses.",
  eyebrow="AI chat agent · Albany and the Capital Region",
  h1="Turn website visitors into leads, even at 2 a.m.",
  sub="A chat assistant trained on your services answers questions instantly, collects contact details, and sends you a summary, so visitors don't leave to check a competitor.",
  visual="chat",
  pains=["Visitors have a quick question, can't find the answer, and leave.",
         "Contact forms sit unanswered until the next morning.",
         "You answer the same five questions over and over."],
  benefits=[("Instant answers, 24/7", "Pricing guidance, service area, hours, and how the job works."),
            ("Qualifies the lead", "Asks the questions you'd ask and collects name, phone, and email."),
            ("Sends you a summary", "Every conversation ends with a lead summary in your inbox or phone."),
            ("Stays on script", "Trained only on information you approve, with clear limits and a handoff to you.")],
  faqs=[("Will it make things up?", "It answers only from the knowledge base you approve, and hands off anything it isn't sure about."),
        ("Which websites does it work with?", "Most: WordPress, Wix, Squarespace, Shopify, and custom sites."),
        ("Can it book appointments?", "Yes, it can connect to your booking calendar."),
        ("How long does setup take?", "Usually 1 to 2 weeks, including testing with you before it goes live."),
        ("Can I try one first?", "Yes. Book a call to see a live demo for a business like yours.")]),
 dict(slug="lead-follow-up-albany-ny", service="Lead Capture & Follow-Up", keyword="lead follow-up system for contractors",
  title="Lead Follow-Up Systems | Albany & Capital Region Businesses",
  desc="Instant lead alerts, quote builders, booking, and follow-up texts and emails, so Capital Region businesses stop losing leads they already paid for.",
  eyebrow="Lead capture & follow-up · Albany and the Capital Region",
  h1="Stop losing leads you already paid for",
  sub="The first business to reply usually wins the job. We set up instant alerts, quote builders, booking, and follow-up texts and emails, so no inquiry goes cold.",
  visual="followup",
  pains=["Leads come in while you're busy, and by the time you call back they've hired someone else.",
         "Quotes go out and you never follow up.",
         "Leads are scattered across email, texts, voicemail, and Facebook messages."],
  benefits=[("Instant alerts", "Every new inquiry reaches your phone in seconds, with the details."),
            ("Quotes customers can get themselves", "An estimate builder that answers the price question and captures the lead."),
            ("Follow-up you approve", "Texts and emails that go out on time, written in your voice."),
            ("One place for every lead", "Forms, calls, and booking connected to your CRM or a simple pipeline.")],
  faqs=[("Will follow-ups feel spammy?", "No. You approve every message, and they stop as soon as the customer replies or books."),
        ("Do I need a CRM?", "No. We can connect the one you use or set up a simple pipeline."),
        ("Can customers price the job themselves?", "Yes. An estimate builder shows a price range based on your pricing rules."),
        ("What does texting cost?", "Texting platforms charge small monthly and per-message fees. Your proposal lists them before you commit."),
        ("How fast is setup?", "Most systems are live in 2 to 4 weeks.")]),
 dict(slug="google-review-system-albany-ny", service="Review System", keyword="get more Google reviews",
  title="Get More Google Reviews | Review Systems for Albany Businesses",
  desc="Automatic review requests after every job, simple review links, and reply drafts, so Capital Region businesses earn more Google reviews without chasing customers.",
  eyebrow="Review systems · Albany and the Capital Region",
  h1="More Google reviews, without chasing customers",
  sub="Reviews help decide who shows up on Google Maps and who gets the call. We set up automatic, Google-compliant review requests after every job, plus reply drafts for each new review.",
  visual="reviews",
  pains=["Happy customers say they'll leave a review, then forget.",
         "Competitors with more recent reviews show up above you.",
         "Reviews go unanswered because there's no time."],
  benefits=[("Asks every customer", "A friendly text or email after each job, with a one-tap review link."),
            ("Follows Google's rules", "Every customer is asked the same way. No incentives and no filtering out unhappy customers."),
            ("Replies drafted for you", "Alerts for new reviews, with a reply ready to approve."),
            ("Tracks your progress", "Review count, rating, and how you compare with the top competitors."),],
  faqs=[("Is it allowed to ask for reviews?", "Yes. Google allows asking every customer. It bans paying for reviews or only asking happy customers, and our system does neither."),
        ("What about bad reviews?", "We help you reply calmly and fix the issue. Honest, consistent requests often raise your average over time."),
        ("Does it work with my software?", "It can trigger from most job, invoicing, and booking tools, or from a simple list."),
        ("Which sites does it cover?", "Google first, plus Facebook, Yelp, or industry sites if they matter for your business."),
        ("How quickly will I see more reviews?", "Usually within the first few weeks of jobs, because every customer gets asked.")]),
 dict(slug="custom-jingles-albany-ny", service="Custom Ad Jingles", keyword="custom jingle for business",
  title="Custom Business Jingles | Albany & Capital Region",
  desc="Short, original jingles built around your business name or phone number for radio, video, social ads, and on-hold. For Capital Region businesses.",
  eyebrow="Custom ad jingles · Albany and the Capital Region",
  h1="A jingle people remember long after the ad ends",
  sub="A short, original tune built around your name or phone number for radio, video, social ads, and on-hold, so people think of you first when they need you.",
  visual="jingle",
  pains=["Your ads look and sound like everyone else's.",
         "People need your service once a year and forget your name in between.",
         "Your phone number is hard to remember."],
  benefits=[("Built around your name", "Original melody and lyrics that make your name or number stick."),
            ("Every length you need", "Short and long cuts for radio, video, social ads, and on-hold."),
            ("Ready to run", "Delivered as finished audio files for your ads and phone system."),
            ("Fits your brand", "Upbeat, warm, or classic, written for your audience.")],
  faqs=[("Do I own the jingle?", "Yes. You get the rights to use it in your advertising."),
        ("Where can I use it?", "Radio, TV, video, social ads, your website, and your phone's on-hold message."),
        ("How long does it take?", "Usually 2 to 3 weeks, including a round of changes."),
        ("Can it include my phone number?", "Yes. Phone numbers are one of the best things to put in a jingle."),
        ("What does the free score have to do with a jingle?", "A jingle brings people to search for you. The free score shows whether they'll find you when they do.")]),
 dict(slug="growth-audit-albany-ny", service="Comprehensive Growth Audit", keyword="marketing audit for small business",
  title="Comprehensive Growth Audit | Local Marketing Audit, Albany NY",
  desc="A 20-25 page expert audit of your website, Google profile, listings, competitors, and AI visibility, with every fix ranked and a walkthrough with Michael.",
  eyebrow="Comprehensive Growth Audit · $2,000",
  h1="Find out exactly what's costing you calls",
  sub="Five business days of expert review of your website, Google profile, listings, competitors, and AI answers. You get every fix written out and ranked, and a 45-minute walkthrough with Michael.",
  visual="report", price=True,
  pains=["You know something's off, but not what to fix first.",
         "You've been told you need everything, and you don't trust that.",
         "You want an honest second opinion before you spend more on marketing."],
  benefits=[("A 20–25 page report", "Every problem with proof, why it costs you customers, and the exact fix, in plain English."),
            ("Side by side with competitors", "Reviews, rankings, speed, and websites compared with the businesses winning your calls."),
            ("What AI says about you", "Real buyer questions asked of AI assistants, and the sources they rely on."),
            ("A plan, not a pitch", "A 30/60/90-day plan you can do yourself or hand to anyone, plus a 45-minute walkthrough.")],
  faqs=[("How much is it?", "$2,000, credited in full toward any package you start within 30 days."),
        ("Is it just an automated report?", "No. The free score is automated. The audit is five days of expert review, written up by hand and walked through with you."),
        ("What do I need to provide?", "A short form about your services, towns, and competitors. Read-only access to Google Search Console or Analytics is optional."),
        ("Do I have to hire you afterward?", "No. The plan is yours to do yourself or with anyone."),
        ("How is it different from the free score?", "The free score checks your homepage in a minute. The audit reviews your whole site, profile, listings, competitors, and AI answers, and ends with a walkthrough.")]),
]

LP_CSS = """
/* landing pages */
.lp-top{position:sticky;top:env(safe-area-inset-top,0px);z-index:9;background:rgba(246,247,243,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.lp-top .wrap{display:flex;align-items:center;gap:16px;height:68px}
.lp-top img{height:36px;width:auto;display:block}
.lp-top .area{font-size:13.5px;color:var(--muted);margin-right:auto}
.lp-top .tel{font:700 16px/1 var(--display);text-decoration:none;white-space:nowrap}
.lp-top .btn{padding:12px 18px;font-size:15px}
.lp-hero{padding-block:clamp(36px,6vw,80px)}
.lp-hero .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,64px);align-items:center}
.lp-hero h1{font-size:clamp(40px,5.6vw,70px);font-weight:900;letter-spacing:-.02em;margin-top:16px}
.lp-hero .lede{margin-top:20px}
.scorebox{color:var(--ink);margin-top:28px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 24px 50px -30px rgba(16,32,26,.35);display:grid;gap:12px;max-width:560px}
.scorebox h2{font:800 19px/1.2 var(--display)}
.scorebox .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.scorebox label{display:grid;gap:6px;font:600 13px/1.2 var(--body)}
.scorebox input{font:400 16px/1.3 var(--body);padding:13px 14px;border:1px solid #C9D2CC;border-radius:10px;background:var(--paper);color:var(--ink);width:100%;min-width:0}
.scorebox .go{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px}
.scorebox .fine{font-size:13px;color:var(--muted)}
.scorebox .msg{font-size:14px;font-weight:600;color:var(--sign);min-height:1.2em}
.trust{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:20px;font-size:14px;color:var(--muted)}
.trust span::before{content:"✓ ";color:var(--sign);font-weight:700}
.pains{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.pain{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--pin);border-radius:12px;padding:20px 22px;font:600 17px/1.45 var(--body)}
.bens{display:grid;grid-template-columns:1fr 1fr;gap:28px 40px;margin-top:34px}
.ben h3{font:800 22px/1.2 var(--display);margin-bottom:8px}
.ben p{color:var(--muted)}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:34px}
.step .n{font:900 44px/1 var(--display);color:var(--sign)}
.step h3{font:800 21px/1.2 var(--display);margin:10px 0 6px}
.step p{color:var(--muted)}
.browser{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(16,32,26,.35)}
.browser .bar{display:flex;gap:6px;padding:10px 12px;background:var(--paper);border-bottom:1px solid var(--line)}
.browser .bar i{width:10px;height:10px;border-radius:50%;background:#D5DCD7}
.browser .pg{padding:22px;display:grid;gap:12px}
.browser .hdl{font:900 26px/1.1 var(--display)}
.browser .btns{display:flex;gap:10px}
.browser .btns span{padding:10px 14px;border-radius:999px;font:700 13px/1 var(--display);background:var(--amber)}
.browser .btns span+span{background:transparent;border:1.5px solid var(--line)}
.browser .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.browser .tiles span{height:64px;border-radius:8px;background:#E4EBE6}
.wave{display:flex;align-items:center;gap:4px;height:120px;padding:20px;background:var(--ink);border-radius:20px}
.wave i{flex:1;background:var(--amber);border-radius:3px;animation:wv 1.2s ease-in-out infinite alternate}
@keyframes wv{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
.lp-foot{background:var(--ink);color:#AFC0B7;font-size:14px}
.lp-foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;padding-block:28px}
.lp-foot a{color:#E3ECE7;text-decoration:none}
.lp-foot nav{display:flex;flex-wrap:wrap;gap:8px 18px}
.lpbar{display:none}
@media (max-width:980px){.lp-hero .grid{grid-template-columns:1fr}.pains,.steps{grid-template-columns:1fr}.lp-top .area{display:none}}
@media (max-width:640px){.bens{grid-template-columns:1fr}.scorebox .row{grid-template-columns:1fr}.lp-top .tel{display:none}.lp-top .btn{margin-left:auto}
 .lpbar{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;position:fixed;left:0;right:0;bottom:0;z-index:20;background:rgba(246,247,243,.95);border-top:1px solid var(--line);padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
 .lpbar a{justify-content:center;padding:15px 12px}.lp-foot{padding-bottom:84px}}
"""

def visual(p):
    v = p["visual"]
    if v == "serp":
        return """<div class="serp" aria-label="Illustration of a search result"><div class="q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>best plumber near me</div><div class="ai"><small>AI answer</small>For fast service and clear pricing, <b>Harbor Point Plumbing</b> is often recommended, based on its reviews and service pages.</div><ol><li class="you"><span class="n">1</span><span><b>Harbor Point Plumbing</b><span class="meta">4.9 ★ · 212 reviews</span></span><span class="call">Call</span></li><li><span class="n">2</span><span>Competitor A<span class="meta">4.3 ★ · 58 reviews</span></span><span class="call">Call</span></li><li><span class="n">3</span><span>Competitor B<span class="meta">4.1 ★ · 31 reviews</span></span><span class="call">Call</span></li></ol><p class="cap">Illustration with a fictional business</p></div>"""
    if v == "site":
        return """<div class="browser" aria-label="Illustration of a mobile-friendly website"><div class="bar"><i></i><i></i><i></i></div><div class="pg"><div class="hdl">Drain cleaning in Troy, done today</div><p style="color:var(--muted);font-size:14px">Upfront prices · 4.9 ★ from 212 neighbors · Licensed and insured</p><div class="btns"><span>Call (518) 555-0142</span><span>Book online</span></div><div class="tiles"><span></span><span></span><span></span></div><p style="font-size:12px;color:var(--muted);text-align:right">Illustration with a fictional business</p></div></div>"""
    if v == "report":
        return """<div class="pages" aria-label="Sample report pages"><div class="pg p1"><div class="t">Comprehensive<br>Growth Audit</div><div class="s">Harbor Point Plumbing · sample</div><div class="bar"></div></div><div class="pg p2"><div class="mini-h">Where you stand</div><svg class="gauge" viewBox="0 0 120 70" aria-hidden="true"><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#DCE2DD" stroke-width="12" stroke-linecap="round"/><path d="M10 62 A50 50 0 0 1 86 22" fill="none" stroke="#0B5D3F" stroke-width="12" stroke-linecap="round"/><text x="60" y="60" text-anchor="middle" font-family="Overpass,Arial" font-weight="900" font-size="24" fill="#10201A">61</text></svg><div class="rows"><div class="rowbar">Google profile<i style="--w:42%;--c:#C8432B"></i></div><div class="rowbar">AI visibility<i style="--w:30%;--c:#C8432B"></i></div><div class="rowbar">Website speed<i style="--w:78%"></i></div></div></div><div class="pg p3"><div class="mini-h">Top problems, ranked</div><div class="find"><b>No phone on the first screen</b><span class="blur">Mobile visitors see a headline first.</span></div><div class="find"><b>Missing from 3 "best of" lists</b><span class="blur">Competitors appear on every list.</span></div></div></div>"""
    if v == "jingle":
        bars = "".join(f'<i style="animation-delay:{(i*0.09)%1.2:.2f}s;height:{30+((i*37)%70)}%"></i>' for i in range(28))
        return f'<div><div class="wave" aria-hidden="true">{bars}</div><p style="margin-top:14px;color:var(--muted);font-size:14px">Sample jingle player <span class="ph">[add a real sample clip]</span></p></div>'
    chats = {
     "voice": ("AI receptionist", "Answering a call at 8:47 pm", [("them","Thanks for calling Harbor Point Plumbing. How can I help tonight?"),("me","My water heater is leaking."),("them","I'm sorry to hear that. I can book a technician for 8 am tomorrow. Is the leak near the top or the bottom?"),("sum","Booked 8 am. Summary texted to the owner at 8:49 pm.")]),
     "chat": ("Website assistant", "Usually replies instantly", [("them","Hi! I can help with pricing, scheduling, or questions."),("me","Do you do drain cleaning in Troy?"),("them","Yes, we serve Troy. Most drains are $149–$229. Want the first opening tomorrow?"),("sum","Lead sent to the owner: drain cleaning, Troy, phone collected.")]),
     "followup": ("Lead follow-up", "New inquiry from your website", [("sum","New lead: kitchen remodel quote, Clifton Park. Sent to your phone in 4 seconds."),("them","Hi Dana, thanks for reaching out! Here's a link to pick a time for your free estimate."),("me","Thursday at 10 works."),("sum","Booked. Reminder texts scheduled.")]),
     "reviews": ("Review request", "Sent after the job is marked done", [("them","Hi Pat, thanks for choosing Harbor Point today! Would you share a quick Google review? It helps a lot. [link]"),("me","Done! Great work."),("sum","New 5 ★ review. Reply draft ready for your approval.")]),
    }
    name, sub, msgs = chats[v]
    b = "".join(f'<div class="bub {w}" style="animation-delay:{i*0.2:.1f}s">{e(t)}</div>' for i, (w, t) in enumerate(msgs))
    return f'<div class="device"><div class="screen"><div class="hd"><i></i><span>{e(name)}<small>{e(sub)}</small></span></div>{b}<p style="margin-top:auto;font-size:11.5px;color:var(--muted);text-align:center">Illustration with a fictional business</p></div></div>'

def scorebox(p, n):
    s = e(p["service"])
    return f"""<form class="scorebox" data-lp="{p['slug']}" data-event="lp_score_submit">
  <h2>Get your free visibility score</h2>
  <div class="row">
    <label for="w{n}">Your website<input id="w{n}" name="url" placeholder="yourbusiness.com" autocomplete="url" required></label>
    <label for="b{n}">Business name<input id="b{n}" name="biz" autocomplete="organization" required></label>
  </div>
  <div class="row">
    <label for="s{n}">What you do<input id="s{n}" name="svc" placeholder="plumber" required></label>
    <label for="c{n}">City and state<input id="c{n}" name="city" placeholder="Albany, NY" required></label>
  </div>
  <div class="go"><button class="btn btn-primary" type="submit">Get my free score</button><span class="fine">About a minute · no call needed</span></div>
  <p class="msg" aria-live="polite"></p>
</form>"""

def page(p):
    price = p.get("price")
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": p["service"], "serviceType": p["service"], "provider": {"@id": SITE + "/#business"},
         "areaServed": [{"@type": "Place", "name": t + ", NY"} for t in TOWNS], "url": f"{SITE}/{p['slug']}",
         **({"offers": {"@type": "Offer", "price": "2000", "priceCurrency": "USD"}} if price else {})},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faqs"]]}]}
    pains = "".join(f'<div class="pain">"{e(x)}"</div>' for x in p["pains"])
    bens = "".join(f'<div class="ben"><h3>{e(h)}</h3><p>{e(t)}</p></div>' for h, t in p["benefits"])
    faqs = "".join(f"<details{' open' if i == 0 else ''}><summary>{e(q)}</summary><p>{e(a)}</p></details>" for i, (q, a) in enumerate(p["faqs"]))
    towns = "".join(f"<span>{t}</span>" for t in TOWNS)
    second = ('<a class="btn btn-primary" href="https://localrankauthority.com/comprehensive-audit" data-event="lp_audit_click">Request my audit</a>' if price
              else f'<a class="textlink" href="tel:{TEL}" data-event="lp_call_click">or call Michael: {PHONE}</a>')
    return f"""<title>{e(p['title'])}</title>
<meta name="description" content="{e(p['desc'])}">
<link rel="canonical" href="{SITE}/{p['slug']}">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(p['desc'])}">
<meta property="og:image" content="{SITE}/og-image.jpg">
<meta property="og:url" content="{SITE}/{p['slug']}">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
{_build.fonts}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!-- Ad conversion tags go here when the page goes live:
     Google Ads (gtag) · Microsoft Advertising UET · Meta Pixel.
     Conversions: lp_score_submit (free score), lp_call_click (tap to call), lp_book_click, lp_audit_click.
     Update the privacy policy's "Cookies and tracking" section before adding them. -->
<style>{_build.style}{_build.PAGE_CSS}{LP_CSS}</style>

<div class="mocknote"><b>Draft ad landing page</b> · not live · yellow tags need real content</div>

<header class="lp-top"><div class="wrap">
  <img src="../../docs/assets/lra-primary-color.svg" alt="Local Rank Authority">
  <span class="area">Albany &amp; the Capital Region</span>
  <a class="tel" href="tel:{TEL}" data-event="lp_call_click">{PHONE}</a>
  <a class="btn btn-primary" href="#score">Free score</a>
</div></header>

<main>
<section class="lp-hero" id="score">
  <div class="wrap grid">
    <div>
      <p class="eyebrow">{e(p['eyebrow'])}</p>
      <h1>{e(p['h1'])}</h1>
      <p class="lede">{e(p['sub'])}</p>
      {scorebox(p, 1)}
      <p style="margin-top:16px">{second}</p>
      <div class="trust"><span>Run by a local business owner</span><span>You work with Michael directly</span><span>No long contracts</span><span>Plain-English reports</span></div>
    </div>
    <div>{visual(p)}</div>
  </div>
</section>

<section class="route sec-tight">
  <div class="wrap">
    <p class="eyebrow">Sound familiar?</p>
    <h2 class="h2" style="margin-top:14px">What owners tell us</h2>
    <div class="pains">{pains}</div>
  </div>
</section>

<section class="sec-tight">
  <div class="wrap">
    <p class="eyebrow">What you get</p>
    <h2 class="h2" style="margin-top:14px">{e(p['service'])}, done for you</h2>
    <div class="bens">{bens}</div>
  </div>
</section>

<section class="band sec-tight">
  <div class="wrap">
    <p class="eyebrow">How it works</p>
    <h2 class="h2" style="margin-top:14px">Three steps, no guesswork</h2>
    <div class="steps">
      <div class="step"><span class="n" style="color:var(--amber)">1</span><h3>Get your free score</h3><p style="color:var(--on-sign-muted)">See where you stand on Google, in AI answers, and on your website in about a minute.</p></div>
      <div class="step"><span class="n" style="color:var(--amber)">2</span><h3>Get a written plan</h3><p style="color:var(--on-sign-muted)">Michael reviews your results with you and puts the scope and a fixed price in writing.</p></div>
      <div class="step"><span class="n" style="color:var(--amber)">3</span><h3>We do the work</h3><p style="color:var(--on-sign-muted)">You approve what goes live, and get plain-English results every month.</p></div>
    </div>
  </div>
</section>

<section class="sec-tight">
  <div class="wrap about">
    <div class="portrait"><span class="ph">[Michael's photo]</span></div>
    <div class="stack">
      <p class="eyebrow">Who you'll work with</p>
      <blockquote>"Every marketing dollar I've spent has had to produce sales. That's the standard I hold your marketing to."</blockquote>
      <p class="lede">I'm Michael Carlson. I've owned Atlantic Flagpole since 2008 and co-founded The Christmas Guys, so I know what it's like when the phone doesn't ring. You'll work with me directly, not an account manager.</p>
      <div class="quote" style="border-left-color:var(--sign)"><blockquote style="font:700 20px/1.35 var(--display)"><span class="ph">[A real client review about {e(p['service'])}, with name and town]</span></blockquote></div>
    </div>
  </div>
</section>

<section class="route sec-tight">
  <div class="wrap stack">
    <p class="eyebrow">Where we work</p>
    <h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">Serving the Capital Region</h2>
    <div class="towns" style="margin-top:6px">{towns}</div>
    <p style="color:var(--muted)">Plus local businesses across the US. Meetings are by phone or video.</p>
  </div>
</section>

<section class="sec-tight">
  <div class="wrap faq">
    <div class="stack"><p class="eyebrow">Questions</p><h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">Before you decide</h2></div>
    <div>{faqs}</div>
  </div>
</section>

<section class="ctaband sec-tight">
  <div class="wrap" style="align-items:flex-start">
    <div><h2>See where you stand, free</h2><p>{e('Your free score takes about a minute. If it shows problems worth fixing, Michael will tell you how, with no pressure.' if not price else 'Start with the free score, or request your audit today. The full $2,000 is credited toward any package you start within 30 days.')}</p></div>
    <div style="flex:1 1 380px;max-width:560px">{scorebox(p, 2).replace('class="scorebox"', 'class="scorebox" style="margin-top:0"')}</div>
  </div>
</section>
</main>

<footer class="lp-foot"><div class="wrap">
  <span>© 2026 Local Rank Authority · Based in New York's Capital Region · {PHONE}</span>
  <nav aria-label="Policies"><a href="../privacy.html">Privacy Policy</a><a href="../terms.html">Terms</a><a href="../sms-terms.html">SMS Terms</a><a href="../accessibility.html">Accessibility</a></nav>
</div></footer>

<nav class="lpbar" aria-label="Quick actions"><a class="btn btn-ghost" href="tel:{TEL}" data-event="lp_call_click">Call</a><a class="btn btn-primary" href="#score">Free score</a></nav>

<script>
(function(){{
  // Sends the visitor to the free score on the homepage, prefilled, keeping ad click IDs (gclid, msclkid, fbclid) and UTM tags.
  var keep=new URLSearchParams(location.search);
  document.querySelectorAll('form.scorebox').forEach(function(f){{
    f.addEventListener('submit',function(ev){{
      ev.preventDefault();
      var q=new URLSearchParams(keep);
      ['url','biz','svc','city'].forEach(function(k){{q.set(k,f.elements[k].value.trim())}});
      q.set('src','lp-'+f.dataset.lp);
      var dest='/?'+q.toString()+'#check';
      if(location.hostname!=='localrankauthority.com'){{f.querySelector('.msg').textContent='Draft: on the live site this opens your free score, already filled in.';return}}
      location.href=dest;
    }});
  }});
}})();
</script>
"""

def index():
    rows = "".join(f'<tr><td><a href="{p["slug"]}.html"><b>{e(p["service"])}</b></a></td><td>{e(p["h1"])}</td><td><code>/{p["slug"]}</code></td></tr>' for p in PAGES)
    return f"""<title>LRA Ad Landing Pages</title>
<meta name="claude:viewport-fit-sides" content="cover">
{_build.fonts}
<style>{_build.style}{_build.PAGE_CSS}</style>
<div class="mocknote"><b>Draft ad landing pages</b> · not live · open each page below</div>
<main><section class="phero"><div class="wrap">
<h1>Ad landing pages</h1>
<p class="lede">One page per advertised service for Google Ads, Microsoft Ads, and Meta. Each sends visitors to the free score, matched to the service, with calling as the backup.</p>
</div></section>
<section class="sec-tight"><div class="wrap"><div class="tbl"><table><thead><tr><th>Service</th><th>Headline</th><th>Live address</th></tr></thead><tbody>{rows}</tbody></table></div>
<p style="margin-top:18px;color:var(--muted)">Ad copy for each page is in <code>design/lp/ads.md</code>.</p></div></section></main>
"""

if __name__ == "__main__":
    for p in PAGES:
        (D / f"{p['slug']}.html").write_text(page(p))
        print("built", p["slug"])
    (D / "index.html").write_text(index())
