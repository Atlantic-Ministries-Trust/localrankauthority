// POST /api/unlock: saves the lead, emails the full report to the visitor and the lead to the owner, and returns the full report.
import { recordInteraction } from "../../lib/crmdb.js";
import { completeRankings, esc, json, reportEmailHtml, sendEmail } from "../../lib/audit.js";
import { reportLink, saveUnlocked, scoreEmailHtml } from "../../lib/freescore.js";
import { saveBenchmark } from "../../lib/benchmark.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.REPORTS) return json({ error: "The audit isn't set up yet." }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Something went wrong reading your request. Please try again." }, 400); }
  const clean = v => String(v || "").trim().slice(0, 200);
  const lead = { name: clean(b.name), email: clean(b.email).toLowerCase(), phone: clean(b.phone), business: clean(b.business) };

  if (clean(b._gotcha)) return json({ error: "Your request couldn't be sent." }, 400);
  if (!lead.name || !lead.email || !lead.phone) return json({ error: "Enter your name, email, and phone to see the full report." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) return json({ error: "That email address looks incomplete. Check it and try again." }, 400);
  if (lead.phone.replace(/\D/g, "").length < 10) return json({ error: "Enter a phone number with area code." }, 400);

  let report = await env.REPORTS.get(`report:${clean(b.id)}`, "json");
  if (!report) return json({ error: "This audit has expired. Run a new one and it'll take about a minute." }, 404);

  // Bing rankings are part of the unlocked report, so they only spend searches on real leads
  if (!report.rankingsCompleted) report = await completeRankings(report, env).catch(() => report);
  // Keep the unlocked report with a private link, and add it to this email's free-score dashboard
  report = await saveUnlocked(env, report, lead);
  const link = reportLink(report);
  // Rerun the competitor benchmark with the full report (Bing and reputation are added on unlock)
  waitUntil(saveBenchmark(report, env).catch(e => console.log("benchmark", e && e.message)));

  const record = { ...lead, reportId: report.id, site: report.input.host, overall: report.overall, at: new Date().toISOString(), ip: request.headers.get("cf-connecting-ip") || "" };
  await env.REPORTS.put(`lead:${record.at}:${report.id}`, JSON.stringify(record));
  waitUntil(recordInteraction(env, { type: "score", at: record.at, external_id: `lead:${record.at}:${report.id}`, source: "free score",
    contact: { name: lead.name, email: lead.email, phone: lead.phone, business: lead.business, website: record.site },
    title: `Unlocked free score${report.overall != null ? `: ${report.overall}/100` : ""}`, summary: `Website: ${record.site}`, url: link,
    meta: { reportId: report.id, grade: report.grade || null } }).catch(e => console.log("crm", e && e.message)));

  const summary = report.sections.map(s => `<li>${esc(s.label)}: ${s.score ?? "–"}/100 · ${esc(s.summary || "")}</li>`).join("");
  waitUntil(Promise.allSettled([
    sendEmail(env, {
      to: lead.email,
      subject: `Your Local Visibility Score: ${report.input.host} scored ${report.overall ?? "–"}/100`,
      html: scoreEmailHtml(report, lead.name.split(" ")[0], link, esc),
      replyTo: env.OWNER_EMAIL
    }),
    env.OWNER_EMAIL && sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `New audit lead: ${lead.business || report.input.business} (${report.overall ?? "–"}/100)`,
      html: `<p><b>${esc(lead.name)}</b><br>${esc(lead.email)}<br>${esc(lead.phone)}<br>${esc(lead.business || report.input.business)} · ${esc(report.input.host)}</p><p><a href="${link}">Open their full report on the site</a> (works for you anytime, and from /admin)</p><ul>${summary}</ul><hr>${reportEmailHtml(report, "Their full report:")}`,
      replyTo: lead.email
    })
  ]));

  const { view, ...shown } = report;
  const benchmark = await env.REPORTS.get(`bench:${report.id}`, "json");
  return json({ report: { ...shown, ...(benchmark ? { benchmark } : {}) }, key: view.key, link, emailed: !!env.RESEND_KEY });
}
