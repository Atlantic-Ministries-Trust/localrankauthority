// /api/portal/*: the client portal's sign-in and data. Clients sign in with a one-time email link; everything else
// needs the signed session cookie and only returns that client's own audits.
import { esc, json, sendEmail } from "../../../lib/audit.js";
import { clearSessionCookie, emailSignInLink, getClient, makeSessionCookie, normEmail, rescanIfDue, sessionEmail, validEmail } from "../../../lib/portal.js";

const SENT = "If that email has an audit with us, a sign-in link is on its way. Check your inbox (and spam) in a minute.";

async function login(request, env) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Enter your email." }, 400); }
  const email = normEmail(b.email);
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `rl-login:${request.headers.get("cf-connecting-ip") || "unknown"}:${day}`;
  const tries = +(await env.REPORTS.get(ipKey)) || 0;
  if (tries >= 10) return json({ error: "Too many sign-in requests today. Call (518) 460-1010 and we'll help." }, 429);
  await env.REPORTS.put(ipKey, String(tries + 1), { expirationTtl: 86400 });
  const client = await getClient(env, email);
  // Same answer whether or not the email has an account, so the form can't be used to discover clients
  if (client) await emailSignInLink(env, client);
  return json({ ok: true, message: SENT });
}

async function verify(url, env) {
  const t = url.searchParams.get("t") || "";
  const email = /^[a-f0-9]{64}$/.test(t) ? await env.REPORTS.get(`magic:${t}`) : null;
  if (!email) return Response.redirect(`${url.origin}/portal/?e=expired`, 302);
  await env.REPORTS.delete(`magic:${t}`);
  const client = await getClient(env, email);
  if (client) await env.REPORTS.put(`client:${email}`, JSON.stringify({ ...client, last_seen: new Date().toISOString() }));
  return new Response(null, { status: 302, headers: { location: "/portal/", "set-cookie": await makeSessionCookie(env, email) } });
}

async function ownedAudit(env, email, id) {
  const audit = id ? await env.REPORTS.get(`paudit:${id}`, "json") : null;
  return audit && audit.email === email ? audit : null;
}

async function me(email, env) {
  const client = await getClient(env, email);
  if (!client) return json({ error: "No account" }, 404);
  const audits = (await Promise.all((client.audits || []).map(id => env.REPORTS.get(`paudit:${id}`, "json")))).filter(Boolean)
    .map(a => ({ id: a.id, business: a.business, date: a.data?.date || a.published, overall: a.data?.overall?.score ?? null }));
  return json({ name: client.name, business: client.business, email, audits });
}

async function audit(url, email, env, waitUntil) {
  const a = await ownedAudit(env, email, url.searchParams.get("id"));
  if (!a) return json({ error: "Audit not found" }, 404);
  const [progress, nextStep, scans] = await Promise.all([
    env.REPORTS.get(`progress:${a.id}`, "json"), env.REPORTS.get(`nextstep:${a.id}`, "json"), env.REPORTS.get(`scans:${a.id}`, "json")
  ]);
  if (env.SERPAPI_KEY || env.PSI_KEY) waitUntil(rescanIfDue(env, a).catch(() => {}));
  return json({ id: a.id, data: a.data, has_pdf: !!a.has_pdf, progress: progress || {}, next_step: nextStep, scans: scans || [] });
}

async function check(request, email, env) {
  const b = await request.json().catch(() => ({}));
  const a = await ownedAudit(env, email, b.id);
  if (!a) return json({ error: "Audit not found" }, 404);
  const item = String(b.item || "").slice(0, 40);
  if (!(a.data?.action_plan || []).some(x => x.id === item)) return json({ error: "Unknown item" }, 400);
  const progress = (await env.REPORTS.get(`progress:${a.id}`, "json")) || {};
  if (b.done) progress[item] = new Date().toISOString(); else delete progress[item];
  await env.REPORTS.put(`progress:${a.id}`, JSON.stringify(progress));
  return json({ ok: true, progress });
}

async function message(request, email, env) {
  const b = await request.json().catch(() => ({}));
  const text = String(b.text || "").trim().slice(0, 3000);
  if (!text) return json({ error: "Write your message first." }, 400);
  const client = await getClient(env, email);
  const at = new Date().toISOString();
  await env.REPORTS.put(`msg:${email}:${at}`, JSON.stringify({ email, business: client?.business, text, at }));
  if (env.OWNER_EMAIL) await sendEmail(env, {
    to: env.OWNER_EMAIL, replyTo: email,
    subject: `Portal message: ${client?.business || email}`,
    html: `<p><b>${esc(client?.name || "")}</b> (${esc(email)}) · ${esc(client?.business || "")}</p><p>${esc(text).replace(/\n/g, "<br>")}</p><p style="color:#55645C">Reply to this email to answer them directly.</p>`
  });
  return json({ ok: true });
}

async function pdf(url, email, env) {
  const a = await ownedAudit(env, email, url.searchParams.get("id"));
  const b64 = a?.has_pdf ? await env.REPORTS.get(`ppdf:${a.id}`) : null;
  if (!b64) return json({ error: "No PDF for this audit" }, 404);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const name = `${(a.business || "audit").replace(/[^a-z0-9]+/gi, "-")}-local-visibility-audit.pdf`;
  return new Response(bytes, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}"`, "cache-control": "private, no-store" } });
}

export async function onRequest({ request, env, params, waitUntil }) {
  if (!env.REPORTS || !env.AGENT_TOKEN) return json({ error: "The client portal isn't set up yet." }, 503);
  const url = new URL(request.url);
  const route = (params.path || []).join("/");
  const method = request.method;
  try {
    if (route === "login" && method === "POST") return await login(request, env);
    if (route === "verify" && method === "GET") return await verify(url, env);
    if (route === "logout" && method === "POST") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() } });
    const email = await sessionEmail(request, env);
    if (!email) return json({ error: "Please sign in." }, 401);
    if (route === "me" && method === "GET") return await me(email, env);
    if (route === "audit" && method === "GET") return await audit(url, email, env, waitUntil);
    if (route === "check" && method === "POST") return await check(request, email, env);
    if (route === "message" && method === "POST") return await message(request, email, env);
    if (route === "pdf" && method === "GET") return await pdf(url, email, env);
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
