// The CRM database (Cloudflare D1, bound as env.CRM): companies, contacts, a timeline of interactions
// (calls, chats, forms, free scores, notes), and follow-up tasks. Every function is a no-op that returns null
// when env.CRM isn't bound, so the site keeps working before the database exists.
//
// Matching: a contact is the same person when the email matches, else the phone number. A contact's company uses
// the same key as the sales pipeline (lib/crm.js crmKey): the website's domain, else "name:<business name>".
import { crmKey } from "./crm.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, name TEXT, website TEXT, stage TEXT, value INTEGER, monthly INTEGER, package TEXT, retainer TEXT, source TEXT, follow_up TEXT, lost_reason TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY, company_id INTEGER REFERENCES companies(id), name TEXT, email TEXT, phone TEXT, title TEXT, source TEXT, tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'open', last_activity TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS contacts_email ON contacts(email) WHERE email IS NOT NULL AND email <> ''`,
  `CREATE INDEX IF NOT EXISTS contacts_phone ON contacts(phone)`,
  `CREATE INDEX IF NOT EXISTS contacts_company ON contacts(company_id)`,
  `CREATE INDEX IF NOT EXISTS contacts_last ON contacts(last_activity)`,
  `CREATE TABLE IF NOT EXISTS interactions (id INTEGER PRIMARY KEY, contact_id INTEGER REFERENCES contacts(id), company_id INTEGER REFERENCES companies(id), type TEXT NOT NULL, direction TEXT, at TEXT NOT NULL, title TEXT, summary TEXT, body TEXT, url TEXT, duration INTEGER, urgency TEXT, outcome TEXT, meta TEXT, external_id TEXT UNIQUE, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS interactions_contact ON interactions(contact_id, at)`,
  `CREATE INDEX IF NOT EXISTS interactions_type ON interactions(type, at)`,
  `CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, contact_id INTEGER REFERENCES contacts(id), company_id INTEGER REFERENCES companies(id), title TEXT NOT NULL, due TEXT, done_at TEXT, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tasks_open ON tasks(done_at, due)`,
  // One line per voice-agent tool use, kept short and low on personal details (like Atlantic Flagpole's maggie_tool_calls)
  `CREATE TABLE IF NOT EXISTS agent_tool_calls (id INTEGER PRIMARY KEY, agent TEXT NOT NULL, tool TEXT NOT NULL, summary TEXT, ok INTEGER NOT NULL DEFAULT 1, error TEXT, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS agent_tool_calls_created ON agent_tool_calls(created)`
];

// Interaction types the dashboard knows how to show. Anything else is stored as "other".
export const TYPES = ["call", "chat", "form", "score", "intake", "message", "email", "note", "stage", "other"];
export const URGENCY = ["low", "normal", "high", "urgent"];

let schemaReady = false;
export async function ensureSchema(env) {
  if (!env.CRM) return false;
  if (!schemaReady) {
    await env.CRM.batch(SCHEMA.map(s => env.CRM.prepare(s)));
    schemaReady = true;
  }
  return true;
}

const now = () => new Date().toISOString();
const str = (v, max) => {
  const s = v == null ? "" : String(v).trim();
  return s ? s.slice(0, max) : null;
};
export const normEmail = e => {
  const s = String(e || "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s.slice(0, 200) : null;
};
// US numbers become +1XXXXXXXXXX; other numbers keep their digits with a leading +.
export function normPhone(p) {
  const raw = String(p || "").trim();
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  if (d.length >= 8 && d.length <= 15) return "+" + d;
  return null;
}
const isoOr = (v, fallback) => {
  const t = Date.parse(v || "");
  return Number.isFinite(t) ? new Date(t).toISOString() : fallback;
};

async function upsertCompany(env, { website, business, source }, t) {
  const key = crmKey(website, business);
  if (!key) return null;
  await env.CRM.prepare(
    `INSERT INTO companies (key, name, website, source, created, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
     ON CONFLICT(key) DO UPDATE SET name = COALESCE(companies.name, excluded.name), website = COALESCE(companies.website, excluded.website),
       source = COALESCE(companies.source, excluded.source), updated = excluded.updated`
  ).bind(key, str(business, 160), str(website, 300), str(source, 120), t).run();
  const row = await env.CRM.prepare(`SELECT id FROM companies WHERE key = ?1`).bind(key).first();
  return row ? row.id : null;
}

// Find the person by email, then phone; create them if new. Fills in blanks on an existing contact, never overwrites.
export async function upsertContact(env, c = {}, t = now()) {
  if (!(await ensureSchema(env))) return null;
  const email = normEmail(c.email), phone = normPhone(c.phone), name = str(c.name, 120);
  const companyId = await upsertCompany(env, { website: c.website, business: c.business, source: c.source }, t);
  let row = null;
  if (email) row = await env.CRM.prepare(`SELECT * FROM contacts WHERE email = ?1`).bind(email).first();
  if (!row && phone) row = await env.CRM.prepare(`SELECT * FROM contacts WHERE phone = ?1 ORDER BY id LIMIT 1`).bind(phone).first();
  if (!row && !email && !phone && !name && !companyId) return null;
  if (!row) {
    const r = await env.CRM.prepare(
      `INSERT INTO contacts (company_id, name, email, phone, source, tags, created, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`
    ).bind(companyId, name, email, phone, str(c.source, 120), JSON.stringify(cleanTags(c.tags)), t).run();
    return r.meta.last_row_id;
  }
  const tags = [...new Set([...parseTags(row.tags), ...cleanTags(c.tags)])];
  await env.CRM.prepare(
    `UPDATE contacts SET name = COALESCE(name, ?2), email = COALESCE(email, ?3), phone = COALESCE(phone, ?4),
       company_id = COALESCE(company_id, ?5), source = COALESCE(source, ?6), tags = ?7, updated = ?8 WHERE id = ?1`
  ).bind(row.id, name, email, phone, companyId, str(c.source, 120), JSON.stringify(tags), t).run();
  return row.id;
}

const parseTags = s => { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const cleanTags = a => (Array.isArray(a) ? a : a ? [a] : []).map(x => String(x).trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 20);

// Add one item to a contact's timeline. external_id makes it safe to send the same event twice (imports, webhooks).
// Returns { contact_id, id, duplicate } or null when the CRM isn't set up.
export async function recordInteraction(env, ev = {}) {
  if (!(await ensureSchema(env))) return null;
  const t = now();
  const at = isoOr(ev.at, t);
  const contactId = ev.contact_id || await upsertContact(env, { ...(ev.contact || {}), source: ev.contact?.source || ev.source }, t);
  const row = contactId ? await env.CRM.prepare(`SELECT company_id FROM contacts WHERE id = ?1`).bind(contactId).first() : null;
  const type = TYPES.includes(ev.type) ? ev.type : "other";
  const urgency = URGENCY.includes(ev.urgency) ? ev.urgency : null;
  const extId = str(ev.external_id, 200);
  if (extId) {
    const dup = await env.CRM.prepare(`SELECT id, contact_id FROM interactions WHERE external_id = ?1`).bind(extId).first();
    if (dup) return { contact_id: dup.contact_id, id: dup.id, duplicate: true };
  }
  const r = await env.CRM.prepare(
    `INSERT INTO interactions (contact_id, company_id, type, direction, at, title, summary, body, url, duration, urgency, outcome, meta, external_id, created)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
  ).bind(contactId || null, row ? row.company_id : null, type, ev.direction === "out" ? "out" : "in", at, str(ev.title, 200), str(ev.summary, 4000),
    str(ev.body, 100000), safeUrl(ev.url), Number.isFinite(+ev.duration) && +ev.duration > 0 ? Math.round(+ev.duration) : null,
    urgency, str(ev.outcome, 200), ev.meta ? JSON.stringify(ev.meta).slice(0, 20000) : null, extId, t).run();
  if (contactId) {
    await env.CRM.prepare(`UPDATE contacts SET last_activity = MAX(COALESCE(last_activity, ''), ?2), updated = ?3 WHERE id = ?1`).bind(contactId, at, t).run();
  }
  return { contact_id: contactId || null, id: r.meta.last_row_id, duplicate: false };
}

// Only http(s) links are kept, so a stored link can never run script in the dashboard.
export function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return null;
  try { const x = new URL(s); return /^https?:$/.test(x.protocol) ? x.toString().slice(0, 1000) : null; } catch { return null; }
}

// Keep the D1 company row in step with the KV pipeline record (lib/crm.js saveCrm calls this).
export async function mirrorCompany(env, rec) {
  if (!rec || !(await ensureSchema(env))) return null;
  const t = rec.updated || now();
  const num = v => (v === "" || v == null ? null : Math.round(+v) || 0);
  await env.CRM.prepare(
    `INSERT INTO companies (key, name, website, stage, value, monthly, package, retainer, source, follow_up, lost_reason, created, updated)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
     ON CONFLICT(key) DO UPDATE SET name = COALESCE(excluded.name, companies.name), website = COALESCE(excluded.website, companies.website),
       stage = excluded.stage, value = excluded.value, monthly = excluded.monthly, package = excluded.package, retainer = excluded.retainer,
       source = COALESCE(excluded.source, companies.source), follow_up = excluded.follow_up, lost_reason = excluded.lost_reason, updated = excluded.updated`
  ).bind(rec.key, str(rec.business, 160), str(rec.website, 300), str(rec.stage, 40), num(rec.value), num(rec.monthly), str(rec.package, 80),
    str(rec.retainer, 80), str(rec.source, 120), str(rec.follow_up, 10), str(rec.lost_reason, 300), rec.created || t, t).run();
  // A pipeline record that names a person adds them as a contact at that company
  if (rec.email || rec.phone || rec.contact_name) {
    await upsertContact(env, { name: rec.contact_name, email: rec.email, phone: rec.phone, website: rec.website || (rec.key.startsWith("name:") ? "" : rec.key), business: rec.business, source: "pipeline" }, t);
  }
  return true;
}

// ---------- reads for the dashboard ----------

export async function listContacts(env, { q = "", filter = "all", limit = 100, offset = 0 } = {}) {
  if (!(await ensureSchema(env))) return null;
  const where = [], args = [];
  const s = String(q || "").trim().toLowerCase().slice(0, 100);
  if (s) {
    const digits = s.replace(/\D/g, "");
    args.push(`%${s}%`);
    let clause = `(lower(c.name) LIKE ?${args.length} OR lower(c.email) LIKE ?${args.length} OR lower(co.name) LIKE ?${args.length} OR lower(co.website) LIKE ?${args.length}`;
    if (digits.length >= 3) { args.push(`%${digits}%`); clause += ` OR replace(c.phone, '+', '') LIKE ?${args.length}`; }
    where.push(clause + ")");
  }
  if (filter === "calls") where.push(`EXISTS (SELECT 1 FROM interactions i WHERE i.contact_id = c.id AND i.type = 'call')`);
  if (filter === "urgent") where.push(`EXISTS (SELECT 1 FROM interactions i WHERE i.contact_id = c.id AND i.urgency IN ('high','urgent') AND i.at >= datetime('now','-14 days'))`);
  if (filter === "tasks") where.push(`EXISTS (SELECT 1 FROM tasks k WHERE k.contact_id = c.id AND k.done_at IS NULL)`);
  if (filter === "clients") where.push(`c.tags LIKE '%"client"%'`);
  args.push(Math.min(Math.max(+limit || 100, 1), 500), Math.max(+offset || 0, 0));
  const sql = `SELECT c.id, c.name, c.email, c.phone, c.tags, c.status, c.last_activity, c.created, co.name AS company, co.website, co.stage,
      (SELECT type FROM interactions i WHERE i.contact_id = c.id ORDER BY at DESC LIMIT 1) AS last_type,
      (SELECT COUNT(*) FROM tasks k WHERE k.contact_id = c.id AND k.done_at IS NULL) AS open_tasks
    FROM contacts c LEFT JOIN companies co ON co.id = c.company_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY COALESCE(c.last_activity, c.created) DESC LIMIT ?${args.length - 1} OFFSET ?${args.length}`;
  const { results } = await env.CRM.prepare(sql).bind(...args).all();
  return results.map(r => ({ ...r, tags: parseTags(r.tags) }));
}

export async function getContact(env, id) {
  if (!(await ensureSchema(env))) return null;
  const c = await env.CRM.prepare(`SELECT * FROM contacts WHERE id = ?1`).bind(+id).first();
  if (!c) return { contact: null };
  const [company, timeline, tasks, others] = await Promise.all([
    c.company_id ? env.CRM.prepare(`SELECT * FROM companies WHERE id = ?1`).bind(c.company_id).first() : null,
    env.CRM.prepare(`SELECT * FROM interactions WHERE contact_id = ?1 ORDER BY at DESC LIMIT 300`).bind(c.id).all().then(r => r.results),
    env.CRM.prepare(`SELECT * FROM tasks WHERE contact_id = ?1 ORDER BY done_at IS NOT NULL, due IS NULL, due, id DESC`).bind(c.id).all().then(r => r.results),
    c.company_id ? env.CRM.prepare(`SELECT id, name, email, phone FROM contacts WHERE company_id = ?1 AND id <> ?2 LIMIT 20`).bind(c.company_id, c.id).all().then(r => r.results) : []
  ]);
  return { contact: { ...c, tags: parseTags(c.tags) }, company, timeline: timeline.map(withMeta), tasks, coworkers: others };
}

const withMeta = r => ({ ...r, meta: r.meta ? (() => { try { return JSON.parse(r.meta); } catch { return null; } })() : null });

export async function activity(env, { type = "", limit = 100, before = "" } = {}) {
  if (!(await ensureSchema(env))) return null;
  const where = [], args = [];
  if (TYPES.includes(type)) { args.push(type); where.push(`i.type = ?${args.length}`); }
  if (before) { args.push(isoOr(before, now())); where.push(`i.at < ?${args.length}`); }
  args.push(Math.min(Math.max(+limit || 100, 1), 300));
  const { results } = await env.CRM.prepare(
    `SELECT i.id, i.contact_id, i.type, i.direction, i.at, i.title, i.summary, substr(i.body, 1, 240) AS snippet, i.url, i.duration, i.urgency, i.outcome,
       c.name, c.email, c.phone, co.name AS company
     FROM interactions i LEFT JOIN contacts c ON c.id = i.contact_id LEFT JOIN companies co ON co.id = i.company_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY i.at DESC LIMIT ?${args.length}`
  ).bind(...args).all();
  return results;
}

export async function stats(env) {
  if (!(await ensureSchema(env))) return null;
  const q = sql => env.CRM.prepare(sql).first().then(r => (r ? Object.values(r)[0] : 0));
  const [contacts, calls7, urgent14, openTasks, overdue] = await Promise.all([
    q(`SELECT COUNT(*) FROM contacts`),
    q(`SELECT COUNT(*) FROM interactions WHERE type = 'call' AND at >= datetime('now','-7 days')`),
    q(`SELECT COUNT(*) FROM interactions WHERE urgency IN ('high','urgent') AND at >= datetime('now','-14 days')`),
    q(`SELECT COUNT(*) FROM tasks WHERE done_at IS NULL`),
    q(`SELECT COUNT(*) FROM tasks WHERE done_at IS NULL AND due IS NOT NULL AND due < date('now')`)
  ]);
  return { contacts, calls7, urgent14, openTasks, overdue };
}

// ---------- edits from the dashboard ----------

export async function updateContact(env, id, patch = {}) {
  if (!(await ensureSchema(env))) return null;
  const c = await env.CRM.prepare(`SELECT * FROM contacts WHERE id = ?1`).bind(+id).first();
  if (!c) return { error: "Contact not found." };
  const email = "email" in patch ? normEmail(patch.email) : c.email;
  if ("email" in patch && patch.email && !email) return { error: "That email doesn't look right." };
  if (email && email !== c.email) {
    const other = await env.CRM.prepare(`SELECT id FROM contacts WHERE email = ?1 AND id <> ?2`).bind(email, c.id).first();
    if (other) return { error: "Another contact already has that email." };
  }
  const phone = "phone" in patch ? normPhone(patch.phone) : c.phone;
  if ("phone" in patch && patch.phone && !phone) return { error: "That phone number doesn't look right." };
  let companyId = c.company_id;
  if ("business" in patch || "website" in patch) {
    const company = companyId ? await env.CRM.prepare(`SELECT * FROM companies WHERE id = ?1`).bind(companyId).first() : null;
    const website = "website" in patch ? patch.website : company?.website;
    const business = "business" in patch ? patch.business : company?.name;
    companyId = (website || business) ? await upsertCompany(env, { website, business }, now()) : null;
  }
  const status = ["open", "customer", "closed", "do_not_contact"].includes(patch.status) ? patch.status : c.status;
  const tags = "tags" in patch ? cleanTags(patch.tags) : parseTags(c.tags);
  await env.CRM.prepare(
    `UPDATE contacts SET name = ?2, email = ?3, phone = ?4, title = ?5, company_id = ?6, status = ?7, tags = ?8, updated = ?9 WHERE id = ?1`
  ).bind(c.id, "name" in patch ? str(patch.name, 120) : c.name, email, phone, "title" in patch ? str(patch.title, 120) : c.title,
    companyId, status, JSON.stringify(tags), now()).run();
  return getContact(env, c.id);
}

export async function deleteContact(env, id) {
  if (!(await ensureSchema(env))) return null;
  await env.CRM.batch([
    env.CRM.prepare(`DELETE FROM interactions WHERE contact_id = ?1`).bind(+id),
    env.CRM.prepare(`DELETE FROM tasks WHERE contact_id = ?1`).bind(+id),
    env.CRM.prepare(`DELETE FROM contacts WHERE id = ?1`).bind(+id)
  ]);
  return { ok: true };
}

export async function saveTask(env, { id, contact_id, title, due, done } = {}) {
  if (!(await ensureSchema(env))) return null;
  const d = str(due, 10);
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: "Use a date like 2026-11-20." };
  if (id) {
    const t = await env.CRM.prepare(`SELECT * FROM tasks WHERE id = ?1`).bind(+id).first();
    if (!t) return { error: "Task not found." };
    await env.CRM.prepare(`UPDATE tasks SET title = ?2, due = ?3, done_at = ?4 WHERE id = ?1`).bind(t.id, str(title, 300) || t.title,
      due === undefined ? t.due : d, done === undefined ? t.done_at : (done ? (t.done_at || now()) : null)).run();
    return { ok: true, id: t.id };
  }
  if (!str(title, 300)) return { error: "Give the task a title." };
  const c = contact_id ? await env.CRM.prepare(`SELECT id, company_id FROM contacts WHERE id = ?1`).bind(+contact_id).first() : null;
  const r = await env.CRM.prepare(`INSERT INTO tasks (contact_id, company_id, title, due, created) VALUES (?1, ?2, ?3, ?4, ?5)`)
    .bind(c ? c.id : null, c ? c.company_id : null, str(title, 300), d, now()).run();
  return { ok: true, id: r.meta.last_row_id };
}

export async function deleteTask(env, id) {
  if (!(await ensureSchema(env))) return null;
  await env.CRM.prepare(`DELETE FROM tasks WHERE id = ?1`).bind(+id).run();
  return { ok: true };
}

export async function listTasks(env, { open = true } = {}) {
  if (!(await ensureSchema(env))) return null;
  const { results } = await env.CRM.prepare(
    `SELECT k.*, c.name, c.email, c.phone, co.name AS company FROM tasks k LEFT JOIN contacts c ON c.id = k.contact_id LEFT JOIN companies co ON co.id = k.company_id
     ${open ? "WHERE k.done_at IS NULL" : ""} ORDER BY k.due IS NULL, k.due, k.id DESC LIMIT 500`
  ).all();
  return results;
}

// ---------- one-time import of what the site has stored in KV so far ----------

async function kvAll(env, prefix, max = 5000) {
  const out = [];
  let cursor;
  do {
    const r = await env.REPORTS.list({ prefix, cursor });
    out.push(...r.keys.map(k => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor && out.length < max);
  return out;
}

export async function importFromKV(env) {
  if (!(await ensureSchema(env)) || !env.REPORTS) return null;
  const counts = { pipeline: 0, scores: 0, forms: 0, intakes: 0, clients: 0, messages: 0, skipped: 0 };
  const each = async (prefix, fn) => {
    for (const key of await kvAll(env, prefix)) {
      const v = await env.REPORTS.get(key, "json");
      if (!v) continue;
      try { await fn(v, key); } catch { counts.skipped++; }
    }
  };
  await each("crm:", async v => { await mirrorCompany(env, v); counts.pipeline++; });
  await each("lead:", async (v, key) => {
    const r = await recordInteraction(env, { type: "score", at: v.at, external_id: key, source: "free score",
      contact: { name: v.name, email: v.email, phone: v.phone, business: v.business, website: v.site },
      title: `Unlocked free score${v.overall?.score != null ? `: ${v.overall.score}/100` : ""}`, summary: v.site ? `Website: ${v.site}` : null,
      meta: { reportId: v.reportId, grade: v.overall?.grade || null } });
    if (r && !r.duplicate) counts.scores++;
  });
  await each("contact:", async (v, key) => {
    const r = await recordInteraction(env, { type: "form", at: v.at, external_id: key, source: "contact form",
      contact: { name: v.name, email: v.email, phone: v.phone, business: v.business, website: v.website },
      title: v.topic ? `Contact form: ${v.topic}` : "Contact form", body: v.message || null });
    if (r && !r.duplicate) counts.forms++;
  });
  await each("intake:", async (v, key) => {
    const r = await recordInteraction(env, { type: "intake", at: v.at, external_id: key, source: "audit intake",
      contact: { name: v.name, email: v.email, phone: v.phone, business: v.business, website: v.website },
      title: "Growth Audit intake", summary: [v.goal && `Goal: ${v.goal}`, v.services && `Services: ${v.services}`, v.towns && `Towns: ${v.towns}`].filter(Boolean).join("\n") || null,
      body: v.notes || null });
    if (r && !r.duplicate) counts.intakes++;
  });
  await each("client:", async v => {
    const id = await upsertContact(env, { name: v.name, email: v.email, business: v.business, tags: ["client"], source: "client portal" });
    if (id) counts.clients++;
  });
  await each("msg:", async (v, key) => {
    const r = await recordInteraction(env, { type: "message", at: v.at, external_id: key, source: "client portal",
      contact: { email: v.email, business: v.business }, title: "Portal message", body: v.text || v.message || null });
    if (r && !r.duplicate) counts.messages++;
  });
  return counts;
}

// ---------- voice agent helpers ----------

export async function logToolCall(env, { agent = "voice", tool, summary = "", ok = true, error = "" }) {
  if (!(await ensureSchema(env))) return null;
  await env.CRM.prepare(`INSERT INTO agent_tool_calls (agent, tool, summary, ok, error, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(String(agent).slice(0, 40), String(tool).slice(0, 80), str(summary, 500), ok ? 1 : 0, str(error, 500), now()).run();
  return true;
}

export async function recentToolCalls(env, limit = 100) {
  if (!(await ensureSchema(env))) return null;
  const { results } = await env.CRM.prepare(`SELECT * FROM agent_tool_calls ORDER BY id DESC LIMIT ?1`).bind(Math.min(+limit || 100, 500)).all();
  return results;
}

// What a caller has done before, for the voice agent to greet them in context. Matches by email, then phone.
export async function callerHistory(env, { phone, email } = {}) {
  if (!(await ensureSchema(env))) return null;
  const e = normEmail(email), p = normPhone(phone);
  let c = null;
  if (e) c = await env.CRM.prepare(`SELECT * FROM contacts WHERE email = ?1`).bind(e).first();
  if (!c && p) c = await env.CRM.prepare(`SELECT * FROM contacts WHERE phone = ?1 ORDER BY last_activity DESC LIMIT 1`).bind(p).first();
  if (!c) return { found: false };
  const [company, recent, counts, openTasks] = await Promise.all([
    c.company_id ? env.CRM.prepare(`SELECT name, website, stage FROM companies WHERE id = ?1`).bind(c.company_id).first() : null,
    env.CRM.prepare(`SELECT type, at, title, outcome FROM interactions WHERE contact_id = ?1 ORDER BY at DESC LIMIT 4`).bind(c.id).all().then(r => r.results),
    env.CRM.prepare(`SELECT type, COUNT(*) n FROM interactions WHERE contact_id = ?1 GROUP BY type`).bind(c.id).all().then(r => r.results),
    env.CRM.prepare(`SELECT COUNT(*) n FROM tasks WHERE contact_id = ?1 AND done_at IS NULL`).bind(c.id).first().then(r => r ? r.n : 0)
  ]);
  return { found: true, contact_id: c.id, name: c.name, email: c.email, phone: c.phone, status: c.status, tags: parseTags(c.tags),
    company: company ? { name: company.name, website: company.website, stage: company.stage } : null,
    counts: Object.fromEntries(counts.map(x => [x.type, x.n])), recent, open_tasks: openTasks };
}

export async function addTaskFor(env, contactId, title, due) {
  return saveTask(env, { contact_id: contactId, title, due });
}
