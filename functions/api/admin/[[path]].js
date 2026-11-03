// /api/admin/*: the owner dashboard. Only the OWNER_EMAIL address can sign in (one-time email link, like the
// client portal, but with its own cookie and signing key). Writes: the sales pipeline, and "view as client".
import { json, sendEmail } from "../../../lib/audit.js";
import { saveCrm } from "../../../lib/crm.js";
import { clearSessionCookie, getClient, makeSessionCookie, normEmail, randomToken, sessionEmail, validEmail } from "../../../lib/portal.js";

const SITE = "https://localrankauthority.com";
const SENT = "If that's the owner's email, a sign-in link is on its way.";

const owners = env => String(env.OWNER_EMAIL || "").split(",").map(normEmail).filter(Boolean);
const isOwner = (env, email) => !!email && owners(env).includes(normEmail(email));

async function login(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = normEmail(b.email);
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `rl-admin:${request.headers.get("cf-connecting-ip") || "unknown"}:${day}`;
  const tries = +(await env.REPORTS.get(ipKey)) || 0;
  if (tries >= 10) return json({ error: "Too many sign-in requests today." }, 429);
  await env.REPORTS.put(ipKey, String(tries + 1), { expirationTtl: 86400 });
  if (isOwner(env, email)) {
    const token = randomToken();
    await env.REPORTS.put(`amagic:${token}`, email, { expirationTtl: 1200 });
    await sendEmail(env, {
      to: email, subject: "Your Local Rank Authority dashboard sign-in link",
      html: `<p><a href="${SITE}/api/admin/verify?t=${token}" style="display:inline-block;background:#FFBE00;color:#2A1E00;padding:12px 20px;border-radius:6px;font-weight:700;text-decoration:none">Open the owner dashboard</a></p>
        <p style="color:#55645C;font-size:13px">This link works once and expires in 20 minutes. If you didn't ask for it, ignore this email.</p>`
    });
  }
  return json({ ok: true, message: SENT });
}

async function verify(url, env) {
  const t = url.searchParams.get("t") || "";
  const email = /^[a-f0-9]{64}$/.test(t) ? await env.REPORTS.get(`amagic:${t}`) : null;
  if (!email || !isOwner(env, email)) return Response.redirect(`${url.origin}/admin/?e=expired`, 302);
  await env.REPORTS.delete(`amagic:${t}`);
  return new Response(null, { status: 302, headers: { location: "/admin/", "set-cookie": await makeSessionCookie(env, email, 7, "admin") } });
}

// Every key under a prefix, newest last (KV lists in key order, and these keys end in ISO dates)
async function listAll(env, prefix, max = 2000) {
  const keys = [];
  let cursor;
  do {
    const r = await env.REPORTS.list({ prefix, cursor });
    keys.push(...r.keys.map(k => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor && keys.length < max);
  return keys;
}

const getAll = (env, keys) => Promise.all(keys.map(k => env.REPORTS.get(k, "json"))).then(v => v.filter(Boolean));

async function data(env) {
  const [leadKeys, intakeKeys, contactKeys, clientKeys, couponKeys, msgKeys, useKeys, reportKeys, crmKeys] = await Promise.all(
    ["lead:", "intake:", "contact:", "client:", "coupon:", "msg:", "coupon-use:", "report:", "crm:"].map(p => listAll(env, p)));
  const [leads, intakes, contacts, clientRecs, coupons, messages, crm] = await Promise.all([
    getAll(env, leadKeys.slice(-400)), getAll(env, intakeKeys.slice(-400)), getAll(env, contactKeys.slice(-400)),
    getAll(env, clientKeys), getAll(env, couponKeys), getAll(env, msgKeys.slice(-400)), getAll(env, crmKeys)
  ]);

  const clients = await Promise.all(clientRecs.map(async c => {
    const audits = await Promise.all((c.audits || []).map(async id => {
      const [a, progress, next, scans] = await Promise.all(
        ["paudit", "progress", "nextstep", "scans"].map(p => env.REPORTS.get(`${p}:${id}`, "json")));
      if (!a) return null;
      const plan = a.data?.action_plan || [];
      return {
        id, business: a.business, website: a.data?.business?.website || "", city: a.data?.business?.city || "",
        date: a.data?.date || a.published, published: a.published, updated: a.updated,
        overall: a.data?.overall?.score ?? null, grade: a.data?.overall?.grade || "", has_pdf: !!a.has_pdf,
        plan_total: plan.length, plan_done: plan.filter(x => progress?.[x.id]).length,
        next_step: next ? next.title : null, last_scan: scans?.length ? scans[scans.length - 1] : null
      };
    }));
    return { email: c.email, name: c.name, business: c.business, last_seen: c.last_seen || null, created: c.created || null, audits: audits.filter(Boolean) };
  }));

  // coupon-use:<CODE>:site:<host> / coupon-use:<CODE>:email:<email>
  const uses = useKeys.map(k => k.split(":")).map(([, code, kind, ...rest]) => ({ code, kind, value: rest.join(":") }));
  // "New" means since the previous visit; reloads within 2 hours count as the same visit
  const seen = (await env.REPORTS.get("admin:seen", "json")) || {};
  const now = new Date().toISOString();
  if (!seen.current || Date.now() - Date.parse(seen.current) > 2 * 3600000) seen.prev = seen.current || null;
  seen.current = now;
  await env.REPORTS.put("admin:seen", JSON.stringify(seen));
  const seenBefore = seen.prev;

  return json({
    seen_before: seenBefore,
    free_scores_30d: reportKeys.length,
    leads: leads.map(({ ip, ...l }) => l),
    intakes, contacts, clients, coupons, uses, messages, crm
  });
}

// The stored free report behind a lead (kept 30 days)
async function report(url, env) {
  const id = String(url.searchParams.get("id") || "").slice(0, 80);
  const r = id ? await env.REPORTS.get(`report:${id}`, "json") : null;
  if (!r) return json({ error: "This free report has expired (they're kept 30 days)." }, 404);
  return json({ id: r.id, input: r.input, overall: r.overall, sections: (r.sections || []).map(s => ({ label: s.label, score: s.score, summary: s.summary })) });
}

// Sales pipeline (lib/crm.js)
async function crmSave(request, env) {
  const b = await request.json().catch(() => ({}));
  const r = await saveCrm(env, { key: b.key, patch: b.patch || {}, note: b.note, manual: !!b.manual, by: "you" });
  return r.error ? json({ error: r.error }, 400) : json({ ok: true, record: r.record });
}

async function crmDelete(request, env) {
  const b = await request.json().catch(() => ({}));
  const key = String(b.key || "").trim().toLowerCase().slice(0, 200);
  if (key) await env.REPORTS.delete(`crm:${key}`);
  return json({ ok: true });
}

// Sign this browser in to a client's portal for an hour, without emailing them or updating their last visit
async function viewAs(request, env) {
  const b = await request.json().catch(() => ({}));
  const client = await getClient(env, b.email);
  if (!client) return json({ error: "No portal for that email." }, 404);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": await makeSessionCookie(env, client.email, 1 / 24) }
  });
}

export async function onRequest({ request, env, params }) {
  if (!env.REPORTS || !env.AGENT_TOKEN || !env.OWNER_EMAIL) return json({ error: "The dashboard isn't set up yet." }, 503);
  const url = new URL(request.url);
  const route = (params.path || []).join("/");
  const method = request.method;
  try {
    if (route === "login" && method === "POST") return await login(request, env);
    if (route === "verify" && method === "GET") return await verify(url, env);
    if (route === "logout" && method === "POST") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": clearSessionCookie("admin") } });
    const email = await sessionEmail(request, env, "admin");
    if (!isOwner(env, email)) return json({ error: "Please sign in." }, 401);
    // Changes only from the dashboard itself
    if (method === "POST" && request.headers.get("origin") && request.headers.get("origin") !== url.origin) return json({ error: "Forbidden" }, 403);
    if (route === "data" && method === "GET") return await data(env);
    if (route === "report" && method === "GET") return await report(url, env);
    if (route === "view-as" && method === "POST") return await viewAs(request, env);
    if (route === "crm" && method === "POST") return await crmSave(request, env);
    if (route === "crm-delete" && method === "POST") return await crmDelete(request, env);
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
