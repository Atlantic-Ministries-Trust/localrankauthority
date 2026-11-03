// The Comprehensive Audit offer and its discount codes.
// The list price is always shown on the sales page. Codes lower what a client pays, never the advertised price.
//   offer.mode  paid:    "Buy the audit · $1,000" → Stripe payment link (falls back to request if no link is set)
//               request: "Request your audit · $1,000" → contact form; the owner invoices by hand
//   coupon      percent_off (1–100) or amount_off (dollars), optional max_uses and expiry; KV key "coupon:<CODE>"
export const DEFAULT_OFFER = { mode: "request", price: 1000, stripe_link: "" };
const REQUEST_HREF = "/?topic=Comprehensive%20audit#contact";
export const money = n => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export async function readOffer(env) {
  return env.REPORTS ? await env.REPORTS.get("offer", "json") : null;
}

// Validates a partial update against the current offer and returns the merged offer, or { error }.
export function mergeOffer(current, b) {
  const o = { ...DEFAULT_OFFER, ...(current || {}) };
  if (b.mode !== undefined) {
    if (!["paid", "request"].includes(b.mode)) return { error: "mode must be paid or request. Use coupon codes for discounts or free audits." };
    o.mode = b.mode;
  }
  if (b.price !== undefined) {
    const p = Math.round(Number(String(b.price).replace(/[$,]/g, "")));
    if (!Number.isFinite(p) || p < 1 || p > 100000) return { error: "price (the list price) must be a whole-dollar amount from 1 to 100000." };
    o.price = p;
  }
  if (b.stripe_link !== undefined) {
    const l = String(b.stripe_link).trim();
    if (l && !/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(l)) return { error: "stripe_link must be a https://buy.stripe.com/... payment link." };
    o.stripe_link = l;
  }
  if (o.mode === "paid" && !o.stripe_link) return { error: "Paid mode needs a stripe_link. Use request mode until the payment link exists." };
  return o;
}

export function offerView(o) {
  const price = money(o.price);
  const paid = o.mode === "paid" && o.stripe_link;
  return {
    price, href: paid ? o.stripe_link : REQUEST_HREF,
    button: paid ? `Buy the audit · ${price}` : `Request your audit · ${price}`,
    paynote: paid
      ? "Secure checkout by Stripe. Payments are processed by Atlantic Ministries Trust, Local Rank Authority's parent company."
      : "Send a request and Michael will confirm the details and send your invoice."
  };
}

/* ---------------- Discount codes ---------------- */

export const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);

export async function readCoupon(env, code) {
  const c = normCode(code);
  return c && env.REPORTS ? await env.REPORTS.get(`coupon:${c}`, "json") : null;
}

// Why a coupon can't be used right now, or "" if it can.
export function couponProblem(c) {
  if (!c || !c.active) return "That code isn't valid.";
  if (c.expires && Date.parse(c.expires) < Date.now()) return "That code has expired.";
  if (c.max_uses != null && (c.used || 0) >= c.max_uses) return "That code has already been used.";
  return "";
}

// What a client pays with this coupon. The list price is always reported alongside.
export function quote(offer, c) {
  const list = offer.price;
  const off = c.percent_off != null ? Math.round(list * c.percent_off / 100) : Math.min(list, Math.round(c.amount_off || 0));
  const pay = Math.max(0, list - off);
  return { code: c.code, list_price: list, discount: off, you_pay: pay, complimentary: pay === 0,
    label: pay === 0 ? `List price ${money(list)} · Code ${c.code} · Complimentary` : `List price ${money(list)} · Code ${c.code} · You pay ${money(pay)}` };
}

// Validates a new coupon from the agent and returns it, or { error }.
export function newCoupon(b) {
  const code = normCode(b.code);
  if (code.length < 3) return { error: "code must be at least 3 letters or numbers." };
  const pct = b.percent_off != null && b.percent_off !== "" ? Math.round(Number(b.percent_off)) : null;
  const amt = b.amount_off != null && b.amount_off !== "" ? Math.round(Number(String(b.amount_off).replace(/[$,]/g, ""))) : null;
  if ((pct == null) === (amt == null)) return { error: "Set exactly one of percent_off (1-100) or amount_off (dollars)." };
  if (pct != null && !(pct >= 1 && pct <= 100)) return { error: "percent_off must be 1 to 100." };
  if (amt != null && !(amt >= 1)) return { error: "amount_off must be at least 1." };
  const uses = b.max_uses != null && b.max_uses !== "" ? Math.round(Number(b.max_uses)) : null;
  if (uses != null && !(uses >= 1)) return { error: "max_uses must be at least 1, or left empty for unlimited." };
  const days = b.expires_in_days != null && b.expires_in_days !== "" ? Number(b.expires_in_days) : null;
  if (days != null && !(days > 0)) return { error: "expires_in_days must be more than 0." };
  return { code, percent_off: pct, amount_off: amt, max_uses: uses, used: 0,
    expires: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
    note: String(b.note || "").trim().slice(0, 200), active: true, created: new Date().toISOString() };
}
