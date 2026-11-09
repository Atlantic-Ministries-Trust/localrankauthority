// Weekly lessons: how both Miles agents (phone and website chat) learn from real conversations without anyone
// editing the website. Lessons live in the CRM database (D1, env.CRM) and are merged into the phone agent's
// knowledge base at the moment it searches, so an approved lesson works on the next call with no deploy.
//
// Two kinds, with different rules (design/lessons/README.md):
//   "keywords": extra search words for an EXISTING answer, so Miles finds it when callers phrase things differently.
//               The answer text can't change, so these apply automatically and show in the weekly email to undo.
//   "answer":   a new question and answer. Always waits for Michael to approve, edit, or reject it in /admin → Lessons.
//   "question": a question only Michael can answer (nothing on the website covers it). Waits for him to write the answer.
//
// The weekly job (a drafter agent plus a separate checker agent on Michael's Mac) reads inputs() through /api/agent
// and sends drafts to propose(). The server re-checks every draft below, whatever the agents said.
import { esc, sendEmail } from "./audit.js";
import { ensureSchema } from "./crmdb.js";
import { VOICE_KB } from "./voicekb.js";

const SITE = "https://localrankauthority.com";
const now = () => new Date().toISOString();
const s = (v, max = 2000) => (v == null ? "" : String(v).trim().slice(0, max));
const norm = q => s(q, 300).toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim();

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kb_lessons (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, question TEXT NOT NULL, answer TEXT, tags TEXT, target_q TEXT,
     status TEXT NOT NULL, evidence TEXT, checker TEXT, week TEXT, created TEXT NOT NULL, decided_at TEXT, note TEXT)`,
  `CREATE INDEX IF NOT EXISTS kb_lessons_status ON kb_lessons(status, created)`
];
let ready = false;
async function ensure(env) {
  if (!(await ensureSchema(env))) return false;
  if (!ready) { await env.CRM.batch(SCHEMA.map(q => env.CRM.prepare(q))); ready = true; }
  return true;
}

// ---------- live knowledge base ----------

let cache = { at: 0, kb: null };
export function clearKbCache() { cache = { at: 0, kb: null }; }

// The generated knowledge base plus every live lesson. Cached for a minute per worker.
export async function liveKb(env) {
  if (cache.kb && Date.now() - cache.at < 60000) return cache.kb;
  let rows = [];
  try {
    if (await ensure(env)) rows = (await env.CRM.prepare(`SELECT kind, question, answer, tags, target_q FROM kb_lessons WHERE status IN ('approved', 'auto') ORDER BY id`).all()).results;
  } catch (e) { console.log("lessons kb", e && e.message); }
  const kb = VOICE_KB.map(e => ({ ...e }));
  for (const r of rows) {
    if (r.kind === "keywords") {
      const e = kb.find(x => x.q === r.target_q);
      if (e) e.tags = `${e.tags || ""} ${r.tags}`.trim();
    } else if (r.kind === "answer" && r.answer) {
      kb.push({ q: r.question, a: r.answer, tags: `${r.tags || ""} lesson`.trim() });
    }
  }
  cache = { at: Date.now(), kb };
  return kb;
}

// ---------- what the weekly job reads ----------

const KB_MISS = /^KB: no match for "(.*)"$/;
const KB_HIT = /^KB: "(.*)" → (\d+) answers$/;

// The last `days` days of questions the agents struggled with. Questions only: no names, phones, or emails.
export async function inputs(env, { days = 7 } = {}) {
  if (!(await ensure(env))) return { error: "The CRM database isn't connected." };
  const since = new Date(Date.now() - Math.min(Math.max(+days || 7, 1), 60) * 86400000).toISOString();
  const calls = (await env.CRM.prepare(`SELECT summary, created FROM agent_tool_calls WHERE tool = 'search_knowledge_base' AND created >= ?1 ORDER BY id`).bind(since).all()).results;
  const misses = [], searches = [];
  for (const c of calls) {
    const m = KB_MISS.exec(c.summary || ""), h = KB_HIT.exec(c.summary || "");
    if (m) misses.push({ query: m[1], at: c.created });
    else if (h) searches.push({ query: h[1], answers: +h[2], at: c.created });
  }
  const recaps = (await env.CRM.prepare(`SELECT type, at, title, outcome, meta FROM interactions WHERE at >= ?1 AND type IN ('call', 'chat') ORDER BY at`).bind(since).all()).results;
  const open_questions = [], told_them = [], chats = [];
  for (const r of recaps) {
    let meta = {};
    try { meta = JSON.parse(r.meta || "{}") || {}; } catch {}
    if (r.type === "call" && meta.tool === "log_call_recap") {
      for (const q of meta.open_questions || []) open_questions.push({ question: s(q, 300), call_topic: s(r.title, 120), at: r.at });
      for (const t of meta.told_them || []) told_them.push({ said: s(t, 300), at: r.at });
    }
    if (r.type === "chat") chats.push({ topic: s(r.title, 160), outcome: s(r.outcome, 120), at: r.at });
  }
  const lessons = (await env.CRM.prepare(`SELECT id, kind, question, target_q, status FROM kb_lessons WHERE status <> 'reverted' ORDER BY id DESC LIMIT 300`).all()).results;
  return {
    since, misses, searches, open_questions, told_them, chats,
    existing_lessons: lessons,
    knowledge_base_questions: VOICE_KB.map(e => e.q),
    note: "misses = searches that found nothing. open_questions = things the phone agent told the caller it couldn't answer. " +
      "told_them = what the agent actually said on calls (check these for anything wrong or unapproved). chats appear once DM Champ is connected."
  };
}

// ---------- drafts from the weekly job ----------

const MONEY = /\$\s?\d[\d,]*(\.\d+)?/g;
// Published prices only: the Growth Audit, and the branding packages on /packages#branding
const ALLOWED_MONEY = new Set(["$2,000", "$2000", "$500", "$5,500", "$5500", "$12,000", "$12000"]);
const RISKY = /\b(guarantee[ds]?|guaranteed|promise[ds]?|#1|number one|first page|top spot|100%|always rank|never fail|refund)\b/i;

// Every reason the server won't accept a draft, whatever the checker agent said
function problems(d, kb) {
  const p = [];
  if (!d.checker || d.checker.passed !== true) p.push("the checker agent didn't pass it");
  if (d.kind === "keywords") {
    if (!kb.some(e => e.q === d.target_q)) p.push("target_q isn't an existing knowledge-base question");
    if (!/^[a-z0-9$' ]{2,80}$/i.test(s(d.tags, 200))) p.push("tags must be plain words, 80 characters at most");
    if (s(d.tags).split(/\s+/).length > 10) p.push("at most 10 tag words");
  } else if (d.kind === "answer") {
    if (s(d.question).length < 8) p.push("question is too short");
    if (s(d.answer).length < 20 || s(d.answer).length > 800) p.push("answer must be 20 to 800 characters");
    const money = (s(d.answer).match(MONEY) || []).filter(m => !ALLOWED_MONEY.has(m.replace(/\s/g, "")));
    if (money.length) p.push(`mentions a price that isn't approved (${money.join(", ")})`);
    if (RISKY.test(s(d.answer))) p.push("uses promise or guarantee language");
    if (!Array.isArray(d.checker?.sources) || !d.checker.sources.length) p.push("no source given for the facts in it");
  } else if (d.kind === "question") {
    if (s(d.question).length < 8) p.push("question is too short");
  } else p.push('kind must be "keywords", "answer", or "question"');
  return p;
}

export async function propose(env, waitUntil, { drafts = [], week = "", notes = [] } = {}) {
  if (!(await ensure(env))) return { error: "The CRM database isn't connected." };
  if (!Array.isArray(drafts)) return { error: "Send drafts as a list." };
  const kb = VOICE_KB;
  const open = (await env.CRM.prepare(`SELECT kind, question, target_q, tags FROM kb_lessons WHERE status IN ('pending', 'approved', 'auto')`).all()).results;
  const out = { auto_applied: [], waiting_for_michael: [], refused: [], duplicates: [] };
  const t = now();
  for (const d of drafts.slice(0, 40)) {
    const p = problems(d, kb);
    const label = d.kind === "keywords" ? `${s(d.tags, 80)} → ${s(d.target_q, 120)}` : s(d.question, 200);
    if (p.length) { out.refused.push({ draft: label, why: p }); continue; }
    const dup = d.kind === "keywords"
      ? open.some(o => o.kind === "keywords" && o.target_q === d.target_q && norm(o.tags) === norm(d.tags))
      : open.some(o => o.kind !== "keywords" && norm(o.question) === norm(d.question)) || kb.some(e => norm(e.q) === norm(d.question));
    if (dup) { out.duplicates.push(label); continue; }
    const status = d.kind === "keywords" ? "auto" : "pending";
    const r = await env.CRM.prepare(`INSERT INTO kb_lessons (kind, question, answer, tags, target_q, status, evidence, checker, week, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
      .bind(d.kind, d.kind === "keywords" ? s(d.target_q, 300) : s(d.question, 300), d.kind === "answer" ? s(d.answer, 800) : null,
        d.kind === "keywords" ? s(d.tags, 80).toLowerCase() : s(d.tags, 120) || null, d.kind === "keywords" ? s(d.target_q, 300) : null, status,
        JSON.stringify(d.evidence || {}).slice(0, 4000), JSON.stringify(d.checker || {}).slice(0, 4000), s(week, 20) || t.slice(0, 10), t).run();
    (status === "auto" ? out.auto_applied : out.waiting_for_michael).push({ id: r.meta.last_row_id, draft: label });
  }
  clearKbCache();
  // Things the checker noticed in what Miles actually said (wrong or unapproved), for Michael to read
  out.notes = (Array.isArray(notes) ? notes : []).map(n => s(n, 400)).filter(Boolean).slice(0, 15);
  if (out.auto_applied.length || out.waiting_for_michael.length || out.refused.length || out.notes.length) waitUntil(emailDigest(env, out).catch(e => console.log("lessons email", e && e.message)));
  return out;
}

async function emailDigest(env, out) {
  const to = String(env.OWNER_EMAIL || "").split(",")[0].trim();
  if (!to) return;
  const li = xs => `<ul>${xs.map(x => `<li>${esc(x.draft || x)}${x.why ? ` <span style="color:#8a5a00">(${esc(x.why.join("; "))})</span>` : ""}</li>`).join("")}</ul>`;
  const n = out.waiting_for_michael.length;
  const html = [
    out.notes.length ? `<p><b>Worth a look in what Miles said this week:</b></p>${li(out.notes)}` : "",
    n ? `<p><b>${n} lesson${n === 1 ? "" : "s"} waiting for you.</b> Miles won't use ${n === 1 ? "it" : "them"} until you approve.</p>${li(out.waiting_for_michael)}
      <p><a href="${SITE}/admin/#lessons" style="display:inline-block;background:#FFBE00;color:#2A1E00;padding:12px 20px;border-radius:6px;font-weight:700;text-decoration:none">Review in Lessons</a></p>` : "<p>No new answers need your approval this week.</p>",
    out.auto_applied.length ? `<p><b>Search words added automatically</b> (answers unchanged; undo any in Lessons):</p>${li(out.auto_applied)}` : "",
    out.refused.length ? `<p style="color:#55645C"><b>Blocked by the safety checks</b> (not used):</p>${li(out.refused)}` : ""
  ].join("");
  await sendEmail(env, { to, subject: n ? `Miles's weekly lessons: ${n} to review` : "Miles's weekly lessons", html });
}

// ---------- the Lessons tab in /admin ----------

export async function listLessons(env) {
  if (!(await ensure(env))) return null;
  const { results } = await env.CRM.prepare(`SELECT * FROM kb_lessons ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 300`).all();
  return results.map(r => ({ ...r, evidence: safeJson(r.evidence), checker: safeJson(r.checker) }));
}
const safeJson = t => { try { return JSON.parse(t || "{}"); } catch { return {}; } };

// approve (optionally with Michael's edits), reject, or undo (anything live goes back out of the knowledge base)
export async function decideLesson(env, { id, action, question, answer, note } = {}) {
  if (!(await ensure(env))) return { error: "The CRM database isn't connected." };
  const row = await env.CRM.prepare(`SELECT * FROM kb_lessons WHERE id = ?1`).bind(+id || 0).first();
  if (!row) return { error: "Lesson not found." };
  const t = now();
  if (action === "approve") {
    if (row.kind === "keywords" || !["pending", "rejected", "reverted"].includes(row.status)) return { error: "Only answers waiting for review can be approved." };
    const q = s(question, 300) || row.question || "", a = s(answer, 800) || row.answer || "";
    if (q.length < 8 || a.length < 20) return { error: "Add a question and a full answer first." };
    await env.CRM.prepare(`UPDATE kb_lessons SET status = 'approved', kind = 'answer', question = ?2, answer = ?3, decided_at = ?4, note = ?5 WHERE id = ?1`).bind(row.id, q, a, t, s(note, 500) || null).run();
  } else if (action === "reject") {
    await env.CRM.prepare(`UPDATE kb_lessons SET status = 'rejected', decided_at = ?2, note = ?3 WHERE id = ?1`).bind(row.id, t, s(note, 500) || null).run();
  } else if (action === "undo") {
    await env.CRM.prepare(`UPDATE kb_lessons SET status = 'reverted', decided_at = ?2 WHERE id = ?1`).bind(row.id, t).run();
  } else return { error: "Unknown action." };
  clearKbCache();
  return { ok: true };
}
