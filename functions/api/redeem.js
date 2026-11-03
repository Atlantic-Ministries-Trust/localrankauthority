// POST /api/redeem: checks a discount code for the Comprehensive Audit and says what the client would pay.
// Read-only (a use is counted when the intake form is submitted). Limited per visitor to slow down code guessing.
import { json } from "../../lib/audit.js";
import { DEFAULT_OFFER, couponProblem, normCode, quote, readCoupon, readOffer } from "../../lib/offer.js";

export async function onRequestPost({ request, env }) {
  if (!env.REPORTS) return json({ error: "Codes aren't available right now. Call (518) 460-1010." }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Enter a code." }, 400); }
  const code = normCode(b.code);
  if (!code) return json({ error: "Enter a code." }, 400);

  const rlKey = `rl-code:${request.headers.get("cf-connecting-ip") || "unknown"}:${new Date().toISOString().slice(0, 10)}`;
  const tries = +(await env.REPORTS.get(rlKey)) || 0;
  if (tries >= 20) return json({ error: "Too many tries today. Call (518) 460-1010 and we'll help." }, 429);
  await env.REPORTS.put(rlKey, String(tries + 1), { expirationTtl: 86400 });

  const c = await readCoupon(env, code);
  const problem = couponProblem(c);
  if (problem) return json({ error: problem }, 404);
  const offer = (await readOffer(env)) || DEFAULT_OFFER;
  const q = quote(offer, c);
  // Partly discounted audits go to Stripe when checkout is on (the same code must exist there); everything else goes to intake
  const viaStripe = !q.complimentary && offer.mode === "paid" && offer.stripe_link;
  const next = viaStripe ? `${offer.stripe_link}?prefilled_promo_code=${encodeURIComponent(c.code)}` : `/audit-intake?code=${encodeURIComponent(c.code)}`;
  return json({ ...q, next, invoice: !q.complimentary && !viaStripe });
}
