import { mirrorCompany } from "./crmdb.js";

// Sales pipeline records, shared by the owner dashboard (/api/admin/crm) and the agent toolbox (/api/agent, tool "crm").
// One record per company in KV as crm:<key>. The key matches how the dashboard groups companies: the website's domain,
// else "name:<business name>", so a prospect added early joins their later free score, request, or portal.
export const STAGES = ["New lead", "Contacted", "Call booked", "Audit sold", "Audit delivered", "Proposal sent", "Won", "Lost"];
const FIELDS = { stage: 40, business: 160, website: 300, contact_name: 120, email: 200, phone: 40, source: 120, package: 80, retainer: 80, value: 12, monthly: 12, follow_up: 10, lost_reason: 300 };

export function crmKey(website, business) {
  try {
    const w = String(website || "").trim();
    if (w) return new URL(/^https?:\/\//i.test(w) ? w : "https://" + w).hostname.toLowerCase().replace(/^www\./, "");
  } catch { /* fall back to the name */ }
  const name = String(business || "").trim().toLowerCase();
  return name ? "name:" + name.slice(0, 190) : "";
}

export const readCrm = (env, key) => env.REPORTS.get(`crm:${key}`, "json");

// Merge a patch and an optional note into a company's record. addOnly fills in only empty fields and never changes
// an existing stage (the agent logging a prospect must never move a client backwards). Returns { record } or { error }.
export async function saveCrm(env, { key, patch = {}, note = "", manual = false, by = "you", addOnly = false }) {
  key = String(key || "").trim().toLowerCase().slice(0, 200);
  if (!key) return { error: "Missing company (website or business name)." };
  const now = new Date().toISOString();
  const rec = (await readCrm(env, key)) || { key, created: now, notes: [], history: [] };
  if (manual && !rec.manual) rec.manual = true;
  for (const [f, max] of Object.entries(FIELDS)) {
    if (!(f in patch) || patch[f] == null) continue;
    let v = String(patch[f]).trim().slice(0, max);
    if (f === "stage") {
      if (!STAGES.includes(v)) return { error: `Unknown stage. Use one of: ${STAGES.join(", ")}.` };
      if (addOnly && rec.stage) continue;
      if (v !== rec.stage) rec.history = [...(rec.history || []), { at: now, from: rec.stage || null, to: v, by }].slice(-50);
    }
    if ((f === "value" || f === "monthly") && v) v = String(Math.max(0, Math.round(Number(v.replace(/[$,]/g, ""))) || 0));
    if (f === "follow_up" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: "follow_up must be a date like 2026-11-20." };
    if (addOnly && rec[f]) continue;
    rec[f] = v;
  }
  note = String(note || "").trim().slice(0, 3000);
  if (note) rec.notes = [...(rec.notes || []), { at: now, text: note, by }].slice(-200);
  rec.updated = now;
  await env.REPORTS.put(`crm:${key}`, JSON.stringify(rec));
  // Keep the CRM database's company row in step. A database problem never blocks the pipeline save.
  try { await mirrorCompany(env, rec); } catch (e) { console.log("crm mirror failed", e && e.message); }
  return { record: rec };
}
