// POST /api/contact: the "Tell us about your business" form. Stores the inquiry and emails it to the owner.
import { esc, json, sendEmail } from "../../lib/audit.js";

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Something went wrong reading your request. Please try again." }, 400); }
  const clean = v => String(v || "").trim().slice(0, 2000);
  if (clean(b._gotcha)) return json({ error: "Your request couldn't be sent." }, 400);
  const f = { name: clean(b.name), business: clean(b.business), email: clean(b.email), phone: clean(b.phone), website: clean(b.website), topic: clean(b.topic), message: clean(b.message), auditId: clean(b.audit_id) };
  if (!f.name || !f.business || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return json({ error: "Add your name, business name, and a valid email." }, 400);
  if (!env.REPORTS && !(env.RESEND_KEY && env.OWNER_EMAIL)) return json({ error: "The contact form isn't connected yet." }, 503);

  const at = new Date().toISOString();
  if (env.REPORTS) await env.REPORTS.put(`contact:${at}`, JSON.stringify({ ...f, at }));
  if (env.OWNER_EMAIL) {
    await sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `New inquiry: ${f.topic || "General"} · ${f.business}`,
      html: `<p>${Object.entries(f).filter(([, v]) => v).map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>")}</p>`,
      replyTo: f.email
    });
  }
  return json({ ok: true });
}
