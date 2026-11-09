// GET /api/score?id=<report id>&k=<private key>: a full, unlocked free score for the report page on the homepage.
// Also opens without the key for the person who unlocked it (signed in to /portal) and for the owner (signed in to /admin).
import { json } from "../../lib/audit.js";
import { canView } from "../../lib/freescore.js";

export async function onRequestGet({ request, env }) {
  if (!env.REPORTS) return json({ error: "Reports aren't available right now." }, 503);
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") || "").slice(0, 80);
  const key = String(url.searchParams.get("k") || "").slice(0, 80);
  const report = /^[0-9a-f-]{36}$/i.test(id) ? await env.REPORTS.get(`report:${id}`, "json") : null;
  if (!report) return json({ error: "We couldn't find that report. It may have expired. Run a new free score and it takes about a minute." }, 404);
  if (!(await canView(request, env, report, key))) return json({ error: "This report link isn't valid. Use the link in your email, or sign in at localrankauthority.com/portal." }, 403);
  const { view, ...rest } = report;
  return new Response(JSON.stringify({ report: { ...rest, locked: false }, key: view?.key || null }),
    { headers: { "content-type": "application/json", "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
}
