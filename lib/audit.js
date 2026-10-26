// Audit engine shared by the /api functions.
// Every check is optional: it runs only when its key or binding is configured, and reports itself as unavailable otherwise.

const UA = "Mozilla/5.0 (compatible; LocalRankAuthorityAudit/1.0; +https://localrankauthority.com)";
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "Bingbot"];
const NOT_FOUND = /(couldn't find|could not find|no (specific |reliable )?information|not able to find|unable to find|don't have (any )?(specific )?information|not familiar|no results)/i;
const CONSULT = "We couldn't complete this check automatically. It's included in your free consultation.";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const bareHost = h => h.toLowerCase().replace(/^www\./, "");

export function normalizeUrl(input) {
  let s = String(input || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return null;
    u.hash = "";
    return u;
  } catch { return null; }
}

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const F = (status, title, detail, fix = "", w = 1) => ({ status, title, detail, fix, w });

function scoreFrom(findings) {
  let got = 0, max = 0;
  for (const f of findings) { max += f.w; got += f.status === "pass" ? f.w : f.status === "warn" ? f.w / 2 : 0; }
  return max ? Math.round(got / max * 100) : null;
}

const grade = n => n == null ? "–" : n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : n >= 60 ? "D" : "F";

const unavailable = (key, label, note = CONSULT) => ({ key, label, score: null, available: false, note, summary: note, findings: [] });

async function timedFetch(url, opts = {}, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}

const normName = s => String(s || "").toLowerCase()
  .replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ")
  .replace(/\b(the|llc|inc|co|company|corp|corporation|ltd)\b/g, " ").replace(/\s+/g, " ").trim();

function mentions(text, business, host) {
  const t = normName(text), n = normName(business);
  const root = host.split(".")[0];
  return (n.length > 2 && t.includes(n)) || (root.length > 3 && t.replace(/ /g, "").includes(root));
}

/* ---------------- Website score (Google PageSpeed) ---------------- */

const METRICS = {
  "largest-contentful-paint": ["Main content load time", "under 2.5 s", "Compress and resize large images, and load the hero image first."],
  "cumulative-layout-shift": ["Layout stability", "under 0.1", "Reserve space for images, ads, and embeds so the page doesn't jump while loading."],
  "total-blocking-time": ["Time the page is frozen", "under 200 ms", "Remove or delay heavy scripts such as chat widgets, sliders, and tracking tags."],
  "first-contentful-paint": ["First content appears", "under 1.8 s", "Use faster hosting and caching, and cut render-blocking CSS and fonts."],
  "speed-index": ["Visual load speed", "under 3.4 s", "Optimize images and scripts so the visible page fills in faster."]
};

async function websiteAudit(pageUrl, key) {
  const cats = "performance(score),accessibility(score),best-practices(score),seo(score)";
  const audits = Object.keys(METRICS).map(k => `${k}(score,displayValue)`).join(",");
  const base = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  base.searchParams.set("url", pageUrl);
  base.searchParams.set("strategy", "mobile");
  base.searchParams.set("key", key);
  for (const c of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) base.searchParams.append("category", c);
  const withFields = new URL(base); withFields.searchParams.set("fields", `lighthouseResult(categories(${cats}),audits(${audits}))`);
  let r = await timedFetch(withFields, {}, 70000);
  if (r.status === 400) { const lite = new URL(base); lite.searchParams.set("fields", "lighthouseResult/categories"); r = await timedFetch(lite, {}, 70000); }
  if (!r.ok) throw new Error("PageSpeed " + r.status);
  const lh = (await r.json()).lighthouseResult || {};
  const c = lh.categories || {}, a = lh.audits || {};
  const pct = x => x?.score == null ? null : Math.round(x.score * 100);
  const perf = pct(c.performance), acc = pct(c.accessibility), bp = pct(c["best-practices"]);
  const lvl = (n, good = 90, ok = 50) => n == null ? "warn" : n >= good ? "pass" : n >= ok ? "warn" : "fail";

  const findings = [];
  if (perf != null) findings.push(F(lvl(perf), "Mobile speed score", `${perf}/100 on Google's mobile test (goal: 90+).`, "Most local customers search on phones. A slow site loses calls before the page finishes loading.", 3));
  for (const [id, [title, goal, fix]] of Object.entries(METRICS)) {
    const m = a[id];
    if (m?.score == null) continue;
    findings.push(F(lvl(m.score * 100), title, `${m.displayValue || "Measured"} on mobile (goal: ${goal}).`, fix, id === "largest-contentful-paint" ? 2 : 1));
  }
  if (acc != null) findings.push(F(lvl(acc), "Accessibility score", `${acc}/100. Covers readable text, contrast, labels, and tap targets.`, "Fix low-contrast text, missing labels, and small buttons so every visitor can use the site.", 2));
  if (bp != null) findings.push(F(lvl(bp), "Best practices score", `${bp}/100. Covers security, errors, and modern web standards.`, "Fix browser console errors, insecure resources, and outdated libraries.", 1));
  // Failing checks first so the teaser leads with what matters
  findings.sort((x, y) => ({ fail: 0, warn: 1, pass: 2 }[x.status] - { fail: 0, warn: 1, pass: 2 }[y.status]) || y.w - x.w);
  const parts = [perf, acc, bp].filter(n => n != null);
  return {
    key: "website", label: "Website score", available: true,
    score: parts.length ? Math.round(parts.reduce((s, n) => s + n, 0) / parts.length) : scoreFrom(findings),
    summary: perf != null ? `Mobile speed ${perf}/100` : "Tested with Google PageSpeed",
    findings, extra: { performance: perf, accessibility: acc, bestPractices: bp, seo: pct(c.seo) }
  };
}

/* ---------------- On-page SEO (reads the site directly) ---------------- */

function parseRobots(txt) {
  const groups = []; let cur = null, lastWasAgent = false;
  for (const raw of (txt || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      if (!lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase()); lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (k === "disallow" || k === "allow")) cur.rules.push([k, v]);
    }
  }
  return groups;
}

function blockedAgents(txt, agents) {
  const groups = parseRobots(txt);
  const blocksAll = g => g.rules.some(([k, v]) => k === "disallow" && v === "/") && !g.rules.some(([k, v]) => k === "allow" && v === "/");
  return agents.filter(a => {
    const own = groups.filter(g => g.agents.includes(a.toLowerCase()));
    const use = own.length ? own : groups.filter(g => g.agents.includes("*"));
    return use.some(blocksAll);
  });
}

async function readPage(url) {
  const started = Date.now();
  const res = await timedFetch(url.href, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" }, 15000);
  const info = { status: res.status, finalUrl: res.url || url.href, ms: Date.now() - started, title: "", metaDesc: null, canonical: null, viewport: false, og: false, h1: [], imgs: 0, imgsNoAlt: 0, ld: [], tel: 0, text: "" };
  let ldBuf = "";
  const rw = new HTMLRewriter()
    .on("title", { text(t) { if (info.title.length < 300) info.title += t.text; } })
    .on("meta", { element(e) {
      const n = (e.getAttribute("name") || "").toLowerCase(), p = (e.getAttribute("property") || "").toLowerCase();
      if (n === "description") info.metaDesc = e.getAttribute("content") || "";
      if (n === "viewport") info.viewport = true;
      if (p === "og:title" || p === "og:image") info.og = true;
    } })
    .on('link[rel="canonical"]', { element(e) { info.canonical = e.getAttribute("href"); } })
    .on("h1", { element() { info.h1.push(""); }, text(t) { if (info.h1.length) info.h1[info.h1.length - 1] += t.text; } })
    .on("img", { element(e) { info.imgs++; const alt = e.getAttribute("alt"); if (alt == null || !alt.trim()) info.imgsNoAlt++; } })
    .on('script[type="application/ld+json"]', { text(t) { ldBuf += t.text; if (t.lastInTextNode) { info.ld.push(ldBuf); ldBuf = ""; } } })
    .on('a[href^="tel:"]', { element() { info.tel++; } })
    .on("body", { text(t) { if (info.text.length < 120000) info.text += t.text; } });
  await rw.transform(res).arrayBuffer();
  info.title = info.title.replace(/\s+/g, " ").trim();
  info.h1 = info.h1.map(h => h.replace(/\s+/g, " ").trim()).filter(Boolean);
  info.text = info.text.replace(/\s+/g, " ");
  return info;
}

async function seoAudit(url, input) {
  const page = await readPage(url);
  if (page.status >= 400) throw new Error("Site returned " + page.status);
  const origin = new URL(page.finalUrl).origin;
  const [robotsRes, sitemapRes] = await Promise.allSettled([
    timedFetch(origin + "/robots.txt", { headers: { "user-agent": UA } }, 8000).then(async r => r.ok ? r.text() : null),
    timedFetch(origin + "/sitemap.xml", { headers: { "user-agent": UA } }, 8000).then(r => r.ok)
  ]);
  const robots = robotsRes.status === "fulfilled" ? robotsRes.value : null;
  const hasSitemap = (sitemapRes.status === "fulfilled" && sitemapRes.value) || /^\s*sitemap\s*:/im.test(robots || "");

  const city = input.city.split(",")[0].trim().toLowerCase();
  const service = input.service.toLowerCase();
  const serviceWord = service.split(/\s+/).sort((a, b) => b.length - a.length)[0] || service;
  const lowText = page.text.toLowerCase(), lowTitle = page.title.toLowerCase();
  const ldText = page.ld.join(" ");
  const bizSchema = /"@type"\s*:\s*\[?\s*"[^"]*(LocalBusiness|Store|Contractor|Plumber|Electrician|HVACBusiness|Locksmith|RoofingContractor|MovingCompany|AutoRepair|Dentist|Physician|LegalService|Attorney|Restaurant|HomeAndConstructionBusiness|ProfessionalService|Organization)/i.test(ldText);
  const f = [];

  f.push(new URL(page.finalUrl).protocol === "https:"
    ? F("pass", "Secure connection (HTTPS)", "Your site loads securely.", "", 2)
    : F("fail", "Secure connection (HTTPS)", "Your site doesn't load over HTTPS, so browsers may label it \"Not secure.\"", "Install an SSL certificate and redirect all pages to https.", 2));

  if (!page.title) f.push(F("fail", "Page title", "Your homepage has no title tag.", "Add a title like \"Service in City | Business Name\".", 2));
  else if (page.title.length < 30 || page.title.length > 65) f.push(F("warn", "Page title length", `"${page.title}" is ${page.title.length} characters (best: 30–65).`, "Rewrite the title to 30–65 characters so Google shows it in full.", 2));
  else f.push(F("pass", "Page title length", `"${page.title}" is a good length.`, "", 2));

  const titleHasCity = lowTitle.includes(city), titleHasService = lowTitle.includes(serviceWord);
  f.push(titleHasCity && titleHasService
    ? F("pass", "Title targets your service and city", "Your title names both.", "", 2)
    : F("warn", "Title targets your service and city", `Your title doesn't mention ${[!titleHasService && `"${input.service}"`, !titleHasCity && `"${input.city}"`].filter(Boolean).join(" or ")}.`, `Put your main service and city in the homepage title, e.g. "${input.service} in ${input.city}".`, 2));

  const md = page.metaDesc;
  if (md == null || !md.trim()) f.push(F("fail", "Meta description", "No meta description, so Google writes its own snippet for you.", "Add a 70–160 character description with your service, city, and a reason to call.", 2));
  else if (md.length < 70 || md.length > 160) f.push(F("warn", "Meta description length", `Your description is ${md.length} characters (best: 70–160).`, "Adjust it to 70–160 characters so it isn't cut off or too thin.", 1));
  else f.push(F("pass", "Meta description", "Present and a good length.", "", 2));

  if (!page.h1.length) f.push(F("fail", "Main heading (H1)", "Your homepage has no H1 heading.", "Add one clear H1 that says what you do and where.", 1));
  else if (page.h1.length > 1) f.push(F("warn", "Main heading (H1)", `Your homepage has ${page.h1.length} H1 headings.`, "Use one H1 for the main topic and H2s for sections.", 1));
  else f.push(F("pass", "Main heading (H1)", `"${page.h1[0].slice(0, 80)}"`, "", 1));

  f.push(page.viewport
    ? F("pass", "Mobile-friendly setup", "Your page is set up to fit phone screens.", "", 2)
    : F("fail", "Mobile-friendly setup", "Your page is missing the mobile viewport setting, so it may render tiny on phones.", "Add a viewport meta tag and test on a phone.", 2));

  f.push(lowText.includes(city)
    ? F("pass", "City mentioned on your homepage", `"${input.city}" appears on the page.`, "", 2)
    : F("fail", "City mentioned on your homepage", `"${input.city}" doesn't appear on your homepage text.`, "Name the city and the areas you serve on the homepage and service pages.", 2));

  f.push(bizSchema
    ? F("pass", "Business schema markup", "Structured data describes your business to search engines.", "", 2)
    : page.ld.length
      ? F("warn", "Business schema markup", "You have structured data, but no LocalBusiness type.", "Add LocalBusiness schema with your name, address, phone, hours, and service area.", 2)
      : F("fail", "Business schema markup", "No structured data found. Search engines and AI tools have to guess your details.", "Add LocalBusiness schema with your name, address, phone, hours, and service area.", 2));

  f.push(page.tel
    ? F("pass", "Tap-to-call phone link", "Phone visitors can call with one tap.", "", 1)
    : F("warn", "Tap-to-call phone link", "No tap-to-call link found on the homepage.", "Make your phone number a tel: link in the header.", 1));

  if (page.imgs) {
    const miss = page.imgsNoAlt / page.imgs;
    f.push(F(miss <= 0.1 ? "pass" : miss <= 0.5 ? "warn" : "fail", "Image descriptions (alt text)", `${page.imgsNoAlt} of ${page.imgs} images have no description.`, "Describe each image, e.g. \"technician repairing water heater in Wilmington\".", 1));
  }

  f.push(page.canonical
    ? F("pass", "Canonical tag", "Tells Google which URL is the main version.", "", 1)
    : F("warn", "Canonical tag", "No canonical tag, which can split ranking signals across duplicate URLs.", "Add a canonical link tag to each page.", 1));

  const allBlocked = robots && blockedAgents(robots, ["Googlebot"]).length;
  f.push(allBlocked
    ? F("fail", "Search engine access (robots.txt)", "Your robots.txt blocks Google from crawling the site.", "Remove the Disallow: / rule for search engines.", 3)
    : robots
      ? F("pass", "Search engine access (robots.txt)", "Search engines can crawl your site.", "", 1)
      : F("warn", "Search engine access (robots.txt)", "No robots.txt file found.", "Add a robots.txt that allows crawling and points to your sitemap.", 1));

  f.push(hasSitemap
    ? F("pass", "XML sitemap", "Search engines can find a list of your pages.", "", 1)
    : F("warn", "XML sitemap", "No sitemap found at /sitemap.xml or in robots.txt.", "Create a sitemap and submit it in Google Search Console and Bing Webmaster Tools.", 1));

  f.push(page.og
    ? F("pass", "Social sharing preview", "Links to your site show a title and image when shared.", "", 1)
    : F("warn", "Social sharing preview", "No Open Graph tags, so shared links may look blank.", "Add og:title, og:description, and og:image tags.", 1));

  f.sort((x, y) => ({ fail: 0, warn: 1, pass: 2 }[x.status] - { fail: 0, warn: 1, pass: 2 }[y.status]) || y.w - x.w);
  const issues = f.filter(x => x.status !== "pass").length;
  return {
    section: { key: "seo", label: "SEO audit", available: true, score: scoreFrom(f), summary: `${f.length} on-page checks, ${issues} need work`, findings: f },
    robots, page
  };
}

/* ---------------- Rankings (SerpApi: Google, Bing, DuckDuckGo) ---------------- */

async function serp(engine, q, key) {
  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", engine);
  u.searchParams.set("q", q);
  u.searchParams.set("api_key", key);
  if (engine === "google") { u.searchParams.set("gl", "us"); u.searchParams.set("hl", "en"); }
  if (engine === "bing") u.searchParams.set("cc", "US");
  if (engine === "duckduckgo") u.searchParams.set("kl", "us-en");
  const r = await timedFetch(u, {}, 30000);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

const hostOf = link => { try { return bareHost(new URL(link).hostname); } catch { return ""; } };

async function rankingsAudit(input, host, env) {
  const q = `${input.service} ${input.city}`.toLowerCase();
  const names = { google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo" };
  const results = await Promise.allSettled(Object.keys(names).map(e => serp(e, q, env.SERPAPI_KEY)));
  const findings = [], engines = [];
  results.forEach((res, i) => {
    const engine = Object.keys(names)[i], label = names[engine];
    if (res.status !== "fulfilled") { engines.push({ engine: label, error: true }); return; }
    const d = res.value;
    const organic = (d.organic_results || []).slice(0, 10);
    const hit = organic.find(o => { const h = hostOf(o.link); return h === host || h.endsWith("." + host); });
    const pos = hit ? (hit.position || organic.indexOf(hit) + 1) : null;
    const competitors = organic.filter(o => o !== hit).slice(0, 3).map(o => ({ title: o.title, domain: hostOf(o.link) }));
    engines.push({ engine: label, position: pos, competitors });
    findings.push(pos && pos <= 3
      ? F("pass", `${label} ranking`, `#${pos} for "${q}".`, "", 2)
      : pos
        ? F("warn", `${label} ranking`, `#${pos} for "${q}", below the top 3 where most clicks go.`, "Strengthen your service page for this search and earn more local links and reviews.", 2)
        : F("fail", `${label} ranking`, `Not in the top 10 for "${q}". Top results: ${competitors.map(c => c.domain).join(", ") || "other businesses"}.`, "Build a dedicated page for this service and city, then earn local links and citations.", 2));
    if (engine === "google") {
      const places = d.local_results?.places || (Array.isArray(d.local_results) ? d.local_results : []);
      const inPack = places.some(p => mentions(p.title, input.business, host) || hostOf(p.website || p.links?.website || "") === host);
      if (places.length) findings.push(inPack
        ? F("pass", "Google Maps (local pack)", "You appear in the map results for this search.", "", 3)
        : F("fail", "Google Maps (local pack)", `You're not in the map results. Showing instead: ${places.slice(0, 3).map(p => p.title).join(", ")}.`, "Optimize your Google Business Profile: categories, services, photos, and steady new reviews.", 3));
    }
  });
  if (!findings.length) throw new Error("No ranking results");
  findings.sort((x, y) => ({ fail: 0, warn: 1, pass: 2 }[x.status] - { fail: 0, warn: 1, pass: 2 }[y.status]) || y.w - x.w);
  const found = engines.filter(e => e.position).length, checked = engines.filter(e => !e.error).length;
  return { key: "rankings", label: "Search rankings", available: true, score: scoreFrom(findings), summary: `Found on ${found} of ${checked} search engines for "${q}"`, findings, extra: { keyword: q, engines } };
}

/* ---------------- AI visibility (Gemini with Google Search, Workers AI) ---------------- */

async function gemini(prompt, env) {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
  }, 45000);
  if (!r.ok) throw new Error("Gemini " + r.status);
  const d = await r.json();
  const cand = d.candidates?.[0] || {};
  const text = (cand.content?.parts || []).map(p => p.text || "").join("").trim();
  const sources = (cand.groundingMetadata?.groundingChunks || []).map(c => c.web?.title || "").filter(Boolean);
  return { text, sources };
}

async function workersAi(prompt, env) {
  const out = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages: [{ role: "user", content: prompt }], max_tokens: 500 });
  const text = typeof out?.response === "string" ? out.response : out?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Empty AI response");
  return text.trim();
}

async function aiAudit(input, host, seo, env) {
  const ask = `I'm looking for a ${input.service} in ${input.city}. Which local businesses would you recommend? List up to 8 business names with one short reason each.`;
  const about = `What is ${input.business} (${host})? What services do they offer, and where are they located? Answer in 3 sentences. If you can't find reliable information, say so.`;
  const [recRes, aboutRes, llamaRes] = await Promise.allSettled([
    env.GEMINI_KEY ? gemini(ask, env) : Promise.reject(new Error("no key")),
    env.GEMINI_KEY ? gemini(about, env) : Promise.reject(new Error("no key")),
    env.AI ? workersAi(ask, env) : Promise.reject(new Error("no binding"))
  ]);
  const f = [], extra = { answers: {} };
  let tools = 0, mentioned = 0;
  // Kept in the stored report (never in the teaser) so failed checks can be diagnosed
  extra.errors = [["gemini", recRes], ["gemini-about", aboutRes], ["workers-ai", llamaRes]]
    .filter(([, r]) => r.status === "rejected").map(([k, r]) => `${k}: ${r.reason?.message || r.reason}`);

  if (recRes.status === "fulfilled") {
    tools++;
    const { text, sources } = recRes.value;
    const hit = mentions(text, input.business, host) || sources.some(s => bareHost(s).includes(host));
    if (hit) mentioned++;
    extra.answers.recommend = text.slice(0, 1200);
    f.push(hit
      ? F("pass", "Recommended by Google's AI", `When asked for a ${input.service} in ${input.city}, Google's Gemini (with live search) named your business.`, "", 4)
      : F("fail", "Recommended by Google's AI", `When asked for a ${input.service} in ${input.city}, Google's Gemini (with live search) recommended other businesses, not you.`, "Earn reviews and mentions on sites AI tools trust, and publish clear service and location pages.", 4));
  }
  if (aboutRes.status === "fulfilled") {
    const t = aboutRes.value.text, low = t.toLowerCase();
    const city = input.city.split(",")[0].trim().toLowerCase();
    const knows = !NOT_FOUND.test(t) && (low.includes(city) || low.includes(input.service.toLowerCase().split(" ")[0]));
    extra.answers.about = t.slice(0, 900);
    f.push(knows
      ? F("pass", "AI describes your business accurately", "Asked about your business by name, Gemini described your services and location.", "", 2)
      : NOT_FOUND.test(t)
        ? F("fail", "AI describes your business accurately", "Asked about your business by name, Gemini couldn't find reliable information about you.", "Make your name, address, phone, and services consistent across your site, Google profile, and directories.", 2)
        : F("warn", "AI describes your business accurately", "Asked about your business by name, Gemini's answer was vague or missed your location or services.", "State your services and service area plainly on your homepage and Google profile.", 2));
  }
  if (llamaRes.status === "fulfilled") {
    tools++;
    const hit = mentions(llamaRes.value, input.business, host);
    if (hit) mentioned++;
    extra.answers.model = llamaRes.value.slice(0, 900);
    f.push(hit
      ? F("pass", "Known to AI models without search", "An open-source AI model (Llama) named you from what it learned, without searching.", "", 1)
      : F("warn", "Known to AI models without search", "An open-source AI model (Llama) didn't name you from what it learned. This builds slowly as you're mentioned across the web.", "Get listed in industry directories, local news, and associations.", 1));
  }
  if (seo?.robots != null) {
    const blocked = blockedAgents(seo.robots, AI_BOTS);
    f.push(blocked.length
      ? F("fail", "AI search crawlers allowed", `Your robots.txt blocks: ${blocked.join(", ")}.`, "Allow AI search crawlers such as OAI-SearchBot and PerplexityBot so they can cite you.", 2)
      : F("pass", "AI search crawlers allowed", "ChatGPT, Perplexity, Claude, and Google AI crawlers can read your site.", "", 2));
  }
  if (seo?.page) {
    const faq = /(frequently asked|faq)/i.test(seo.page.text);
    f.push(faq
      ? F("pass", "Answers customer questions", "Your homepage includes FAQ content AI tools can quote.", "", 1)
      : F("warn", "Answers customer questions", "No FAQ content found on your homepage.", "Add answers to the questions customers ask on the phone: prices, timing, service area.", 1));
  }
  // Without at least one AI answer, a score from the readiness checks alone would overstate visibility
  if (!tools) return { ...unavailable("ai", "AI visibility", "Your AI visibility check, including what Google's AI and other assistants say about you, is included in your free consultation."), extra };
  f.sort((x, y) => ({ fail: 0, warn: 1, pass: 2 }[x.status] - { fail: 0, warn: 1, pass: 2 }[y.status]) || y.w - x.w);
  return { key: "ai", label: "AI visibility", available: true, score: scoreFrom(f), summary: tools ? `Mentioned by ${mentioned} of ${tools} AI tool${tools > 1 ? "s" : ""}` : "AI readiness checks", findings: f, extra };
}

/* ---------------- Orchestration ---------------- */

export async function runAudit(input, env, { allowRankings = true } = {}) {
  const host = bareHost(input.url.hostname);
  const id = crypto.randomUUID();
  const webP = env.PSI_KEY ? websiteAudit(input.url.href, env.PSI_KEY).catch(() => unavailable("website", "Website score")) : Promise.resolve(unavailable("website", "Website score"));
  const rankP = env.SERPAPI_KEY && allowRankings
    ? rankingsAudit(input, host, env).catch(() => unavailable("rankings", "Search rankings"))
    : Promise.resolve(unavailable("rankings", "Search rankings", "Your full Google, Bing, and DuckDuckGo ranking report is included in your free consultation."));
  let seo = null;
  try { seo = await seoAudit(input.url, input); } catch { seo = null; }
  const aiP = aiAudit(input, host, seo, env).catch(() => unavailable("ai", "AI visibility"));
  const [web, rank, ai] = await Promise.all([webP, rankP, aiP]);
  const sections = [web, seo ? seo.section : unavailable("seo", "SEO audit", "We couldn't read your homepage. Check that the address is right, or ask us to review it by hand."), rank, ai];
  const scored = sections.filter(s => s.score != null);
  const overall = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : null;
  return {
    id, createdAt: new Date().toISOString(),
    input: { url: input.url.href, host, business: input.business, service: input.service, city: input.city },
    overall, grade: grade(overall),
    sections: sections.map(s => ({ ...s, grade: grade(s.score) }))
  };
}

// What the browser sees before the visitor unlocks: scores, one finding per section, and counts.
export function teaser(r) {
  return {
    id: r.id, input: r.input, overall: r.overall, grade: r.grade, locked: true,
    sections: r.sections.map(s => {
      const issues = s.findings.filter(f => f.status !== "pass");
      const show = issues[0] || s.findings[0];
      return {
        key: s.key, label: s.label, score: s.score, grade: s.grade, available: s.available, note: s.note || null, summary: s.summary,
        preview: show ? { status: show.status, title: show.title, detail: show.detail } : null,
        issues: issues.length, checks: s.findings.length
      };
    })
  };
}

/* ---------------- Email ---------------- */

export function reportEmailHtml(r, intro) {
  const color = { pass: "#1B7F4C", warn: "#B87400", fail: "#C8432B" };
  const label = { pass: "Good", warn: "Needs work", fail: "Problem" };
  const rows = r.sections.map(s => `
    <h2 style="font:800 18px Arial,sans-serif;margin:28px 0 6px">${esc(s.label)} · ${s.score ?? "–"}/100</h2>
    <p style="margin:0 0 10px;color:#55645C">${esc(s.summary || "")}</p>
    ${s.findings.map(f => `<div style="border-left:4px solid ${color[f.status]};padding:6px 12px;margin:8px 0">
      <b>${esc(f.title)}</b> <span style="color:${color[f.status]};font-size:12px">${label[f.status]}</span><br>
      <span>${esc(f.detail)}</span>${f.fix && f.status !== "pass" ? `<br><span style="color:#55645C">Fix: ${esc(f.fix)}</span>` : ""}</div>`).join("")}`).join("");
  return `<div style="font:15px/1.5 Arial,sans-serif;color:#11201A;max-width:640px">
    <p>${intro}</p>
    <h1 style="font:900 26px Arial,sans-serif;margin:16px 0 4px">${esc(r.input.business)}: ${r.overall ?? "–"}/100 (${r.grade})</h1>
    <p style="margin:0;color:#55645C">${esc(r.input.host)} · ${esc(r.input.service)} in ${esc(r.input.city)}</p>
    ${rows}
    <p style="margin-top:28px">Want help fixing these? Reply to this email or book a call at localrankauthority.com.</p>
  </div>`;
}

export async function sendEmail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.FROM_EMAIL || "Local Rank Authority <audit@localrankauthority.com>", to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
  });
  return r.ok;
}
