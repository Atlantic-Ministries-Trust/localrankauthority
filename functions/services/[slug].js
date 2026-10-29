// GET /services/:slug: one page per service, so each service can rank for its own searches.
const SITE = "https://localrankauthority.com";

const SERVICES = {
  "local-seo-ai-search": {
    lane: "found", name: "Local SEO & AI Search Visibility",
    title: "Local SEO & AI Search Visibility for Local Businesses",
    desc: "Rank in Google's map pack and organic results, and give ChatGPT, Google AI Mode, and Perplexity accurate information to recommend your business.",
    intro: "When customers search \"near me\" or ask an AI assistant who to hire, you want to be the answer. We improve the signals Google and AI tools rely on, then track what changes.",
    includes: ["Google Business Profile optimization", "Service and location pages written for real customer searches", "Review and citation building", "LocalBusiness schema and technical SEO fixes", "AI crawler access and clear, citable answers on your site", "Tracking of rankings and AI mentions across a fixed set of customer questions"],
    fit: "Service businesses that depend on local calls: contractors, home services, event rentals, retail, and professional offices.",
    faq: [["Is this the same as GEO or AEO?", "Yes. Generative engine optimization (GEO) and answer engine optimization (AEO) describe the AI half of this work: making your business easy for AI tools to find, understand, and cite."],
          ["Can you guarantee a #1 ranking or an AI recommendation?", "No one honestly can. Results depend on your market and competition. We improve the signals that matter and report your rankings and mentions every month."]],
    related: ["website-design", "review-systems", "ongoing-care"]
  },
  "rank-and-rent": {
    lane: "found", name: "Rank and Rent Lead Generation",
    title: "Rank and Rent Lead Generation for Local Service Businesses",
    desc: "We build and rank lead sites for a service and city, then send the calls and inquiries to one business in that market.",
    intro: "Instead of building your own site from scratch, rent the leads from one we've already built and ranked for your service and city.",
    includes: ["A lead site targeting one service in one market", "Exclusive leads for your territory", "Call tracking and form inquiries sent straight to you", "Monthly lead reporting"],
    fit: "Businesses that want more calls in a specific area without managing a website or ad account.",
    faq: [["Who owns the lead site?", "We do. You rent access to its calls and inquiries. Territory, exclusivity, lead handling, and fees are agreed in writing."],
          ["How many leads will I get?", "It depends on the market and how well the site ranks. Lead volume is never guaranteed, and you see every lead in your monthly report."]],
    related: ["local-seo-ai-search", "lead-capture-follow-up", "ai-receptionist"]
  },
  "website-design": {
    lane: "win", name: "Website Design",
    title: "Website Design for Local Service Businesses",
    desc: "Fast, mobile-first websites that explain what you do, where you do it, and how to book, built for search and AI discovery.",
    intro: "Your website should make it obvious what you offer, where you work, and how to get started. We build sites that load fast on phones and turn visitors into calls.",
    includes: ["Mobile-first design with clear offers and calls to action", "Service and service-area pages", "Booking, quote, and deposit options", "Built-in SEO basics: titles, schema, sitemap, and speed", "Content written so AI assistants can understand and cite it"],
    fit: "Businesses with no website, an outdated one, or a site that gets traffic but not calls.",
    faq: [["Can you work with my existing website?", "Yes. We review your platform, content, and customer journey first, then recommend improvements or a rebuild."],
          ["Do I own the website?", "Yes. Your domain, content, and site are yours."]],
    related: ["local-seo-ai-search", "lead-capture-follow-up", "ongoing-care"]
  },
  "lead-capture-follow-up": {
    lane: "win", name: "Lead Capture & Follow-Up Systems",
    title: "Lead Capture & Follow-Up Systems: Estimate Builders, Booking, and CRM",
    desc: "Interactive estimate builders, instant lead alerts, appointment booking, CRM connections, and follow-up texts and emails that turn inquiries into booked jobs.",
    intro: "Most lost jobs aren't lost to a competitor. They're lost to slow replies. We capture each inquiry, alert you right away, and follow up so leads don't go cold.",
    includes: ["Interactive estimate and quote builders", "Contact and quote forms", "Instant lead alerts by text or email", "Appointment booking and deposit links", "CRM connections", "Follow-up texts and emails you approve"],
    fit: "Businesses that get inquiries but struggle to answer every one quickly.",
    faq: [["Can this work with the tools I already use?", "Usually, yes. We scope it around your existing calendar, CRM, and payment tools. Any platform or messaging fees are spelled out in your proposal."],
          ["What does an estimate builder look like?", "Try the live demo on our homepage. Visitors pick a service and options, see a price range, and leave their details to lock in a quote."]],
    related: ["ai-chat-agents", "ai-receptionist", "website-design"]
  },
  "ai-chat-agents": {
    lane: "win", name: "AI Chat Agents",
    title: "AI Chat Agents for Local Business Websites",
    desc: "A website assistant trained on your services, pricing guidance, and service area that answers questions 24/7 and captures leads.",
    intro: "Visitors have questions at 10 p.m. An AI chat agent answers them, qualifies the job, and sends you a lead summary, so nobody leaves without a next step.",
    includes: ["Trained on an approved knowledge base of your services, pricing guidance, hours, and area", "Answers common questions 24/7", "Qualifies jobs and collects contact details", "Hands off to you with a summary", "Testing before launch"],
    fit: "Businesses whose website gets visitors who leave without calling.",
    faq: [["Will the agent know everything about my business?", "Only what you approve. We define what it can answer, which details it collects, and when it should pass a question to you."],
          ["Can I try one?", "Yes. The homepage has a scripted demo for a sample plumbing company."]],
    related: ["ai-receptionist", "lead-capture-follow-up", "website-design"]
  },
  "ai-receptionist": {
    lane: "win", name: "AI Voice Agents (AI Receptionist)",
    title: "AI Receptionist for Local Businesses: Answer Every Call",
    desc: "An AI voice agent that answers calls you'd otherwise miss, books appointments, and texts you the details.",
    intro: "When you're on a job or it's after hours, missed calls become someone else's customers. An AI receptionist answers, gets the details, books a time, and texts you a summary.",
    includes: ["After-hours and overflow call answering", "Appointment booking", "Urgent-job flagging", "Call summaries sent to you instantly", "Scripts built around your services and tested before launch"],
    fit: "Owner-operators and small teams who can't always pick up the phone.",
    faq: [["Will it sound robotic?", "Modern voice agents sound natural and handle common questions well. Anything unusual gets routed to you."],
          ["Does it replace my staff?", "No. It covers the calls nobody can answer, like after hours, during jobs, and at busy times."]],
    related: ["ai-chat-agents", "lead-capture-follow-up", "review-systems"]
  },
  "custom-jingles": {
    lane: "remem", name: "Custom Ad Jingles",
    title: "Custom Ad Jingles for Local Businesses",
    desc: "A short, original jingle built around your business name or phone number for radio, video, social ads, and on-hold.",
    intro: "People forget ads. They remember songs. A custom jingle built around your name or number keeps you top of mind long after the ad ends.",
    includes: ["Custom melody and lyrics", "Professional vocals and production", "5, 15, and 30-second cuts", "Versions ready for radio, video, social ads, and phone systems"],
    fit: "Businesses running radio, video, or social ads, or anyone who wants to be the name people remember.",
    faq: [["Can I hear an example?", "Yes. The homepage has a melody sketch for a sample business you can play in your browser."],
          ["Do I own the jingle?", "Usage rights are spelled out in your proposal before we start."]],
    related: ["review-systems", "ongoing-care", "local-seo-ai-search"]
  },
  "review-systems": {
    lane: "remem", name: "Review Systems",
    title: "Review Systems: Get More Google Reviews Automatically",
    desc: "Automatic review requests after each job, simple review links, and alerts for new reviews, so happy customers become your best marketing.",
    intro: "Reviews drive both map rankings and AI recommendations. We make asking automatic, so every happy customer gets an easy way to leave one.",
    includes: ["Automatic review requests by text or email after each job", "Simple links for Google and other review sites", "Alerts when new reviews come in", "Reply drafts you can approve"],
    fit: "Businesses with happy customers but not enough reviews to show it.",
    faq: [["Do reviews really affect rankings?", "Yes. Review count, rating, and recency are among the signals Google and AI assistants use to judge local businesses."],
          ["Will this work with my booking or invoicing tool?", "Usually. We trigger requests from the tools you already use when possible."]],
    related: ["local-seo-ai-search", "ongoing-care", "lead-capture-follow-up"]
  },
  "ongoing-care": {
    lane: "remem", name: "Ongoing Care",
    title: "Ongoing Website Care, SEO Tracking, and Reporting",
    desc: "Monthly updates, fixes, ranking and AI mention tracking, and plain-English performance reports so your site and listings keep working.",
    intro: "Launch is the start, not the finish. Ongoing care keeps your site, listings, and tools working and shows you what's changing every month.",
    includes: ["Monthly updates, fixes, and backups", "Ranking and AI mention tracking", "Review and listing monitoring", "Performance reports in plain English", "Direct access to Michael for questions"],
    fit: "Businesses that want their marketing maintained without managing it themselves.",
    faq: [["Is there a long contract?", "No long contracts. Terms are in your written proposal."],
          ["What's in the monthly report?", "Calls, inquiries, rankings, AI mentions, and what we did, written in plain English."]],
    related: ["local-seo-ai-search", "review-systems", "website-design"]
  }
};

const LANE = { found: "Get found", win: "Win the conversation", remem: "Stay remembered" };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function page(slug, s) {
  const url = `${SITE}/services/${slug}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "Service", name: s.name, description: s.desc, url, serviceType: s.name,
      provider: { "@type": "ProfessionalService", "@id": `${SITE}/#business`, name: "Local Rank Authority", url: SITE },
      areaServed: { "@type": "Country", name: "United States" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/#services` },
      { "@type": "ListItem", position: 3, name: s.name, item: url }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(s.title)} | Local Rank Authority</title>
<meta name="description" content="${esc(s.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Local Rank Authority">
<meta property="og:title" content="${esc(s.title)}"><meta property="og:description" content="${esc(s.desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Cpath d='M17 2 31 7v9c0 8-6 13.5-14 16C9 29.5 3 24 3 16V7z' fill='%23F2A900'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@700;800;900&family=Public+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
:root{--bg:#F5F7F4;--surface:#FFFFFF;--ink:#11201A;--muted:#55645C;--line:#D8DFDA;--sign:#0B5D3F;--sign-ink:#FFFFFF;--sign-deep:#073F2B;--amber:#F2A900;--amber-ink:#2A1E00;--pin:#C8432B;--warn:#B87400;--good:#1B7F4C;
  --display:"Overpass","Arial Narrow",Arial,sans-serif;--body:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--r:6px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0D1512;--surface:#15201B;--ink:#E8EEEA;--muted:#9AAAA1;--line:#2A3832;--sign:#0E6B49;--sign-deep:#08442F;--amber:#F5B82A;--pin:#E66A52;--warn:#E5A53A;--good:#4CC489;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0D1512;--surface:#15201B;--ink:#E8EEEA;--muted:#9AAAA1;--line:#2A3832;--sign:#0E6B49;--sign-deep:#08442F;--amber:#F5B82A;--pin:#E66A52;--warn:#E5A53A;--good:#4CC489;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 var(--body)}
h1,h2,h3{font-family:var(--display);line-height:1.08;margin:0;text-wrap:balance}h2{font-size:clamp(1.7rem,3.5vw,2.3rem);font-weight:900}h3{font-size:1.15rem;font-weight:800}p{margin:0}a{color:inherit}
:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
.wrap{max-width:1000px;margin:0 auto;padding-inline:max(20px,env(safe-area-inset-left,0px))}
header{background:var(--sign-deep);color:var(--sign-ink)}header .wrap{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-block:12px}
.logo{display:flex;align-items:center;gap:10px;font:900 1.05rem var(--display);text-decoration:none;letter-spacing:.02em}.logo svg{width:30px;height:30px;flex:none}
.btn{display:inline-flex;align-items:center;font:700 1rem var(--display);padding:13px 20px;border-radius:var(--r);text-decoration:none;border:2px solid transparent}
.btn-amber{background:var(--amber);color:var(--amber-ink)}.btn-ghost{border-color:currentColor}
.hero{background:var(--sign);color:var(--sign-ink);padding-block:clamp(44px,7vw,80px)}
.hero .wrap{display:flex;flex-direction:column;gap:18px}
.crumbs{font:500 .78rem var(--mono);letter-spacing:.08em;text-transform:uppercase;opacity:.8}.crumbs a{text-underline-offset:3px}
.hero h1{font-size:clamp(2.1rem,5vw,3.4rem);font-weight:900}.hero p{font-size:1.15rem;max-width:62ch;color:rgba(255,255,255,.88)}
.ctas{display:flex;flex-wrap:wrap;gap:12px}
.lane{font:500 .75rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
section.band{padding-block:clamp(44px,6vw,72px)}
.cols{display:grid;grid-template-columns:1.2fr .8fr;gap:40px}@media (max-width:760px){.cols{grid-template-columns:1fr}}
ul.check{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-direction:column;gap:10px}
ul.check li{display:flex;gap:10px}ul.check li::before{content:"";flex:none;width:10px;height:10px;margin-top:9px;border-radius:2px;background:var(--sign)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:10px}
.card p{color:var(--muted)}
details{border-bottom:1px solid var(--line);padding:16px 0}summary{font:800 1.05rem var(--display);cursor:pointer}details p{color:var(--muted);margin-top:8px}
.rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:20px}
.rel a{text-decoration:none}.rel a:hover h3{text-decoration:underline}
.cta{background:var(--sign-deep);color:var(--sign-ink)}.cta .wrap{display:flex;flex-direction:column;gap:16px;align-items:flex-start}.cta p{color:rgba(255,255,255,.85);max-width:60ch}
footer{padding-block:28px;font-size:.88rem;color:var(--muted)}footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
</style>
</head>
<body>
<header><div class="wrap">
  <a class="logo" href="/"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 2 31 7v9c0 8-6 13.5-14 16C9 29.5 3 24 3 16V7z" fill="#F2A900"/><path d="M17 8a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z" fill="#073F2B"/></svg>LOCAL RANK AUTHORITY</a>
  <a class="btn btn-amber" href="/#check" style="padding:9px 16px">Free audit</a>
</div></header>

<section class="hero"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/#services">Services</a></nav>
  <span class="lane">${LANE[s.lane]}</span>
  <h1>${esc(s.name)}</h1>
  <p>${esc(s.intro)}</p>
  <div class="ctas"><a class="btn btn-amber" href="/#check">Run your free audit</a><a class="btn btn-ghost" href="/#contact">Discuss your project</a></div>
</div></section>

<section class="band"><div class="wrap cols">
  <div><h2>What's included</h2><ul class="check">${s.includes.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>
  <div class="card"><h3>Who it's for</h3><p>${esc(s.fit)}</p><h3>How it works</h3><p>We start with a free check, agree on a written plan and price, build and test, then report results monthly. You work directly with Michael Carlson.</p></div>
</div></section>

<section class="band" style="padding-top:0"><div class="wrap">
  <h2>Questions</h2>
  ${s.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n  ")}
</div></section>

<section class="band" style="padding-top:0"><div class="wrap">
  <h2>Works well with</h2>
  <div class="rel">${s.related.map(r => `<a class="card" href="/services/${r}"><span class="lane" style="color:var(--good)">${LANE[SERVICES[r].lane]}</span><h3>${esc(SERVICES[r].name)} →</h3></a>`).join("")}</div>
</div></section>

<section class="band cta"><div class="wrap">
  <h2>See where you stand first</h2>
  <p>The free Local Visibility Audit checks your website speed, SEO, Google and Bing rankings, and AI recommendations in about a minute.</p>
  <div class="ctas"><a class="btn btn-amber" href="/#check">Run your free audit</a><a class="btn btn-ghost" href="/#contact">Tell Michael about your project</a></div>
</div></section>

<footer><div class="wrap"><span>© 2026 Local Rank Authority · Based in New York's Capital Region</span><a href="mailto:mike@localrankauthority.com">mike@localrankauthority.com</a></div></footer>
</body>
</html>`;
}

export function onRequestGet({ params, next }) {
  const s = SERVICES[params.slug];
  if (!s) return next();
  return new Response(page(params.slug, s), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
