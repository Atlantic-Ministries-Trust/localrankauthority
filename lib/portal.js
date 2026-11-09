// Client portal: email sign-in links, signed session cookies, and the KV records behind /portal.
// KV keys: client:<email> · paudit:<id> · ppdf:<id> · progress:<id> · nextstep:<id> · scans:<id> · magic:<token> · msg:<email>:<at>
import { esc, runAudit, sendEmail } from "./audit.js";

const enc = new TextEncoder();
// Client portal and owner dashboard sessions use separate cookies and separate signing keys
const COOKIES = { portal: "lra_portal", admin: "lra_admin" };
const SITE = "https://localrankauthority.com";
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

export const normEmail = e => String(e || "").trim().toLowerCase().slice(0, 200);
export const validEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
export const randomToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");

// Sessions are signed with a key derived from AGENT_TOKEN, so no extra secret is needed
async function sessionKey(env, kind) {
  return crypto.subtle.importKey("raw", enc.encode(`lra-${kind}-session-v1:` + env.AGENT_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function makeSessionCookie(env, email, days = 30, kind = "portal") {
  const payload = b64u(enc.encode(JSON.stringify({ e: email, x: Date.now() + days * 86400000 })));
  const sig = b64u(await crypto.subtle.sign("HMAC", await sessionKey(env, kind), enc.encode(payload)));
  return `${COOKIES[kind]}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
}

export const clearSessionCookie = (kind = "portal") => `${COOKIES[kind]}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function sessionEmail(request, env, kind = "portal") {
  if (!env.AGENT_TOKEN) return null;
  const COOKIE = COOKIES[kind];
  const raw = (request.headers.get("cookie") || "").split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await sessionKey(env, kind), fromB64u(sig), enc.encode(payload));
    if (!ok) return null;
    const { e, x } = JSON.parse(new TextDecoder().decode(fromB64u(payload)));
    return x > Date.now() ? e : null;
  } catch { return null; }
}

export const getClient = (env, email) => env.REPORTS.get(`client:${normEmail(email)}`, "json");

// One-time sign-in link, valid for 20 minutes
export async function createSignInLink(env, email) {
  const token = randomToken();
  await env.REPORTS.put(`magic:${token}`, normEmail(email), { expirationTtl: 1200 });
  return `${SITE}/api/portal/verify?t=${token}`;
}

export async function emailSignInLink(env, client, { welcome = false } = {}) {
  const link = await createSignInLink(env, client.email);
  const first = esc(String(client.name || "").split(" ")[0] || "there"), business = esc(client.business);
  return sendEmail(env, {
    to: client.email,
    subject: welcome ? `Your Comprehensive Growth Audit for ${String(client.business).slice(0, 80)} is ready` : "Your Local Rank Authority sign-in link",
    html: `<p>Hi ${first},</p>${welcome
      ? `<p>Your Comprehensive Growth Audit for <b>${business}</b> is ready in your client portal: your scores, how you compare to competitors, every finding with its fix, and your action plan.</p>`
      : client.free ? `<p>Here's your link to see your saved Local Visibility Scores.</p>` : `<p>Here's your link to sign in to your Local Rank Authority client portal.</p>`}
      <p><a href="${link}" style="display:inline-block;background:#FFBE00;color:#2A1E00;padding:12px 20px;border-radius:6px;font-weight:700;text-decoration:none">${client.free ? "See my scores" : "Open my audit"}</a></p>
      <p style="color:#55645C;font-size:13px">This link works once and expires in 20 minutes. You can get a new one anytime at ${SITE}/portal.</p>
      <p>Michael Carlson<br>Local Rank Authority · (518) 460-1010</p>`,
    replyTo: env.OWNER_EMAIL
  });
}

// Monthly quick re-scan with the public audit engine (about 1 search). Runs when the client visits.
export async function rescanIfDue(env, audit) {
  const scans = (await env.REPORTS.get(`scans:${audit.id}`, "json")) || [];
  const last = scans.length ? Date.parse(scans[scans.length - 1].date) : 0;
  if (Date.now() - last < 30 * 86400000) return false;
  if (await env.REPORTS.get(`scanlock:${audit.id}`)) return false;
  await env.REPORTS.put(`scanlock:${audit.id}`, "1", { expirationTtl: 3600 });
  const b = audit.data?.business || {};
  let url;
  try { url = new URL(/^https?:\/\//i.test(b.website || "") ? b.website : "https://" + b.website); } catch { return false; }
  const r = await runAudit({ url, business: b.name || audit.business, service: (b.services || [])[0] || "local business", city: b.city || "" }, env);
  scans.push({ date: new Date().toISOString(), overall: r.overall, sections: Object.fromEntries(r.sections.map(s => [s.label, s.score])) });
  await env.REPORTS.put(`scans:${audit.id}`, JSON.stringify(scans.slice(-24)));
  return true;
}
