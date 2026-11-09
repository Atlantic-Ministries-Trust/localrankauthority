// POST /api/contact: the "Tell us about your business" form. Stores the inquiry and emails it to the owner.
// Also takes the contact form on rankmaverick.com (Michael's consulting brand), which posts here cross-origin.
import { recordInteraction } from "../../lib/crmdb.js";
import { esc, json, sendEmail } from "../../lib/audit.js";

const CORS_ORIGINS = new Set(["https://rankmaverick.com", "https://www.rankmaverick.com", "https://rankmaverick.pages.dev"]);
const corsHeaders = request => {
  const o = request.headers.get("origin");
  return CORS_ORIGINS.has(o) ? { "access-control-allow-origin": o, "vary": "Origin" } : null;
};

export async function onRequestOptions({ request }) {
  const c = corsHeaders(request);
  if (!c) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...c, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" } });
}

export async function onRequestPost(ctx) {
  const res = await handlePost(ctx);
  const c = corsHeaders(ctx.request);
  if (c) for (const [k, v] of Object.entries(c)) res.headers.set(k, v);
  return res;
}

async function handlePost({ request, env, waitUntil }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Something went wrong reading your request. Please try again." }, 400); }
  const clean = v => String(v || "").trim().slice(0, 2000);
  if (clean(b._gotcha)) return json({ error: "Your request couldn't be sent." }, 400);
  const f = { name: clean(b.name), business: clean(b.business), smsOk: b.sms_ok === true ? "yes" : "", email: clean(b.email), phone: clean(b.phone), website: clean(b.website), topic: clean(b.topic), message: clean(b.message), auditId: clean(b.audit_id) };
  const general = f.topic === "General message";
  if (!f.name || (!f.business && !general) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return json({ error: general ? "Add your name and a valid email." : "Add your name, business name, and a valid email." }, 400);
  if (!env.REPORTS && !(env.RESEND_KEY && env.OWNER_EMAIL)) return json({ error: "The contact form isn't connected yet." }, 503);

  const at = new Date().toISOString();
  if (env.REPORTS) await env.REPORTS.put(`contact:${at}`, JSON.stringify({ ...f, at }));
  const rankMaverick = f.topic.startsWith("Rank Maverick");
  waitUntil(recordInteraction(env, { type: "form", at, external_id: `contact:${at}`, source: rankMaverick ? "rankmaverick.com contact form" : "contact form",
    contact: { name: f.name, email: f.email, phone: f.phone, business: f.business, website: f.website, tags: [...(f.smsOk ? ["sms ok"] : []), ...(rankMaverick ? ["rank maverick"] : [])] },
    title: f.topic ? `Contact form: ${f.topic}` : "Contact form", body: f.message || null }).catch(e => console.log("crm", e && e.message)));
  if (env.OWNER_EMAIL) {
    await sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `New inquiry: ${f.topic || "General"} · ${f.business || f.name}`,
      html: `<p>${Object.entries(f).filter(([, v]) => v).map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>")}</p>`,
      replyTo: f.email
    });
  }
  return json({ ok: true });
}
