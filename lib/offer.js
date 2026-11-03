// The Comprehensive Audit offer: what the sales page shows and where its buttons go.
//   paid:    "Buy the audit · $X" → Stripe payment link (falls back to request if no link is set)
//   request: "Request your audit · $X" → contact form; the owner invoices by hand
//   free:    "Claim your free audit" → intake form, with an optional note and a struck-through "was" price
export const DEFAULT_OFFER = { mode: "request", price: 1000, was: null, note: "", stripe_link: "" };
const REQUEST_HREF = "/?topic=Comprehensive%20audit#contact";
const money = n => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function readOffer(env) {
  return env.REPORTS ? await env.REPORTS.get("offer", "json") : null;
}

// Validates a partial update against the current offer and returns the merged offer, or { error }.
export function mergeOffer(current, b) {
  const o = { ...DEFAULT_OFFER, ...(current || {}) };
  if (b.mode !== undefined) {
    if (!["paid", "request", "free"].includes(b.mode)) return { error: "mode must be paid, request, or free." };
    o.mode = b.mode;
  }
  if (b.price !== undefined) {
    const p = Math.round(Number(String(b.price).replace(/[$,]/g, "")));
    if (!Number.isFinite(p) || p < 1 || p > 100000) return { error: "price must be a whole-dollar amount from 1 to 100000." };
    o.price = p;
  }
  if (b.was !== undefined) {
    const w = b.was === null || b.was === "" ? null : Math.round(Number(String(b.was).replace(/[$,]/g, "")));
    if (w !== null && (!Number.isFinite(w) || w < 1)) return { error: "was must be a dollar amount, or empty to hide it." };
    o.was = w;
  }
  if (b.note !== undefined) o.note = String(b.note).trim().slice(0, 160);
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
  const was = o.was ? `<s style="opacity:.7;font-size:.55em;margin-right:8px">${esc(money(o.was))}</s>` : "";
  if (o.mode === "free") return {
    priceHtml: `${was}Free`, href: "/audit-intake?offer=free", button: "Claim your free audit",
    terms: o.note || "Limited-time offer · delivered in 5 business days", paynote: ""
  };
  if (o.mode === "paid" && o.stripe_link) return {
    priceHtml: `${was}${esc(price)}`, href: o.stripe_link, button: `Buy the audit · ${price}`,
    terms: o.note || "One-time · delivered in 5 business days · credited toward ongoing work if you start within 30 days",
    paynote: "Secure checkout by Stripe. Payments are processed by Atlantic Ministries Trust, Local Rank Authority's parent company."
  };
  return {
    priceHtml: `${was}${esc(price)}`, href: REQUEST_HREF, button: `Request your audit · ${price}`,
    terms: o.note || "One-time · delivered in 5 business days · credited toward ongoing work if you start within 30 days",
    paynote: "Send a request and Michael will confirm the details and send your invoice."
  };
}
