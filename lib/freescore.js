// Free Local Visibility Scores after a visitor unlocks them: a private link to view (and save as PDF) on the site,
// a per-email list for the free-score dashboard at /portal, and access for the owner from /admin.
// KV keys: report:<id> (the report, with .view once unlocked) · fscores:<email> (that person's unlocked scores, newest last)
import { normEmail, randomToken, sessionEmail } from "./portal.js";

const SITE = "https://localrankauthority.com";
const KEEP = 400 * 86400; // unlocked reports are kept a little over a year (unlocked ones used to expire after 30 days)

export const reportLink = r => `${SITE}/portal/?score=${encodeURIComponent(r.id)}&k=${encodeURIComponent(r.view?.key || "")}`;

// Called on unlock: gives the report its private key (once), keeps it, and adds it to the person's list.
export async function saveUnlocked(env, report, lead) {
  const email = normEmail(lead.email);
  if (!report.view || report.view.email !== email) {
    report.view = { key: report.view?.key || randomToken().slice(0, 32), email, name: lead.name, at: new Date().toISOString() };
  }
  await env.REPORTS.put(`report:${report.id}`, JSON.stringify(report), { expirationTtl: KEEP });
  const list = (await env.REPORTS.get(`fscores:${email}`, "json")) || [];
  const row = { id: report.id, key: report.view.key, at: report.createdAt || report.view.at, host: report.input?.host, business: report.input?.business,
    service: report.input?.service, city: report.input?.city, url: report.input?.url, overall: report.overall ?? null, grade: report.grade || null };
  const next = list.filter(x => x.id !== report.id).concat(row).slice(-50);
  await env.REPORTS.put(`fscores:${email}`, JSON.stringify(next));
  return report;
}

export const listScores = async (env, email) => (await env.REPORTS.get(`fscores:${normEmail(email)}`, "json")) || [];

const owners = env => String(env.OWNER_EMAIL || "").split(",").map(normEmail).filter(Boolean);

// Who may see a full report: anyone with its private link, the person who unlocked it (signed in to /portal), or the owner (signed in to /admin).
export async function canView(request, env, report, key) {
  if (!report) return false;
  if (report.view?.key && key && key.length === report.view.key.length && key === report.view.key) return true;
  const admin = await sessionEmail(request, env, "admin");
  if (admin && owners(env).includes(normEmail(admin))) return true;
  const me = await sessionEmail(request, env, "portal");
  return !!(me && report.view?.email && normEmail(me) === report.view.email);
}

// The visitor's email: their score, their biggest issue, and a button to the full report on the site.
export function scoreEmailHtml(r, firstName, link, esc) {
  const tone = n => n == null ? "#8A968F" : n >= 80 ? "#1B7F4C" : n >= 50 ? "#D99A00" : "#C8432B";
  const all = (r.sections || []).flatMap(s => (s.findings || []).map(f => ({ ...f, area: s.label })));
  const top = all.find(f => f.status === "fail") || all.find(f => f.status === "warn");
  const issues = all.filter(f => f.status === "fail" || f.status === "warn").length;
  const rows = (r.sections || []).map(s => `<tr><td style="padding:5px 12px 5px 0;font:600 14px Arial,sans-serif;color:#11201A">${esc(s.label)}</td>
    <td style="padding:5px 0;font:800 15px Arial,sans-serif;color:${tone(s.score)};text-align:right">${s.score ?? "–"}/100</td></tr>`).join("");
  return `<div style="background:#F5F7F4;padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;background:#FFFFFF;border-radius:14px;overflow:hidden">
    <tr><td style="background:#075139;padding:18px 24px;font:900 16px Arial,sans-serif;color:#FFFFFF;letter-spacing:.04em">LOCAL RANK AUTHORITY</td></tr>
    <tr><td style="padding:24px 24px 6px;font:15px/1.55 Arial,sans-serif;color:#11201A">Hi ${esc(firstName || "there")}, your Local Visibility Score for <b>${esc(r.input?.business)}</b> is ready.</td></tr>
    <tr><td style="padding:10px 24px"><div style="font:900 44px/1 Arial,sans-serif;color:${tone(r.overall)}">${r.overall ?? "–"}<span style="font:700 16px Arial,sans-serif;color:#55645C"> /100 overall</span></div>
      <div style="font:14px Arial,sans-serif;color:#55645C;margin-top:6px">${esc(r.input?.host)} · ${esc(r.input?.service)} in ${esc(r.input?.city)}</div></td></tr>
    <tr><td style="padding:6px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table></td></tr>
    ${top ? `<tr><td style="padding:14px 24px 0"><div style="border:1px solid #E3E8E5;border-left:5px solid ${top.status === "fail" ? "#C8432B" : "#B87400"};border-radius:8px;padding:12px 14px;font:14px/1.5 Arial,sans-serif;color:#11201A">
      <div style="font:700 12px Arial,sans-serif;color:#55645C;text-transform:uppercase;letter-spacing:.05em">Your biggest issue · ${esc(top.area)}</div><b>${esc(top.title)}</b><br>${esc(top.detail)}</div></td></tr>` : ""}
    <tr><td style="padding:24px;text-align:center">
      <a href="${link}" style="display:inline-block;background:#FFBE00;color:#2A1E00;font:800 16px Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:8px">See all ${issues} ${issues === 1 ? "issue" : "issues"} and how to fix them</a>
      <div style="font:13px/1.5 Arial,sans-serif;color:#55645C;margin-top:12px">Your full report is saved on our site, with a button to save it as a PDF.<br>
        Find all your scores anytime at <a href="${SITE}/portal/" style="color:#0B5D3F">localrankauthority.com/portal</a>: sign in with this email, no password.</div></td></tr>
    <tr><td style="padding:0 24px 26px;font:14px/1.5 Arial,sans-serif;color:#11201A;text-align:center">Want these fixed for you? Reply to this email or call (518) 460-1010.<br>Michael Carlson, Local Rank Authority</td></tr>
  </table></div>`;
}
