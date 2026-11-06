// POST /api/crm/ingest: adds a call, chat, or other conversation to the CRM from outside the site
// (the xAI voice agent's save-the-call tool, a DM Champ webhook, Pabbly Connect).
// Auth: "Authorization: Bearer <CRM_INGEST_TOKEN>", or ?token=<CRM_INGEST_TOKEN> for tools that can't set headers.
//
// Body (JSON), every field optional except a way to identify the person:
//   { type: "call" | "chat" | "form" | ..., at, external_id, title, summary, transcript (or body), url (recording or transcript link),
//     duration (seconds), urgency: "low" | "normal" | "high" | "urgent", outcome,
//     contact: { name, email, phone, business, website }  (or the same fields at the top level),
//     notify: true  (email the owner a summary) }
import { json, esc, sendEmail } from "../../../lib/audit.js";
import { recordInteraction, safeUrl } from "../../../lib/crmdb.js";

const enc = new TextEncoder();
async function sameSecret(a, b) {
  // Constant-time compare via HMAC digests, so the token can't be guessed one character at a time
  const key = await crypto.subtle.importKey("raw", enc.encode("crm-ingest"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.sign("HMAC", key, enc.encode(String(v)))));
  const u = new Uint8Array(x), w = new Uint8Array(y);
  let diff = u.length ^ w.length;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ w[i];
  return diff === 0;
}

const pick = (b, ...names) => {
  for (const n of names) if (b[n] != null && String(b[n]).trim() !== "") return b[n];
  return null;
};

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.CRM || !env.CRM_INGEST_TOKEN) return json({ error: "The CRM isn't set up yet." }, 503);
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : (url.searchParams.get("token") || "");
  if (!token || !(await sameSecret(token, env.CRM_INGEST_TOKEN))) return json({ error: "Unauthorized" }, 401);

  let b;
  const ct = request.headers.get("content-type") || "";
  try {
    b = ct.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ error: "Send JSON." }, 400);
  }
  const c = (b.contact && typeof b.contact === "object") ? b.contact : {};
  const contact = {
    name: pick(c, "name") ?? pick(b, "name", "caller_name", "contact_name"),
    email: pick(c, "email") ?? pick(b, "email", "caller_email"),
    phone: pick(c, "phone") ?? pick(b, "phone", "caller_phone", "from", "caller_number"),
    business: pick(c, "business", "company") ?? pick(b, "business", "company"),
    website: pick(c, "website") ?? pick(b, "website"),
    source: String(b.source || b.type || "ingest").slice(0, 120)
  };
  if (!contact.name && !contact.email && !contact.phone && !contact.business) {
    return json({ error: "Include at least a name, email, phone, or business." }, 400);
  }
  const ev = {
    type: String(b.type || "other").toLowerCase(),
    at: b.at || b.started_at || b.timestamp,
    external_id: b.external_id || b.call_id || b.conversation_id || null,
    title: b.title || null,
    summary: b.summary || null,
    body: b.transcript || b.body || b.message || null,
    url: b.url || b.recording_url || b.transcript_url || null,
    duration: b.duration ?? b.duration_seconds,
    urgency: String(b.urgency || "").toLowerCase() || null,
    outcome: b.outcome || null,
    meta: b.meta && typeof b.meta === "object" ? b.meta : null,
    contact
  };
  if (ev.external_id) ev.external_id = `${ev.type}:${String(ev.external_id).slice(0, 180)}`;
  if (!ev.title) ev.title = ev.type === "call" ? "Phone call" : ev.type === "chat" ? "Website chat" : null;

  const r = await recordInteraction(env, ev);
  if (!r) return json({ error: "The CRM isn't set up yet." }, 503);

  const notify = b.notify === true || b.notify === "true" || ev.urgency === "urgent";
  if (notify && !r.duplicate && env.OWNER_EMAIL) {
    const who = [contact.name, contact.business].filter(Boolean).join(" · ") || contact.phone || contact.email;
    const lines = [
      ["From", who], ["Phone", contact.phone], ["Email", contact.email], ["Urgency", ev.urgency], ["Outcome", ev.outcome],
      ["Summary", ev.summary]
    ].filter(([, v]) => v);
    waitUntil(sendEmail(env, {
      to: String(env.OWNER_EMAIL).split(",")[0].trim(),
      subject: `${ev.urgency === "urgent" ? "URGENT · " : ""}${ev.title || "New conversation"} · ${who}`,
      html: `<p>${lines.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>")}</p>
        ${safeUrl(ev.url) ? `<p><a href="${esc(safeUrl(ev.url))}">Recording or transcript</a></p>` : ""}
        <p><a href="https://localrankauthority.com/admin/#contact-${r.contact_id}">Open in the CRM</a></p>`
    }).catch(e => console.log("crm notify", e && e.message)));
  }
  return json({ ok: true, contact_id: r.contact_id, id: r.id, duplicate: r.duplicate });
}
