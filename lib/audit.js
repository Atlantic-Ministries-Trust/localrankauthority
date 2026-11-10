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

import { visibilityScore, reputationScore, aiShareScore, namedPosition } from "./scoring.js";

// Report method version (Part Six of the 2026-11-09 brief). Stored on every new report; older reports keep theirs (none = "2026-10").
// .2: industry-anchored scoring (lib/scoring.js), reputation section, AI share of voice, competitor benchmark.
export const METHOD_VERSION = "2026-11-09.2";

// status: pass | warn | fail | review. "review" means the check ran but its evidence doesn't support a verdict
// (unexpected search results, an AI answer we can't confirm): it's shown with its evidence and never counted in a score.
const F = (status, title, detail, fix = "", w = 1, evidence = null) => ({ status, title, detail, fix, w, ...(evidence ? { evidence } : {}) });
const ORDER = { fail: 0, warn: 1, review: 2, pass: 3 };
const byStatus = (x, y) => (ORDER[x.status] - ORDER[y.status]) || y.w - x.w;

export function scoreFrom(findings) {
  let got = 0, max = 0;
  for (const f of findings) { if (f.status === "review" || !f.w) continue; max += f.w; got += f.status === "pass" ? f.w : f.status === "warn" ? f.w / 2 : 0; }
  return max ? Math.round(got / max * 100) : null;
}

const grade = n => n == null ? "–" : n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : n >= 60 ? "D" : "F";

const unavailable = (key, label, note = CONSULT) => ({ key, label, score: null, available: false, note, summary: note, findings: [] });

export async function timedFetch(url, opts = {}, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}

const normName = s => String(s || "").toLowerCase()
  .replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ")
  .replace(/\b(the|llc|inc|co|company|corp|corporation|ltd)\b/g, " ").replace(/\s+/g, " ").trim();

export function mentions(text, business, host) {
  const t = normName(text), n = normName(business);
  const root = host.split(".")[0];
  return (n.length > 2 && t.includes(n)) || (root.length > 3 && t.replace(/ /g, "").includes(root));
}

/* ---------------- Website score (Google PageSpeed) ---------------- */

// Lighthouse metric thresholds (good, poor) and fixes, keyed by audit id
const METRICS = {
  "largest-contentful-paint": ["lcp", "Main content load time", 2500, 4000, "ms", "Compress and resize large images, and load the hero image first.", 2],
  "cumulative-layout-shift": ["cls", "Layout stability", 0.1, 0.25, "", "Reserve space for images, ads, and embeds so the page doesn't jump while loading.", 1],
  "total-blocking-time": ["tbt", "Time the page is frozen", 200, 600, "ms", "Remove or delay heavy scripts such as chat widgets, sliders, and tracking tags.", 1],
  "first-contentful-paint": ["fcp", "First content appears", 1800, 3000, "ms", "Use faster hosting and caching, and cut render-blocking CSS and fonts.", 1],
  "speed-index": ["si", "Visual load speed", 3400, 5800, "ms", "Optimize images and scripts so the visible page fills in faster.", 1]
};
const fmtMetric = (v, u) => u === "ms" ? (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`) : (+v).toFixed(2);

async function websiteAudit(pageUrl, key) {
  const base = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  base.searchParams.set("url", pageUrl);
  base.searchParams.set("strategy", "mobile");
  base.searchParams.set("key", key);
  for (const c of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) base.searchParams.append("category", c);
  // The API can't filter inside the audits map, so ask for all audits and strip the embedded screenshots before parsing
  const withFields = new URL(base); withFields.searchParams.set("fields", "lighthouseResult/categories,lighthouseResult/audits");
  let r = await timedFetch(withFields, {}, 70000), fieldsError = null;
  if (r.status === 400) {
    fieldsError = (await r.text()).slice(0, 300);
    const lite = new URL(base); lite.searchParams.set("fields", "lighthouseResult/categories"); r = await timedFetch(lite, {}, 70000);
  }
  if (!r.ok) throw new Error("PageSpeed " + r.status);
  const lh = JSON.parse((await r.text()).replace(/"data:image\/[^"]*"/g, '""')).lighthouseResult || {};
  const c = lh.categories || {}, audits = lh.audits || {};
  const pct = x => x?.score == null ? null : Math.round(x.score * 100);
  const perf = pct(c.performance), acc = pct(c.accessibility), bp = pct(c["best-practices"]);
  const lvl = (n, good = 90, ok = 50) => n == null ? "warn" : n >= good ? "pass" : n >= ok ? "warn" : "fail";

  const findings = [], metrics = {};
  if (perf != null) findings.push(F(lvl(perf), "Mobile speed score", `${perf}/100 on Google's mobile test (goal: 90+).`, "Most local customers search on phones. A slow site loses calls before the page finishes loading.", 3));
  for (const [name, [id, title, good, poor, unit, fix, w]] of Object.entries(METRICS)) {
    const v = audits[name]?.numericValue;
    if (v == null) continue;
    metrics[id] = v;
    findings.push(F(v <= good ? "pass" : v <= poor ? "warn" : "fail", title, `${fmtMetric(v, unit)} on mobile (goal: under ${fmtMetric(good, unit)}).`, fix, w));
  }
  if (acc != null) findings.push(F(lvl(acc), "Accessibility score (not in your score)", `${acc}/100 on Google's accessibility test. Covers readable text, contrast, labels, and tap targets.`, "Fix low-contrast text, missing labels, and small buttons so every visitor can use the site.", 0));
  if (bp != null) findings.push(F(lvl(bp), "Best practices score (not in your score)", `${bp}/100. Covers security, errors, and modern web standards.`, "Fix browser console errors, insecure resources, and outdated libraries.", 0));
  // Failing checks first so the teaser leads with what matters
  findings.sort(byStatus);
  return {
    // Google Lighthouse's own mobile performance score, with Google's published metric weights.
    // Accessibility and best practices are shown as findings but don't change the score.
    key: "website", label: "Website score", available: true,
    score: perf != null ? perf : scoreFrom(findings),
    summary: perf != null ? `Mobile speed ${perf}/100` : "Tested with Google PageSpeed",
    findings, extra: { performance: perf, accessibility: acc, bestPractices: bp, seo: pct(c.seo), metrics, ...(fieldsError ? { fieldsError } : {}) }
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
  const info = { status: res.status, finalUrl: res.url || url.href, ms: Date.now() - started, title: "", metaDesc: null, canonical: null, viewport: false, og: false, h1: [], imgs: 0, imgsNoAlt: 0, imgsDecorative: 0, links: [], ld: [], tel: 0, text: "" };
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
    .on("h1 *", { element() { if (info.h1.length) info.h1[info.h1.length - 1] += " "; } })
    // alt="" is correct for decorative images; only a missing alt attribute is a problem
    .on("img", { element(e) { info.imgs++; const alt = e.getAttribute("alt"); if (alt == null) info.imgsNoAlt++; else if (!alt.trim()) info.imgsDecorative++; } })
    .on('script[type="application/ld+json"]', { text(t) { ldBuf += t.text; if (t.lastInTextNode) { info.ld.push(ldBuf); ldBuf = ""; } } })
    .on('a[href^="tel:"]', { element() { info.tel++; } })
    .on("a[href]", { element(e) { if (info.links.length < 400) info.links.push({ href: e.getAttribute("href") || "", text: "" }); }, text(x) { const l = info.links[info.links.length - 1]; if (l && l.text.length < 120) l.text += x.text; } })
    .on("body", { text(t) { if (info.text.length < 120000) info.text += t.text; } });
  await rw.transform(res).arrayBuffer();
  // HTMLRewriter hands back text and attributes as written in the HTML, so "&amp;" has to be turned back into "&"
  info.title = decodeEntities(info.title).replace(/\s+/g, " ").trim();
  info.h1 = info.h1.map(h => decodeEntities(h).replace(/\s+/g, " ").trim()).filter(Boolean);
  if (info.metaDesc != null) info.metaDesc = decodeEntities(info.metaDesc);
  info.text = decodeEntities(info.text).replace(/\s+/g, " ");
  return info;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", bull: "•", middot: "·", copy: "©", reg: "®", trade: "™" };
function decodeEntities(s) {
  return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export async function seoAudit(url, input) {
  const page = await readPage(url);
  const host = bareHost(new URL(page.finalUrl).hostname);
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
  else if (page.title.length < 30 || page.title.length > 65) f.push(F("warn", "Page title length", `"${page.title}" is ${page.title.length} characters (best: 30–65).`, "Rewrite the title to 30–65 characters so Google shows it in full.", 1));
  else f.push(F("pass", "Page title length", `"${page.title}" is a good length.`, "", 1));

  const titleHasCity = lowTitle.includes(city), titleHasService = lowTitle.includes(serviceWord);
  f.push(titleHasCity && titleHasService
    ? F("pass", "Title targets your service and city", "Your title names both.", "", 3)
    : F("warn", "Title targets your service and city", `Your title doesn't mention ${[!titleHasService && `"${input.service}"`, !titleHasCity && `"${input.city}"`].filter(Boolean).join(" or ")}.`, `Put your main service and city in the homepage title, e.g. "${input.service} in ${input.city}".`, 3));

  // Whitespark 2026: "dedicated page for each service" is the top local organic factor
  const svcWords = service.split(/\s+/).filter(w => w.length > 3);
  const internal = href => { if (/^(mailto|tel|javascript):/i.test(href) || href.startsWith("#")) return false; if (!/^https?:\/\//i.test(href)) return true;
    try { const h = bareHost(new URL(href).hostname); return h === host || h.endsWith("." + host); } catch { return false; } };
  const svcLink = page.links.find(l => internal(l.href) && svcWords.length && svcWords.every(w => `${l.href} ${l.text}`.toLowerCase().includes(w.replace(/s$/, ""))));
  f.push(svcLink
    ? F("pass", "Dedicated page for your service", `Your homepage links to a page about ${input.service} ("${(svcLink.text || svcLink.href).trim().slice(0, 60)}").`, "", 3)
    : F("warn", "Dedicated page for your service", `We didn't find a link from your homepage to a page about ${input.service}.`, `Create a page just for ${input.service} (and one per main service), and link to it from your homepage.`, 3));

  const md = page.metaDesc;
  if (md == null || !md.trim()) f.push(F("fail", "Meta description", "No meta description, so Google writes its own snippet for you.", "Add a description with your service, city, and a reason to call.", 1));
  else if (md.length < 70) f.push(F("warn", "Meta description", `Your description is only ${md.length} characters, which may be too thin to help searchers choose you.`, "Expand it to say what you offer, where, and why someone should pick you.", 1));
  // Google has no fixed length limit; long descriptions are simply shortened in results, so length alone isn't a problem
  else f.push(F("pass", "Meta description", md.length > 160 ? `Present (${md.length} characters). Google may shorten it in results, which is normal.` : "Present and a useful length.", "", 1));

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
    const deco = page.imgsDecorative ? ` ${page.imgsDecorative} use an empty alt, which is correct for decorative images.` : "";
    f.push(F(miss <= 0.1 ? "pass" : miss <= 0.5 ? "warn" : "fail", "Image descriptions (alt text)", `${page.imgsNoAlt} of ${page.imgs} images have no alt attribute.${deco}`, "Give informative images (your work, your team, your products) a short description of what they show. Leave purely decorative images with an empty alt.", 1));
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

  f.sort(byStatus);
  const issues = f.filter(x => x.status === "fail" || x.status === "warn").length;
  return {
    section: { key: "seo", label: "SEO audit", available: true, score: scoreFrom(f), summary: `${f.length} on-page checks, ${issues} need work`, findings: f },
    robots, page
  };
}

/* ---------------- Rankings (SerpApi: Google in the teaser, Bing after unlock) ---------------- */

const ENGINES = { google: "Google", bing: "Bing" };
const LOCKED = "Unlock your full report to see where you rank on Google and Bing.";

const STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };

// Turns "Wilmington, NC" into SerpApi's canonical city and coordinates so searches run as if from that city. Free lookup, cached 30 days.
export async function findLocation(city, env) {
  const [name, st = ""] = city.split(",").map(x => x.trim());
  const state = (STATES[st.toUpperCase()] || st).toLowerCase();
  const cacheKey = `loc:${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const hit = await env.REPORTS?.get(cacheKey, "json");
  if (hit) return hit.canonical ? hit : null;
  let loc = {};
  try {
    const r = await timedFetch(`https://serpapi.com/locations.json?q=${encodeURIComponent(name)}&limit=10`, {}, 8000);
    const list = await r.json();
    const m = list.find(l => l.target_type === "City" && l.canonical_name.toLowerCase().split(",").includes(state)) || (!state && list.find(l => l.target_type === "City" && l.country_code === "US"));
    if (m) loc = { canonical: m.canonical_name, lon: m.gps?.[0], lat: m.gps?.[1] };
  } catch { return null; }
  await env.REPORTS?.put(cacheKey, JSON.stringify(loc), { expirationTtl: 30 * 86400 });
  return loc.canonical ? loc : null;
}

export async function serp(engine, q, key, loc) {
  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", engine);
  u.searchParams.set("q", q);
  u.searchParams.set("api_key", key);
  if (engine === "google") { u.searchParams.set("gl", "us"); u.searchParams.set("hl", "en"); if (loc) u.searchParams.set("location", loc.canonical); }
  // Bing: without a market it returned unrelated, non-English results (2026-11-09: Chinese Q&A pages about Wikipedia for
  // "party rentals albany, ny"). Pin it to the US market; relevance is also validated before any result is scored.
  if (engine === "bing") { u.searchParams.set("cc", "US"); u.searchParams.set("mkt", "en-US"); if (loc) u.searchParams.set("location", loc.canonical); }
  const r = await timedFetch(u, {}, 30000);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

// Results for the same search are shared between audits for 7 days, and only real SerpApi calls count toward the monthly ceiling
async function cachedSerp(engine, q, env, loc) {
  const cacheKey = `serpcache5:${engine}:${q.replace(/[^a-z0-9]+/g, "-")}`; // v5: Map Pack categories kept too
  const hit = await env.REPORTS?.get(cacheKey, "json");
  if (hit) return hit;
  if (env.REPORTS) {
    const monthKey = `serp:${new Date().toISOString().slice(0, 7)}`;
    const used = +(await env.REPORTS.get(monthKey)) || 0;
    if (used >= (+env.SERP_MONTHLY_LIMIT || 240)) throw new Error("Monthly search limit reached");
    await env.REPORTS.put(monthKey, String(used + 1), { expirationTtl: 40 * 86400 });
  }
  const d = await serp(engine, q, env.SERPAPI_KEY, loc);
  const places = d.local_results?.places || (Array.isArray(d.local_results) ? d.local_results : []);
  const slim = {
    organic_results: (d.organic_results || []).slice(0, 10).map(o => ({ position: o.position, link: o.link, title: o.title })),
    places: places.slice(0, 5).map(p => ({ title: p.title, website: p.website || p.links?.website || "", rating: p.rating ?? null, reviews: p.reviews ?? null, type: p.type || null }))
  };
  await env.REPORTS?.put(cacheKey, JSON.stringify(slim), { expirationTtl: 7 * 86400 });
  return slim;
}

const hostOf = link => { try { return bareHost(new URL(link).hostname); } catch { return ""; } };

// Does a result page look like the search we asked for? Off-topic or foreign-language results mean the data can't be trusted.
const STOP = new Set(["the", "and", "for", "near", "with", "best", "from", "your", "what", "service", "services"]);
const REFERENCE = /(^|\.)(wikipedia\.org|wiktionary\.org|britannica\.com|merriam-webster\.com|dictionary\.com|thesaurus\.com|cambridge\.org|collinsdictionary\.com|vocabulary\.com|thefreedictionary\.com|zhihu\.com|baidu\.com)$/i;
const hostOfLink = l => { try { return new URL(l).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
export function searchRelevance(q, organic) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
  if (!organic.length || !words.length) return { ok: true, share: 1 };
  const hits = organic.filter(o => { const s = `${o.title || ""} ${o.link || ""}`.toLowerCase(); return words.some(w => s.includes(w)); }).length;
  const nonLatin = organic.filter(o => /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/.test(o.title || "")).length;
  const share = hits / organic.length;
  // Dictionaries and encyclopedias match single words ("letter", "marquee") without being businesses for this search.
  // 2026-11-10: Bing returned Wikipedia, Britannica, and Merriam-Webster for "light-up letter rentals albany, ny".
  const top = organic.slice(0, 5), refs = top.filter(o => REFERENCE.test(hostOfLink(o.link))).length;
  return { ok: share >= 0.3 && nonLatin / organic.length < 0.3 && refs < 2, share: Math.round(share * 100) / 100, nonLatin, reference: refs };
}

async function engineFindings(input, host, env, engines) {
  const q = `${input.service} ${input.city}`.toLowerCase();
  const loc = await findLocation(input.city, env);
  const at = new Date().toISOString();
  const results = await Promise.allSettled(engines.map(e => cachedSerp(e, q, env, loc)));
  const findings = [], checked = [];
  results.forEach((res, i) => {
    const engine = engines[i], label = ENGINES[engine];
    if (res.status !== "fulfilled") return;
    const d = res.value;
    const organic = d.organic_results;
    const ev = { provider: "SerpApi", engine: label, query: q, location: loc?.canonical || (engine === "google" ? "not set" : "US market"), depth: organic.length, checked_at: at,
      top: organic.slice(0, 5).map(o => hostOf(o.link)) };
    const rel = searchRelevance(q, organic);
    if (!rel.ok) {
      // Don't score data that doesn't match the search (this is what produced the Wikipedia/dictionary "competitors")
      checked.push({ engine: label, position: null, competitors: [], suspicious: true });
      findings.push(F("review", `${label} organic ranking`, `The ${label} results returned for "${q}" didn't match that search (for example ${ev.top.slice(0, 3).join(", ") || "no usable results"}), so we haven't scored them.`, "We'll recheck this search. It doesn't count against your score.", 2, { ...ev, relevance: rel }));
      return;
    }
    const hit = organic.find(o => { const h = hostOf(o.link); return h === host || h.endsWith("." + host); });
    const pos = hit ? (hit.position || organic.indexOf(hit) + 1) : null;
    const competitors = organic.filter(o => o !== hit).slice(0, 5).map(o => ({ title: o.title, domain: hostOf(o.link) }));
    const pack = engine === "google" ? d.places.slice(0, 3).map((p, k) => ({ rank: k + 1, title: p.title, website: p.website, rating: p.rating ?? null, reviews: p.reviews ?? null, type: p.type || null,
      you: mentions(p.title, input.business, host) || hostOf(p.website) === host })) : null;
    checked.push({ engine: label, position: pos, competitors, organicDomains: organic.map((o, k) => ({ position: o.position || k + 1, domain: hostOf(o.link) })),
      ...(pack ? { places: pack.map(p => p.title), pack, mapsTop3: d.places.length ? pack.some(p => p.you) : null } : {}) });
    const where = `${ev.location === "not set" ? "" : ` (searched from ${ev.location}`}${ev.location === "not set" ? "" : `, ${at.slice(0, 10)})`}`;
    findings.push(pos && pos <= 3
      ? F("pass", `${label} organic ranking`, `#${pos} for "${q}"${where}.`, "", 2, { ...ev, position: pos })
      : pos
        ? F("warn", `${label} organic ranking`, `#${pos} for "${q}"${where}, below the top 3 where most clicks go.`, "Strengthen your service page for this search and earn more local links and reviews.", 2, { ...ev, position: pos })
        : F("fail", `${label} organic ranking`, `Not found within the top ${organic.length || 10} results checked for "${q}"${where}. Top results: ${competitors.slice(0, 3).map(c => c.domain).join(", ") || "other businesses"}.`, "Build a dedicated page for this service and city, then earn local links and citations.", 2, ev));
    if (engine === "google" && d.places.length) {
      const inPack = d.places.some(p => mentions(p.title, input.business, host) || hostOf(p.website) === host);
      const mev = { ...ev, ranking_type: "Google Maps (top 3)", places: d.places.slice(0, 3).map(p => p.title) };
      findings.push(inPack
        ? F("pass", "Google Maps (local pack)", `You appear in the map results for this search${where}.`, "", 3, mev)
        : F("fail", "Google Maps (local pack)", `Not found in the map results checked for this search${where}. Showing instead: ${d.places.slice(0, 3).map(p => p.title).join(", ")}.`, "Optimize your Google Business Profile: categories, services, photos, and steady new reviews.", 3, mev));
    }
  });
  return { q, findings, checked };
}

function rankingsSection(q, findings, engines) {
  findings.sort(byStatus);
  const real = engines.filter(e => !e.error && !e.suspicious), found = real.filter(e => e.position).length;
  const summary = !real.length ? `Search results for "${q}" need review` : real.length === 1 ? `${real[0].engine}: ${real[0].position ? "#" + real[0].position : "not found in the top 10 checked"} for "${q}"` : `Found on ${found} of ${real.length} search engines for "${q}"`;
  // Maps 60% / organic 40% (lib/scoring.js). Unusable results (status review) are left out entirely.
  const google = real.find(e => e.engine === "Google");
  const score = visibilityScore({ mapsTop3: google ? (google.mapsTop3 ?? null) : null, organic: real.map(e => e.position || null) });
  return { key: "rankings", label: "Search rankings", available: true, score, summary, findings, extra: { keyword: q, engines, method: "Maps top 3 (60%) + organic position (40%), one search location" } };
}

// Reputation: your Google rating and review count against the businesses in the Map Pack (lib/scoring.js).
// you: { rating, reviews, source } when known (in the pack, or from a name search on unlock).
export function reputationSection(pack, you) {
  const others = (pack || []).filter(p => !p.you);
  if (!you || (you.rating == null && you.reviews == null)) {
    return { key: "reputation", label: "Reputation", available: false, score: null, findings: [],
      summary: "Your Google rating wasn't in the map results checked.", note: "Your Google rating and reviews weren't in the map results for this search, so we couldn't compare them yet." };
  }
  const score = reputationScore(you, others);
  const leader = others[0];
  const medReviews = others.map(o => o.reviews).filter(n => n != null).sort((a, b) => a - b)[Math.floor(others.length / 2)] ?? null;
  const f = [];
  if (you.rating != null) f.push(F(you.rating >= 4.5 ? "pass" : you.rating >= 4.0 ? "warn" : "fail", "Google rating",
    `${you.rating}★ on Google${leader?.rating != null ? `; the top map result (${leader.title}) has ${leader.rating}★` : ""}.`, "Ask every happy customer for a review right after the job, and reply to every review.", 2,
    { source: you.source, competitors: others.map(o => ({ name: o.title, rating: o.rating, reviews: o.reviews })) }));
  if (you.reviews != null) f.push(F(medReviews == null || you.reviews >= medReviews ? "pass" : you.reviews >= medReviews / 2 ? "warn" : "fail", "Number of Google reviews",
    `${you.reviews} reviews${medReviews != null ? `; the businesses in the map results have a median of ${medReviews}` : ""}.`, "Set up an automatic review request after every job so your count keeps growing.", 2));
  f.sort(byStatus);
  return { key: "reputation", label: "Reputation", available: true, score, findings: f,
    summary: `${you.rating ?? "–"}★ from ${you.reviews ?? "?"} Google reviews`, extra: { you, competitors: others, method: "Rating 50% + review count vs Map Pack median 50%" } };
}

// Teaser: Google only. If it can't run (no key, monthly ceiling), the section shows as locked.
async function rankingsAudit(input, host, env) {
  const { q, findings, checked } = await engineFindings(input, host, env, ["google"]);
  if (!findings.length) throw new Error("No ranking results");
  return rankingsSection(q, findings, checked);
}

// Reputation on unlock: if you weren't in the Map Pack, one name search finds your own rating and review count
async function refreshReputation(report, env) {
  const i = report.sections.findIndex(s => s.key === "reputation");
  if (i < 0 || report.sections[i].available) return;
  const pack = (report.sections.find(s => s.key === "rankings")?.extra?.engines || []).find(e => e.engine === "Google")?.pack || [];
  const you = await brandRating(report.input, env).catch(() => null);
  if (you && (you.rating != null || you.reviews != null)) { const s = reputationSection(pack, you); report.sections[i] = { ...s, grade: grade(s.score) }; }
}

// Google Business Profile (free score): primary category vs the Map Pack, and five profile basics. The Growth Audit
// reviews 14 profile details against the top 3 competitors by hand (comprehensive-audit.md 3.2); this is the first look.
const GBP_FREE = ["primary category", "rating", "review count", "hours", "website link"];
const GBP_AUDIT_TOTAL = 14;
const normCat = s => String(s || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
export function gbpSection(profile, pack, input, host) {
  const others = (pack || []).filter(p => !p.you && p.type);
  const nudge = `We checked ${GBP_FREE.length} of the ${GBP_AUDIT_TOTAL} profile details the Comprehensive Growth Audit reviews, which compares all of them with your top 3 competitors and gives you the fixes in order.`;
  if (!profile) return { key: "gbp", label: "Google Business Profile", available: false, score: null, findings: [], summary: "Checked when you unlock your full report.", note: "Your Google Business Profile check runs when you unlock your full report." };
  const ev = { source: "Google business profile panel (name search)", query: profile.query, checked_at: profile.checked_at, competitors: others.map(o => ({ name: o.title, category: o.type, mapsRank: o.rank })) };
  if (!profile.found) {
    const f = [F("fail", "Google Business Profile found", `A search for "${profile.query}" didn't show a Google Business Profile for your business.`, "Claim and verify your free Google Business Profile, or make sure its name and city match how customers search for you.", 3, ev)];
    return { key: "gbp", label: "Google Business Profile", available: true, score: 0, findings: f, summary: "No profile found in a name search", extra: { nudge, checked: GBP_FREE } };
  }
  const f = [];
  // Primary category: Whitespark 2026's #1 local pack factor
  const counts = {}; for (const o of others) { const c = normCat(o.type); counts[c] = (counts[c] || 0) + 1; }
  const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const mine = normCat(profile.type);
  const GENERIC = new Set(["rental", "rentals", "service", "services", "company", "companies", "repair", "repairs", "near", "local", "best", "shop", "store", "contractor", "contractors"]);
  const svcWords = normCat(input.service).split(" ").filter(w => w.length > 3 && !GENERIC.has(w));
  const fitsService = mine && svcWords.some(w => mine.includes(w.replace(/s$/, "")));
  const matchesLeaders = mine && common && (mine === common || mine.includes(common) || common.includes(mine));
  const leaderCats = [...new Set(others.map(o => o.type))].slice(0, 3);
  let catScore;
  if (!mine) { catScore = 0; f.push(F("fail", "Primary category", "Your profile's primary category isn't shown.", "Set a primary category that names your main service exactly, since Google relies on it more than anything else for map rankings.", 3, ev)); }
  else if (matchesLeaders || fitsService) { catScore = 100; f.push(F("pass", "Primary category", `Your primary category is "${profile.type}"${leaderCats.length ? `; the businesses in the map results use ${leaderCats.map(c => `"${c}"`).join(", ")}` : ""}.`, "", 3, ev)); }
  else { catScore = 40; f.push(F("warn", "Primary category", `Your primary category is "${profile.type}". The businesses in the map results for "${input.service}" use ${leaderCats.length ? leaderCats.map(c => `"${c}"`).join(", ") : "a different category"}.`, "Make your primary category match your main service. It's the strongest single signal for map rankings.", 3, ev)); }
  // Five basics customers and Google look for
  const basics = [["Category", !!profile.type], ["Hours", !!profile.hours], ["Phone", !!profile.phone], ["Website link", !!profile.website], ["Address or service area", !!profile.address]];
  const have = basics.filter(b => b[1]).length, missing = basics.filter(b => !b[1]).map(b => b[0].toLowerCase());
  f.push(F(have === 5 ? "pass" : have >= 3 ? "warn" : "fail", "Profile basics", `${have} of 5 basics found${missing.length ? `. Missing: ${missing.join(", ")}` : ""}.`, missing.length ? `Add your ${missing.join(", ")} so customers (and Google) have the facts they need to choose you.` : "", 2, ev));
  if (profile.website) {
    const linked = (() => { try { const h = bareHost(new URL(/^https?:/.test(profile.website) ? profile.website : "https://" + profile.website).hostname); return h === host || h.endsWith("." + host); } catch { return false; } })();
    f.push(F(linked ? "pass" : "warn", "Profile links to your website", linked ? "Your profile's website link points to your site." : `Your profile links to ${profile.website}, not ${host}.`, linked ? "" : "Point your profile's website link at your main site so the two reinforce each other.", 1, ev));
  }
  f.sort(byStatus);
  const score = Math.round(catScore * 0.5 + have / 5 * 100 * 0.5);
  return { key: "gbp", label: "Google Business Profile", available: true, score, findings: f,
    summary: `${profile.type || "No category"} · ${have} of 5 basics`, extra: { nudge, checked: GBP_FREE, method: "Primary category vs Map Pack (50%) + 5 profile basics (50%)" } };
}

async function refreshProfile(report, env) {
  const i = report.sections.findIndex(s => s.key === "gbp");
  if (i < 0 || report.sections[i].available) return;
  const pack = (report.sections.find(s => s.key === "rankings")?.extra?.engines || []).find(e => e.engine === "Google")?.pack || [];
  const profile = await brandRating(report.input, env).catch(() => null);
  if (profile) { const s = gbpSection(profile, pack, report.input, report.input.host); report.sections[i] = { ...s, grade: grade(s.score) }; }
}

// On unlock: add Bing (and Google, if the teaser couldn't run it). Runs once per report.
export async function completeRankings(report, env) {
  if (report.rankingsCompleted || !env.SERPAPI_KEY) return report;
  const idx = report.sections.findIndex(s => s.key === "rankings");
  const sec = report.sections[idx];
  const host = report.input.host, input = report.input;
  const have = sec?.available ? sec.extra.engines.filter(e => !e.error).map(e => e.engine) : [];
  const need = Object.keys(ENGINES).filter(e => !have.includes(ENGINES[e]));
  report.rankingsCompleted = true;
  if (!need.length) { await refreshReputation(report, env); await refreshProfile(report, env); report.overall = overallOf(report.sections); report.grade = grade(report.overall); return report; }
  const { q, findings, checked } = await engineFindings(input, host, env, need);
  if (!findings.length) return report;
  const engines = [...(sec?.available ? sec.extra.engines.filter(e => !e.error) : []), ...checked]; // DuckDuckGo isn't checked automatically, so the report no longer lists it (2026-11-09)
  const merged = rankingsSection(q, [...(sec?.available ? sec.findings : []), ...findings], engines);
  report.sections[idx] = { ...merged, grade: grade(merged.score) };
  await refreshReputation(report, env);
  await refreshProfile(report, env);
  report.overall = overallOf(report.sections);
  report.grade = grade(report.overall);
  return report;
}

/* ---------------- AI visibility (Gemini with Google Search, Workers AI) ---------------- */

export async function gemini(prompt, env) {
  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const r = await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
  }, 45000);
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const cand = d.candidates?.[0] || {};
  const text = (cand.content?.parts || []).map(p => p.text || "").join("").trim();
  const sources = (cand.groundingMetadata?.groundingChunks || []).map(c => c.web?.title || "").filter(Boolean);
  return { text, sources };
}

export async function workersAi(prompt, env) {
  const out = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages: [{ role: "user", content: prompt }], max_tokens: 500 });
  const text = typeof out?.response === "string" ? out.response : out?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Empty AI response");
  return text.trim();
}

const FACT_STOP = new Set(["about", "their", "there", "these", "those", "which", "where", "while", "would", "could", "should", "other", "every",
  "home", "welcome", "official", "website", "company", "business", "services", "service", "local", "best", "quality", "professional", "offer", "offers",
  "located", "location", "including", "provide", "provides", "providing", "based", "available", "contact", "today", "page"]);
const factWords = s => [...new Set(String(s || "").toLowerCase().replace(/&[a-z]+;/g, " ").split(/[^a-z0-9]+/).filter(w => w.length >= 5 && !FACT_STOP.has(w)))];

// Compares an AI answer about a business with the business's own homepage description. pass: names the business and
// matches at least two of its own facts; fail: says it can't find the business; otherwise review (shown, never scored).
export function describeVerdict(answer, input, host, page) {
  const low = String(answer || "").toLowerCase();
  if (NOT_FOUND.test(answer || "")) return { status: "fail", matched: [], factsFrom: "homepage" };
  const facts = factWords([page?.title, page?.metaDesc, ...(page?.h1 || [])].join(" "));
  const place = [input.city.split(",")[0], ...(input.city.split(",")[1] ? [input.city.split(",")[1]] : [])].map(x => x.trim().toLowerCase()).filter(x => x.length > 1);
  const matched = facts.filter(w => low.includes(w));
  const placeHit = place.filter(x => x.length > 2 && low.includes(x));
  const named = mentions(answer, input.business, host);
  const total = matched.length + placeHit.length;
  if (named && (matched.length >= 2 || (matched.length >= 1 && placeHit.length))) return { status: "pass", matched: [...matched, ...placeHit], factsFrom: "homepage title, description, and main heading" };
  return { status: total || named ? "review" : "review", matched: [...matched, ...placeHit], factsFrom: "homepage title, description, and main heading" };
}

async function aiAudit(input, host, seo, env) {
  const ask = `I'm looking for a ${input.service} in ${input.city}. Which local businesses would you recommend? List up to 8 business names with one short reason each.`;
  // Share of voice is measured across several customer questions, not one (Semrush/HubSpot method)
  const asks = [ask,
    `Who are the best-rated ${input.service} companies near ${input.city}? Name specific businesses.`,
    `I need to hire a ${input.service} in the ${input.city} area. Which businesses should I call first, and why?`];
  const about = `What is ${input.business} (${host})? What services do they offer, and where are they located? Answer in 3 sentences. If you can't find reliable information, say so.`;
  const noKey = () => Promise.reject(new Error("no key"));
  const [recRes, aboutRes, llamaRes, ...moreRes] = await Promise.allSettled([
    env.GEMINI_KEY ? gemini(asks[0], env) : noKey(),
    env.GEMINI_KEY ? gemini(about, env) : noKey(),
    env.AI ? workersAi(ask, env) : Promise.reject(new Error("no binding")),
    ...asks.slice(1).map(q => env.GEMINI_KEY ? gemini(q, env) : noKey())
  ]);
  const f = [], extra = { answers: {} };
  let tools = 0, mentioned = 0;
  const at = new Date().toISOString(), model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const gev = prompt => ({ provider: "Google Gemini", model, search: "Google Search grounding on", prompt, checked_at: at });
  // Kept in the stored report (never in the teaser) so failed checks can be diagnosed
  extra.errors = [["gemini", recRes], ["gemini-about", aboutRes], ["workers-ai", llamaRes]]
    .filter(([, r]) => r.status === "rejected").map(([k, r]) => `${k}: ${r.reason?.message || r.reason}`);

  // Share of voice across the recommendation questions (lib/scoring.js): named 60%, your site cited 25%, how early 15%
  const root = host.split(".")[0];
  const named = text => { const low = text.toLowerCase(), n = normName(input.business); const i = n.length > 2 ? low.indexOf(n) : -1; const j = root.length > 3 ? low.replace(/ /g, "").indexOf(root) : -1; return i >= 0 ? i : j; };
  const share = [];
  [[asks[0], recRes], ...asks.slice(1).map((q, k) => [q, moreRes[k]])].forEach(([q, res]) => {
    if (res?.status !== "fulfilled") return;
    const { text, sources } = res.value;
    const isNamed = mentions(text, input.business, host);
    share.push({ question: q, text: text.slice(0, 1200), mentioned: isNamed, cited: sources.some(s => s.toLowerCase().includes(root)), position: namedPosition(text, isNamed ? named : null), sources: sources.slice(0, 8) });
  });
  if (share.length) {
    tools++;
    const hits = share.filter(a => a.mentioned).length;
    if (hits) mentioned++;
    extra.answers.recommend = share[0].text;
    extra.share = share;
    extra.shareScore = aiShareScore(share);
    const ev = { ...gev(asks.slice(0, share.length).join(" | ")), questions: share.map(a => ({ question: a.question, named: a.mentioned, cited: a.cited })) };
    f.push(hits === share.length
      ? F("pass", "Named in Google's AI answers", `Google's Gemini (with live search) named your business in all ${share.length} customer questions we asked on ${at.slice(0, 10)}.`, "", 4, ev)
      : hits
        ? F("warn", "Named in Google's AI answers", `Google's Gemini (with live search) named your business in ${hits} of ${share.length} customer questions we asked on ${at.slice(0, 10)}. A sample of answers, not every customer's experience.`, "Earn reviews and mentions on sites AI tools trust, and publish clear service and location pages.", 4, ev)
        : F("fail", "Named in Google's AI answers", `Google's Gemini (with live search) didn't name your business in any of the ${share.length} customer questions we asked on ${at.slice(0, 10)}. A sample of answers, not every customer's experience.`, "Earn reviews and mentions on sites AI tools trust, and publish clear service and location pages.", 4, ev));
  }
  if (aboutRes.status === "fulfilled") {
    const t = aboutRes.value.text;
    extra.answers.about = t.slice(0, 900);
    // Judge the answer against the business's own description of itself (its homepage), not the words typed into the form.
    // 2026-11-09: the old check required the typed city ("Albany") or service word ("party"), so a correct answer about
    // marquee letter rentals in Schenectady and the Capital Region was wrongly called vague.
    const v = describeVerdict(t, input, host, seo?.page);
    const ev = { ...gev(about), matched_facts: v.matched, compared_with: v.factsFrom };
    f.push(v.status === "pass"
      ? F("pass", "AI describes your business accurately", `Asked about your business by name, Gemini's answer matches how your website describes you (${v.matched.slice(0, 4).join(", ")}).`, "", 2, ev)
      : v.status === "fail"
        ? F("fail", "AI describes your business accurately", "Asked about your business by name, Gemini couldn't find reliable information about you.", "Make your name, address, phone, and services consistent across your site, Google profile, and directories.", 2, ev)
        : F("review", "AI describes your business accurately", "Asked about your business by name, Gemini gave an answer we couldn't confirm against your website's own description. Read the answer above and tell us if anything is wrong. This doesn't count against your score.", "If the answer gets your services or location wrong, state them plainly on your homepage and Google profile.", 2, ev));
  }
  if (llamaRes.status === "fulfilled") {
    tools++;
    const hit = mentions(llamaRes.value, input.business, host);
    if (hit) mentioned++;
    // The answer itself isn't kept: without search, the model often invents business names.
    // Exploratory only (weight 0): a model without search not knowing you says nothing about search-assisted visibility.
    f.push(hit
      ? F("pass", "Known to AI models without search (not scored)", "An open-source AI model (Llama) named you from what it learned, without searching. Exploratory, not counted in your score.", "", 0)
      : F("warn", "Known to AI models without search (not scored)", "An open-source AI model (Llama) didn't name you from what it learned, without searching. This is exploratory and not counted in your score; it builds slowly as you're mentioned across the web.", "Get listed in industry directories, local news, and associations.", 0));
  }
  if (seo?.robots != null) {
    const blocked = blockedAgents(seo.robots, AI_BOTS);
    f.push(blocked.length
      ? F("fail", "AI search crawlers allowed", `Your robots.txt blocks: ${blocked.join(", ")}.`, "Allow AI search crawlers such as OAI-SearchBot and PerplexityBot so they can cite you.", 0)
      : F("pass", "AI search crawlers allowed", "Your robots.txt doesn't block ChatGPT, Perplexity, Claude, or Google AI crawlers. Permission alone doesn't mean they fetch, index, or recommend your pages.", "", 2));
  }
  if (seo?.page) {
    const faq = /(frequently asked|faq)/i.test(seo.page.text);
    f.push(faq
      ? F("pass", "Answers customer questions", "Your homepage includes FAQ content AI tools can quote.", "", 1)
      : F("warn", "Answers customer questions", "No FAQ content found on your homepage.", "Add answers to the questions customers ask on the phone: prices, timing, service area.", 1));
  }
  // Without at least one AI answer, a score from the readiness checks alone would overstate visibility
  if (!tools) return { ...unavailable("ai", "AI visibility", "Your AI visibility check, including what Google's AI and other assistants say about you, is included in your free consultation."), extra };
  f.sort(byStatus);
  // The score is share of voice in the AI answers; readiness checks (crawlers, FAQ) are shown but not scored
  const sh = extra.share || [];
  return { key: "ai", label: "AI visibility", available: true, score: extra.shareScore ?? null,
    summary: sh.length ? `Named in ${sh.filter(a => a.mentioned).length} of ${sh.length} AI answers checked` : "AI readiness checks", findings: f, extra: { ...extra, method: "Share of voice across 3 questions: named 60%, site cited 25%, how early 15%" } };
}

/* ---------------- Orchestration ---------------- */

// Equal average of the categories that were actually measured; a missing category never counts as zero
export const overallOf = sections => { const s = sections.filter(x => x.score != null); return s.length ? Math.round(s.reduce((a, x) => a + x.score, 0) / s.length) : null; };

// Your Google rating and review count from a name search (used on unlock when you weren't in the Map Pack)
async function brandRating(input, env) {
  const q = `${input.business} ${input.city}`.toLowerCase();
  const cacheKey = `kgcache2:${q.replace(/[^a-z0-9]+/g, "-")}`; // v2: whole profile panel, not just the rating
  const hit = await env.REPORTS?.get(cacheKey, "json");
  if (hit) return hit;
  if (env.REPORTS) {
    const monthKey = `serp:${new Date().toISOString().slice(0, 7)}`;
    const used = +(await env.REPORTS.get(monthKey)) || 0;
    if (used >= (+env.SERP_MONTHLY_LIMIT || 240)) return null;
    await env.REPORTS.put(monthKey, String(used + 1), { expirationTtl: 40 * 86400 });
  }
  const d = await serp("google", q, env.SERPAPI_KEY, await findLocation(input.city, env));
  const kg = d.knowledge_graph || {};
  const found = !!(kg.title && (kg.type || kg.address || kg.phone || kg.rating != null));
  const out = { found, rating: kg.rating ?? null, reviews: kg.review_count ?? kg.reviews ?? null, source: "Google business profile (name search)", title: kg.title || null,
    type: kg.type || null, hours: kg.hours ? true : !!kg.hours_info || null, phone: kg.phone || null, website: kg.website || kg.links?.website || null, address: kg.address || kg.service_area || null,
    checked_at: new Date().toISOString(), query: q };
  await env.REPORTS?.put(cacheKey, JSON.stringify(out), { expirationTtl: 7 * 86400 });
  return out;
}

export async function runAudit(input, env) {
  const host = bareHost(input.url.hostname);
  const id = crypto.randomUUID();
  const webP = env.PSI_KEY ? websiteAudit(input.url.href, env.PSI_KEY).catch(() => unavailable("website", "Website score")) : Promise.resolve(unavailable("website", "Website score"));
  const rankP = env.SERPAPI_KEY
    ? rankingsAudit(input, host, env).catch(() => unavailable("rankings", "Search rankings", LOCKED))
    : Promise.resolve(unavailable("rankings", "Search rankings", LOCKED));
  let seo = null;
  try { seo = await seoAudit(input.url, input); } catch { seo = null; }
  const aiP = aiAudit(input, host, seo, env).catch(() => unavailable("ai", "AI visibility"));
  const [web, rank, ai] = await Promise.all([webP, rankP, aiP]);
  const pack = rank.available ? (rank.extra?.engines || []).find(e => e.engine === "Google")?.pack : null;
  const mine = pack?.find(p => p.you);
  const rep = reputationSection(pack, mine ? { rating: mine.rating, reviews: mine.reviews, source: "Google Map Pack" } : null);
  const sections = [web, seo ? seo.section : unavailable("seo", "SEO audit", "We couldn't read your homepage. Check that the address is right, or ask us to review it by hand."), rank, rep, gbpSection(null), ai];
  const overall = overallOf(sections);
  return {
    id, createdAt: new Date().toISOString(), method: METHOD_VERSION,
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
      const issues = s.findings.filter(f => f.status === "fail" || f.status === "warn");
      const show = issues[0] || s.findings[0];
      return {
        key: s.key, label: s.label, score: s.score, grade: s.grade, available: s.available, note: s.note || null, summary: s.summary,
        preview: show ? { status: show.status, title: show.title, detail: show.detail } : null,
        issues: issues.length, checks: s.findings.length,
        counts: s.findings.reduce((c, f) => (c[f.status] = (c[f.status] || 0) + 1, c), { pass: 0, warn: 0, fail: 0, review: 0 })
      };
    })
  };
}

/* ---------------- Email ---------------- */

export function reportEmailHtml(r, intro) {
  const color = { pass: "#1B7F4C", warn: "#B87400", fail: "#C8432B", review: "#55645C" };
  const label = { pass: "Good", warn: "Needs work", fail: "Problem", review: "Needs review" };
  const toneOf = n => n == null ? "#8A968F" : n >= 80 ? "#1B7F4C" : n >= 50 ? "#D99A00" : "#C8432B";
  const bar = n => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="background:#E3E8E5;border-radius:6px;height:10px;line-height:10px;font-size:0"><div style="width:${n ?? 0}%;background:${toneOf(n)};height:10px;border-radius:6px"></div></td></tr></table>`;
  const summaryRows = r.sections.map(s => `<tr>
      <td style="padding:6px 12px 6px 0;font:600 14px Arial,sans-serif;color:#11201A;white-space:nowrap">${esc(s.label)}</td>
      <td style="padding:6px 0;width:100%">${bar(s.score)}</td>
      <td style="padding:6px 0 6px 12px;font:800 15px Arial,sans-serif;color:${toneOf(s.score)};text-align:right">${s.score ?? "–"}</td></tr>`).join("");
  const sections = r.sections.map(s => `
    <tr><td style="padding:26px 0 6px"><span style="font:800 18px Arial,sans-serif;color:#11201A">${esc(s.label)}</span>
      <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:999px;background:${toneOf(s.score)};color:#fff;font:700 12px Arial,sans-serif">${s.score ?? "–"}/100</span></td></tr>
    <tr><td style="font:14px/1.5 Arial,sans-serif;color:#55645C;padding-bottom:6px">${esc(s.summary || "")}</td></tr>
    ${s.findings.map(f => `<tr><td style="padding:5px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E3E8E5;border-left:5px solid ${color[f.status]};border-radius:8px"><tr><td style="padding:10px 12px;font:14px/1.45 Arial,sans-serif;color:#11201A">
      <b>${esc(f.title)}</b> <span style="color:${color[f.status]};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${label[f.status]}</span><br>${esc(f.detail)}
      ${f.fix && (f.status === "fail" || f.status === "warn") ? `<div style="margin-top:6px;padding:8px 10px;background:#EEF5F1;border-radius:6px;color:#11201A"><b style="color:#0B5D3F">How to fix:</b> ${esc(f.fix)}</div>` : ""}</td></tr></table></td></tr>`).join("")}`).join("");
  return `<div style="background:#F5F7F4;padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;border-collapse:collapse;background:#FFFFFF;border-radius:14px;overflow:hidden">
    <tr><td style="background:#075139;padding:18px 24px;font:900 16px Arial,sans-serif;color:#FFFFFF;letter-spacing:.04em">LOCAL RANK AUTHORITY</td></tr>
    <tr><td style="padding:24px 24px 4px;font:15px/1.5 Arial,sans-serif;color:#11201A">${intro}</td></tr>
    <tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
      <td style="width:120px;padding-right:18px;vertical-align:middle"><div style="width:110px;height:110px;border-radius:55px;border:10px solid ${toneOf(r.overall)};text-align:center;box-sizing:border-box">
        <div style="font:900 34px/1 Arial,sans-serif;color:#11201A;padding-top:24px">${r.overall ?? "–"}</div><div style="font:600 11px Arial,sans-serif;color:#55645C">OUT OF 100</div></div></td>
      <td style="vertical-align:middle"><div style="font:900 22px Arial,sans-serif;color:#11201A">${esc(r.input.business)}</div>
        <div style="font:14px Arial,sans-serif;color:#55645C;margin-top:4px">${esc(r.input.host)} · ${esc(r.input.service)} in ${esc(r.input.city)}</div></td>
    </tr></table></td></tr>
    <tr><td style="padding:4px 24px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${summaryRows}</table></td></tr>
    <tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${sections}</table></td></tr>
    <tr><td style="padding:28px 24px;text-align:center">
      <div style="font:800 18px Arial,sans-serif;color:#11201A;margin-bottom:12px">Want these fixed for you?</div>
      <a href="https://localrankauthority.com/#contact" style="display:inline-block;background:#FFBE00;color:#2A1E00;font:800 16px Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:8px">Book my free strategy call</a>
      <div style="font:13px Arial,sans-serif;color:#55645C;margin-top:12px">Or just reply to this email.</div></td></tr>
  </table></div>`;
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
