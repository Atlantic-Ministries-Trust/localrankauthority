// GET /comprehensive-audit: serves the static sales page, then applies the current offer (price, paid/request/free)
// stored in KV under "offer". The agent changes it through /api/agent { tool: "offer" }, so no redeploy is needed.
import { offerView, readOffer } from "../lib/offer.js";

export async function onRequestGet({ env, next }) {
  const res = await next();
  const offer = await readOffer(env);
  if (!offer || !res.headers.get("content-type")?.includes("text/html")) return res;
  const v = offerView(offer);
  const text = t => ({ element(el) { el.setInnerContent(t); } });
  const rewritten = new HTMLRewriter()
    .on('[data-offer="price"]', { element(el) { el.setInnerContent(v.priceHtml, { html: true }); } })
    .on('[data-offer="terms"]', text(v.terms))
    .on('[data-offer="button"]', { element(el) { el.setAttribute("href", v.href); el.setInnerContent(v.button); } })
    .on('[data-offer="paynote"]', v.paynote ? text(v.paynote) : { element(el) { el.remove(); } })
    .transform(res);
  const h = new Headers(rewritten.headers);
  h.set("cache-control", "no-store");
  return new Response(rewritten.body, { status: rewritten.status, headers: h });
}
