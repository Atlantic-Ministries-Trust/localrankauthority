// POST /api/audit: runs the audit, stores the full report, and returns only the teaser.
import { json, normalizeUrl, runAudit, teaser } from "../../lib/audit.js";

const DAY = 86400;

export async function onRequestPost({ request, env }) {
  if (!env.REPORTS) return json({ error: "The audit isn't set up yet. Please use the contact form and we'll run it for you." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Something went wrong reading your request. Please try again." }, 400); }
  const clean = v => String(v || "").trim().slice(0, 120);
  const url = normalizeUrl(body.url);
  const business = clean(body.business), service = clean(body.service), city = clean(body.city);
  if (!url) return json({ error: "Enter your website address, like yourbusiness.com." }, 400);
  if (!business || !service || !city) return json({ error: "Fill in your business name, main service, and city." }, 400);

  const today = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rlKey = `rl:${ip}:${today}`;
  const used = +(await env.REPORTS.get(rlKey)) || 0;
  if (used >= (+env.DAILY_LIMIT_PER_VISITOR || 5)) {
    return json({ error: "You've run the maximum number of free audits for today. Contact us and we'll run more for you." }, 429);
  }

  // Reuse a recent report for the same site and search so repeat runs don't spend free quota
  const cacheKey = `cache:${url.hostname.replace(/^www\./, "")}:${(service + " " + city).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const cachedId = await env.REPORTS.get(cacheKey);
  if (cachedId) {
    const cached = await env.REPORTS.get(`report:${cachedId}`, "json");
    if (cached) return json(teaser(cached));
  }

  // Each audit spends 3 ranking searches; stop before the monthly free allowance runs out
  const month = today.slice(0, 7);
  const serpKey = `serp:${month}`;
  const serpUsed = +(await env.REPORTS.get(serpKey)) || 0;
  const allowRankings = serpUsed + 3 <= (+env.SERP_MONTHLY_LIMIT || 240);

  const report = await runAudit({ url, business, service, city }, env, { allowRankings });

  await Promise.all([
    env.REPORTS.put(`report:${report.id}`, JSON.stringify(report), { expirationTtl: 30 * DAY }),
    env.REPORTS.put(cacheKey, report.id, { expirationTtl: DAY }),
    env.REPORTS.put(rlKey, String(used + 1), { expirationTtl: DAY }),
    allowRankings && env.SERPAPI_KEY ? env.REPORTS.put(serpKey, String(serpUsed + 3), { expirationTtl: 40 * DAY }) : null
  ]);
  return json(teaser(report));
}
