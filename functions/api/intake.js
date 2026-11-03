// POST /api/intake: the form clients fill in to start the Comprehensive Growth Audit (after checkout, an
// invoice request, or with a discount code). Stores the intake, counts a code use, emails the owner and the client.
import { esc, json, sendEmail } from "../../lib/audit.js";
import { DEFAULT_OFFER, couponProblem, money, normCode, quote, readCoupon, readOffer, useKeys } from "../../lib/offer.js";

const ACCESS = { gbp: "Google Business Profile", search_console: "Search Console", analytics: "Google Analytics", ads: "Ads accounts" };

export async function onRequestPost({ request, env, waitUntil }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Something went wrong reading your form. Please try again." }, 400); }
  const clean = (v, n = 1000) => String(v || "").trim().slice(0, n);
  if (clean(b._gotcha)) return json({ error: "Your form couldn't be sent." }, 400);
  const f = {
    name: clean(b.name, 120), email: clean(b.email, 200).toLowerCase(), phone: clean(b.phone, 40),
    business: clean(b.business, 160), website: clean(b.website, 300), business_phone: clean(b.business_phone, 40), address: clean(b.address, 300),
    services: clean(b.services, 500), towns: clean(b.towns, 500), competitors: clean(b.competitors, 500), goal: clean(b.goal, 60),
    job_value: clean(b.job_value, 60), social: clean(b.social), ads: clean(b.ads), notes: clean(b.notes, 2000), session_id: clean(b.session_id, 200)
  };
  if (!f.name || !f.business || !f.website || !f.services || !f.towns || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) {
    return json({ error: "Add your name, a valid email, your business name, website, services, and towns." }, 400);
  }
  if (!env.REPORTS && !(env.RESEND_KEY && env.OWNER_EMAIL)) return json({ error: "The form isn't connected yet. Please call (518) 460-1010." }, 503);
  const access = Object.entries(ACCESS).filter(([k]) => b.access?.[k]).map(([, label]) => label);
  const at = new Date().toISOString();
  const offer = (await readOffer(env)) || DEFAULT_OFFER;

  // A valid code is counted as used now; an invalid one is still recorded so the owner can follow up
  let pricing = `List price ${money(offer.price)}${f.session_id ? " · paid through Stripe checkout" : " · no code: invoice the full price"}`;
  let clientPricing = `your ${money(offer.price)} Comprehensive Growth Audit`;
  const code = normCode(b.code);
  if (code) {
    const c = await readCoupon(env, code);
    const keys = c ? useKeys(c.code, f.website, f.email) : [];
    const usedBefore = (await Promise.all(keys.map(k => env.REPORTS.get(k)))).some(Boolean);
    const problem = couponProblem(c) || (usedBefore ? "this business has already used it" : "");
    if (problem) pricing = `List price ${money(offer.price)} · code ${code} was NOT valid (${problem}) · confirm the price before starting`;
    else {
      const q = quote(offer, c);
      pricing = q.complimentary ? `${q.label} · no invoice` : `${q.label} · ${f.session_id ? "paid through Stripe" : `invoice ${money(q.you_pay)}`}`;
      clientPricing = q.complimentary ? `your ${money(q.list_price)} Comprehensive Growth Audit, complimentary with code ${q.code}` : `your ${money(q.list_price)} Comprehensive Growth Audit (code ${q.code} applied: you pay ${money(q.you_pay)})`;
      await Promise.all([
        env.REPORTS.put(`coupon:${c.code}`, JSON.stringify({ ...c, used: (c.used || 0) + 1, last_used: at, last_used_by: f.business })),
        ...keys.map(k => env.REPORTS.put(k, at))
      ]);
    }
  }
  const record = { ...f, access, code, pricing, at };
  if (env.REPORTS) await env.REPORTS.put(`intake:${at}`, JSON.stringify(record));

  const rows = Object.entries({ pricing, ...f, access: access.join(", ") || "None yet" }).filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#55645C;vertical-align:top"><b>${esc(k.replace(/_/g, " "))}</b></td><td style="padding:4px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  waitUntil(Promise.allSettled([
    env.OWNER_EMAIL && sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `New audit intake: ${f.business}`,
      html: `<p>A client submitted the Comprehensive Growth Audit intake form. <b>${esc(pricing)}</b>.${f.session_id ? ` Confirm the payment in Stripe (checkout session ${esc(f.session_id)}).` : ""} Then start the audit in Claude: "run a comprehensive audit for ${esc(f.business)}".</p><table>${rows}</table>`,
      replyTo: f.email
    }),
    sendEmail(env, {
      to: f.email,
      subject: "Your Comprehensive Growth Audit is underway",
      html: `<p>Hi ${esc(f.name.split(" ")[0])},</p><p>Thanks for choosing Local Rank Authority. We've received your details for <b>${esc(f.business)}</b>, and ${esc(clientPricing)} is underway. Your report, action plan, and landing page will be ready within 5 business days, and we'll schedule your 45-minute walkthrough.</p>${access.length ? `<p>Access you've granted: ${esc(access.join(", "))}. Thank you, that makes the audit much deeper.</p>` : `<p>If you'd like to add read-only access to your Google Business Profile, Search Console, or Analytics later, just reply to this email and we'll walk you through it.</p>`}<p>Questions anytime: (518) 460-1010 or reply to this email.</p><p>Michael Carlson<br>Local Rank Authority</p>`,
      replyTo: env.OWNER_EMAIL
    })
  ]));
  return json({ ok: true });
}
