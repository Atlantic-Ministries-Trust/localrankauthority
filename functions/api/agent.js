// POST /api/agent: private toolbox for the Local Growth Audit agent. Reuses this site's PageSpeed, SerpApi, and Gemini
// accounts so in-depth audits don't need their own keys. Requires "Authorization: Bearer <token>"; disabled when AGENT_TOKEN isn't set.
// AGENT_TOKEN can use every tool. AGENT_TOKEN_RESEARCH (for cloud sessions that read untrusted websites) can only research:
// it can't publish to portals, send invites, change the offer, or create discount codes.
import { bareHost, completeRankings, findLocation, gemini, json, mentions, normalizeUrl, runAudit, serp, timedFetch, workersAi } from "../../lib/audit.js";
import { DEFAULT_OFFER, couponProblem, mergeOffer, newCoupon, normCode, offerView, quote, readCoupon, readOffer } from "../../lib/offer.js";
import { createSignInLink, emailSignInLink, getClient, normEmail, validEmail } from "../../lib/portal.js";

const clean = (v, n = 200) => String(v || "").trim().slice(0, n);
const monthKey = () => `serp:${new Date().toISOString().slice(0, 7)}`;

const RESEARCH_TOOLS = new Set(["audit", "search", "pagespeed", "ask", "usage"]);

// "full", "research", or null
async function tokenRole(request, env) {
  const got = new TextEncoder().encode((request.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  const same = secret => {
    if (!secret) return false;
    const want = new TextEncoder().encode(secret);
    return got.byteLength === want.byteLength && crypto.subtle.timingSafeEqual(got, want);
  };
  return same(env.AGENT_TOKEN) ? "full" : same(env.AGENT_TOKEN_RESEARCH) ? "research" : null;
}

// Full audit, same scoring as the public form, with Bing included. No lead, no email, no visitor limit.
async function audit(b, env) {
  const url = normalizeUrl(b.url);
  const input = { business: clean(b.business, 120), service: clean(b.service, 120), city: clean(b.city, 120) };
  if (!url || !input.business || !input.service || !input.city) return json({ error: "Send url, business, service, and city." }, 400);
  const report = await completeRankings(await runAudit({ url, ...input }, env), env).catch(e => ({ error: e.message }));
  return json(report);
}

// One search with richer map-pack detail than the public audit keeps. Shares the site's monthly SerpApi ceiling and caches for 7 days.
async function search(b, env) {
  if (!env.SERPAPI_KEY) return json({ error: "SERPAPI_KEY isn't set." }, 503);
  const engine = b.engine === "bing" ? "bing" : "google";
  const q = clean(b.q, 150).toLowerCase();
  if (!q) return json({ error: "Send q, the search to run." }, 400);
  const city = clean(b.city, 120);
  const cacheKey = `agentserp:${engine}:${(q + " " + city).replace(/[^a-z0-9]+/g, "-")}`;
  const hit = await env.REPORTS?.get(cacheKey, "json");
  if (hit) return json({ ...hit, cached: true });
  if (env.REPORTS) {
    const used = +(await env.REPORTS.get(monthKey())) || 0;
    if (used >= (+env.SERP_MONTHLY_LIMIT || 240)) return json({ error: "Monthly search limit reached", used }, 429);
    await env.REPORTS.put(monthKey(), String(used + 1), { expirationTtl: 40 * 86400 });
  }
  const loc = engine === "google" && city ? await findLocation(city, env) : null;
  const d = await serp(engine, q, env.SERPAPI_KEY, loc);
  const places = d.local_results?.places || (Array.isArray(d.local_results) ? d.local_results : []);
  const out = {
    engine, q, location: loc?.canonical || null,
    organic: (d.organic_results || []).slice(0, 10).map(o => ({ position: o.position, title: o.title, link: o.link, domain: (() => { try { return bareHost(new URL(o.link).hostname); } catch { return ""; } })(), snippet: (o.snippet || "").slice(0, 200) })),
    places: places.slice(0, 10).map((p, i) => ({ position: p.position || i + 1, title: p.title, rating: p.rating ?? null, reviews: p.reviews ?? null, type: p.type || "", address: p.address || "", website: p.website || p.links?.website || "" })),
    ai_overview: !!d.ai_overview
  };
  await env.REPORTS?.put(cacheKey, JSON.stringify(out), { expirationTtl: 7 * 86400 });
  return json(out);
}

// PageSpeed for any page, mobile or desktop, with scores, Core Web Vitals, and the biggest fixes.
async function pagespeed(b, env) {
  if (!env.PSI_KEY) return json({ error: "PSI_KEY isn't set." }, 503);
  const url = normalizeUrl(b.url);
  if (!url) return json({ error: "Send url." }, 400);
  const u = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  u.searchParams.set("url", url.href);
  u.searchParams.set("strategy", b.strategy === "desktop" ? "desktop" : "mobile");
  u.searchParams.set("key", env.PSI_KEY);
  for (const c of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) u.searchParams.append("category", c);
  u.searchParams.set("fields", "loadingExperience,lighthouseResult/categories,lighthouseResult/audits");
  const r = await timedFetch(u, {}, 90000);
  if (!r.ok) return json({ error: `PageSpeed ${r.status}`, detail: (await r.text()).slice(0, 300) }, 502);
  const d = JSON.parse((await r.text()).replace(/"data:image\/[^"]*"/g, '""'));
  const lh = d.lighthouseResult || {}, audits = lh.audits || {};
  const field = d.loadingExperience?.metrics;
  return json({
    url: url.href, strategy: u.searchParams.get("strategy"),
    scores: Object.fromEntries(Object.entries(lh.categories || {}).map(([k, v]) => [k, v.score == null ? null : Math.round(v.score * 100)])),
    lab: Object.fromEntries(["largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time", "first-contentful-paint", "speed-index"].map(k => [k, audits[k]?.displayValue || null])),
    field: field ? Object.fromEntries(Object.entries(field).map(([k, v]) => [k, { p75: v.percentile, rating: v.category }])) : null,
    opportunities: Object.values(audits).filter(a => a.details?.type === "opportunity" && (a.score ?? 1) < 0.9 && a.details.overallSavingsMs > 0)
      .sort((x, y) => y.details.overallSavingsMs - x.details.overallSavingsMs).slice(0, 6)
      .map(a => ({ fix: a.title, savings: `${(a.details.overallSavingsMs / 1000).toFixed(1)}s` })),
    failed_seo: (lh.categories?.seo?.auditRefs || []).filter(x => audits[x.id]?.score === 0).map(x => audits[x.id].title)
  });
}

// Ask Gemini (with live Google Search) a customer-style question, and optionally check whether a business is named.
async function ask(b, env) {
  const question = clean(b.question, 500);
  if (!question) return json({ error: "Send question." }, 400);
  const out = { question };
  const [g, l] = await Promise.allSettled([
    env.GEMINI_KEY ? gemini(question, env) : Promise.reject(new Error("GEMINI_KEY isn't set")),
    b.llama && env.AI ? workersAi(question, env) : Promise.reject(new Error("skipped"))
  ]);
  if (g.status === "fulfilled") out.gemini = { answer: g.value.text.slice(0, 3000), sources: g.value.sources.slice(0, 10) };
  else out.gemini = { error: g.reason?.message || String(g.reason) };
  if (l.status === "fulfilled") out.llama = { answer: l.value.slice(0, 2000) };
  if (b.business) {
    const host = b.host ? bareHost(clean(b.host)) : "";
    out.mentioned = { gemini: !!out.gemini.answer && mentions(out.gemini.answer, clean(b.business), host), ...(out.llama ? { llama: mentions(out.llama.answer, clean(b.business), host) } : {}) };
  }
  return json(out);
}

// Read or change the Comprehensive Audit offer shown on /comprehensive-audit. Send mode, price (list price), or stripe_link to change it.
async function offer(b, env) {
  if (!env.REPORTS) return json({ error: "Storage (REPORTS) isn't set up." }, 503);
  const current = (await readOffer(env)) || DEFAULT_OFFER;
  const changes = ["mode", "price", "stripe_link"].filter(k => b[k] !== undefined);
  if (!changes.length) return json({ offer: current, shows: offerView(current) });
  const next = mergeOffer(current, b);
  if (next.error) return json(next, 400);
  await env.REPORTS.put("offer", JSON.stringify({ ...next, updatedAt: new Date().toISOString() }));
  return json({ offer: next, previous: current, shows: offerView(next) });
}

// Discount codes for the Comprehensive Audit: action create | list | disable. The list price on the page never changes.
async function coupon(b, env) {
  if (!env.REPORTS) return json({ error: "Storage (REPORTS) isn't set up." }, 503);
  const offer = (await readOffer(env)) || DEFAULT_OFFER;
  if (b.action === "create") {
    let c = newCoupon(b);
    if (c.error) return json(c, 400);
    // Generated codes retry on the (rare) collision; named codes need replace: true to overwrite
    for (let i = 0; !b.code && i < 5 && await readCoupon(env, c.code); i++) c = newCoupon(b);
    if (await readCoupon(env, c.code) && !b.replace) return json({ error: `${c.code} already exists. Disable it first, or send replace: true.` }, 409);
    await env.REPORTS.put(`coupon:${c.code}`, JSON.stringify(c));
    return json({ created: c, preview: quote(offer, c), share_link: `https://localrankauthority.com/audit-intake?code=${c.code}` });
  }
  if (b.action === "disable") {
    const c = await readCoupon(env, b.code);
    if (!c) return json({ error: `No code ${normCode(b.code)}.` }, 404);
    await env.REPORTS.put(`coupon:${c.code}`, JSON.stringify({ ...c, active: false, disabled: new Date().toISOString() }));
    return json({ disabled: c.code, used: c.used || 0 });
  }
  if (b.action === "list") {
    const keys = (await env.REPORTS.list({ prefix: "coupon:" })).keys;
    const all = (await Promise.all(keys.map(k => env.REPORTS.get(k.name, "json")))).filter(Boolean);
    return json({ list_price: offer.price, coupons: all.map(c => ({ ...c, status: couponProblem(c) || "usable", preview: quote(offer, c).label })) });
  }
  return json({ error: "action must be create, list, or disable." }, 400);
}

// Client portal management. Publishing, next steps, and invites happen only when Michael asks.
//   publish:   { email, name, business, audit_id?, data (portal.json), pdf_base64? } → creates/updates the client and audit
//   next_step: { audit_id, title, body, cta_label, cta_href, price_label? } or { audit_id, clear: true }
//   invite:    { email } → emails the client a welcome sign-in link
//   preview:   { email } → a one-time sign-in link to view the portal as that client (not emailed)
//   list:      clients with audits, checklist progress, last visit, and recent messages
//   delete:    { email } → removes the client, their audits, and portal data
async function portal(b, env) {
  if (!env.REPORTS) return json({ error: "Storage (REPORTS) isn't set up." }, 503);
  const email = normEmail(b.email);
  if (b.action === "publish") {
    if (!validEmail(email)) return json({ error: "Send the client's email." }, 400);
    const data = typeof b.data === "string" ? JSON.parse(b.data) : b.data;
    if (!data || typeof data !== "object" || !data.business?.name) return json({ error: "Send data: the portal.json object (business.name is required)." }, 400);
    const id = String(b.audit_id || crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    const existing = await env.REPORTS.get(`paudit:${id}`, "json");
    if (existing && existing.email !== email) return json({ error: "That audit_id belongs to a different client." }, 409);
    const client = (await getClient(env, email)) || { email, created: new Date().toISOString(), audits: [] };
    client.name = String(b.name || client.name || "").slice(0, 120);
    client.business = String(b.business || data.business.name).slice(0, 160);
    if (!client.audits.includes(id)) client.audits.push(id);
    const hasPdf = !!b.pdf_base64 || !!existing?.has_pdf;
    if (b.pdf_base64) await env.REPORTS.put(`ppdf:${id}`, String(b.pdf_base64).replace(/\s+/g, ""));
    await Promise.all([
      env.REPORTS.put(`paudit:${id}`, JSON.stringify({ id, email, business: client.business, data, has_pdf: hasPdf, published: existing?.published || new Date().toISOString(), updated: new Date().toISOString() })),
      env.REPORTS.put(`client:${email}`, JSON.stringify(client))
    ]);
    return json({ published: id, client: email, has_pdf: hasPdf, portal: "https://localrankauthority.com/portal/" });
  }
  if (b.action === "next_step") {
    const a = b.audit_id ? await env.REPORTS.get(`paudit:${b.audit_id}`, "json") : null;
    if (!a) return json({ error: "Unknown audit_id." }, 404);
    if (b.clear) { await env.REPORTS.delete(`nextstep:${a.id}`); return json({ cleared: a.id }); }
    const step = { title: String(b.title || "").slice(0, 120), body: String(b.body || "").slice(0, 600), cta_label: String(b.cta_label || "Book a call with Michael").slice(0, 60),
      cta_href: String(b.cta_href || "/#contact").slice(0, 300), price_label: b.price_label ? String(b.price_label).slice(0, 60) : null, approved_at: new Date().toISOString() };
    if (!step.title || !step.body) return json({ error: "Send title and body." }, 400);
    await env.REPORTS.put(`nextstep:${a.id}`, JSON.stringify(step));
    return json({ next_step: step, audit: a.id });
  }
  if (b.action === "invite" || b.action === "preview") {
    const client = await getClient(env, email);
    if (!client) return json({ error: "No portal client with that email. Publish an audit first." }, 404);
    if (b.action === "preview") return json({ link: await createSignInLink(env, email), note: "One-time link, valid 20 minutes. Opening it signs that browser in as the client." });
    const sent = await emailSignInLink(env, client, { welcome: true });
    return json({ invited: email, emailed: sent });
  }
  if (b.action === "list") {
    const keys = (await env.REPORTS.list({ prefix: "client:" })).keys;
    const clients = (await Promise.all(keys.map(k => env.REPORTS.get(k.name, "json")))).filter(Boolean);
    const out = await Promise.all(clients.map(async c => ({
      email: c.email, name: c.name, business: c.business, last_seen: c.last_seen || null,
      audits: await Promise.all((c.audits || []).map(async id => {
        const [a, p, n, s] = await Promise.all([env.REPORTS.get(`paudit:${id}`, "json"), env.REPORTS.get(`progress:${id}`, "json"), env.REPORTS.get(`nextstep:${id}`, "json"), env.REPORTS.get(`scans:${id}`, "json")]);
        return { id, date: a?.data?.date, overall: a?.data?.overall?.score, checklist_done: Object.keys(p || {}).length, checklist_total: (a?.data?.action_plan || []).length, next_step: n?.title || null, scans: (s || []).map(x => ({ date: x.date.slice(0, 10), overall: x.overall })) };
      })),
      messages: (await Promise.all((await env.REPORTS.list({ prefix: `msg:${c.email}:` })).keys.slice(-5).map(k => env.REPORTS.get(k.name, "json")))).filter(Boolean)
    })));
    return json({ clients: out });
  }
  if (b.action === "delete") {
    const client = await getClient(env, email);
    if (!client) return json({ error: "No portal client with that email." }, 404);
    const msgs = (await env.REPORTS.list({ prefix: `msg:${email}:` })).keys.map(k => k.name);
    const keys = [`client:${email}`, ...msgs, ...(client.audits || []).flatMap(id => [`paudit:${id}`, `ppdf:${id}`, `progress:${id}`, `nextstep:${id}`, `scans:${id}`, `scanlock:${id}`])];
    await Promise.all(keys.map(k => env.REPORTS.delete(k)));
    return json({ deleted: email, keys: keys.length });
  }
  return json({ error: "action must be publish, next_step, invite, preview, list, or delete." }, 400);
}

async function usage(env) {
  return json({ serp_used_this_month: +(await env.REPORTS?.get(monthKey())) || 0, serp_monthly_limit: +env.SERP_MONTHLY_LIMIT || 240,
    tools: { pagespeed: !!env.PSI_KEY, search: !!env.SERPAPI_KEY, gemini: !!env.GEMINI_KEY, workers_ai: !!env.AI } });
}

const TOOLS = { audit, search, pagespeed, ask, offer, coupon, portal };

export async function onRequestPost({ request, env }) {
  if (!env.AGENT_TOKEN) return json({ error: "Agent access isn't enabled." }, 503);
  const role = await tokenRole(request, env);
  if (!role) return json({ error: "Unauthorized" }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Send a JSON body." }, 400); }
  if (role === "research" && !RESEARCH_TOOLS.has(b.tool)) {
    return json({ error: `This is a research-only token: "${b.tool}" needs the full token on Michael's Mac.`, research_only: true }, 403);
  }
  try {
    if (b.tool === "usage") return await usage(env);
    const fn = TOOLS[b.tool];
    if (!fn) return json({ error: `Unknown tool. Use one of: ${[...Object.keys(TOOLS), "usage"].join(", ")}.` }, 400);
    return await fn(b, env);
  } catch (e) {
    return json({ error: e.message || "Tool failed" }, 502);
  }
}
