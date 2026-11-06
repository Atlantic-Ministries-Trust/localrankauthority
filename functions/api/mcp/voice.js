// POST /api/mcp/voice: the tools Local Rank Authority's xAI voice agent uses during a call.
// Add in the xAI console: Voice agent → Connectors → Custom MCP server → URL https://localrankauthority.com/api/mcp/voice,
// with the header "Authorization: Bearer <VOICE_TOOL_SECRET>".
//
// Pattern borrowed from Atlantic Flagpole's Maggie (afp-final src/app/api/mcp/maggie): a small hand-written MCP server
// over HTTP (JSON-RPC 2.0: initialize, tools/list, tools/call), a shared secret, a short low-personal-data log of every
// tool use, and a log_call_recap tool, because xAI's hosted number has no call log, webhook, or recording API
// (Atlantic Flagpole's check of xAI's calls API returned 404). A call only reaches the CRM through these tools.
import { esc, json, sendEmail } from "../../../lib/audit.js";
import { saveCrm, crmKey } from "../../../lib/crm.js";
import { callerHistory, logToolCall, normEmail, normPhone, recordInteraction, saveTask } from "../../../lib/crmdb.js";
import { VOICE_KB } from "../../../lib/voicekb.js";

const PROTOCOL_VERSION = "2025-06-18";
const SITE = "https://localrankauthority.com";
const OWN_DOMAIN = /@localrankauthority\.com$/i;

// Pages the agent may email to a caller. Nothing else can be sent.
const LINKS = {
  free_score: ["Your free Local Visibility Score", `${SITE}/#book`],
  growth_audit: ["The Comprehensive Growth Audit", `${SITE}/comprehensive-audit`],
  sample_report: ["A sample Growth Audit report", `${SITE}/sample-report`],
  packages: ["Packages and pricing", `${SITE}/packages`],
  contact: ["Contact Local Rank Authority", `${SITE}/contact`],
  results: ["Results", `${SITE}/results`],
  local_seo_ai_search: ["Local SEO & AI Search", `${SITE}/services/local-seo-ai-search`],
  google_business_profile: ["Google Business Profile & Listings", `${SITE}/services/google-business-profile-listings`],
  website_design: ["Website Design", `${SITE}/services/website-design`],
  lead_capture: ["Lead Capture & Follow-Up", `${SITE}/services/lead-capture-follow-up`],
  ai_chat_agents: ["AI Chat Agents", `${SITE}/services/ai-chat-agents`],
  ai_receptionist: ["AI Receptionist", `${SITE}/services/ai-receptionist`],
  review_systems: ["Review Systems", `${SITE}/services/review-systems`],
  branding: ["Branding & Brand Identity", `${SITE}/services/branding-brand-identity`],
  custom_jingles: ["Custom Jingles", `${SITE}/services/custom-jingles`],
  ongoing_care: ["Ongoing Care & Reporting", `${SITE}/services/ongoing-care`],
  rank_and_rent: ["Rank & Rent Lead Sites", `${SITE}/services/rank-and-rent`]
};

const contactProps = {
  caller_name: { type: "string", description: "First and last name the caller gave. Leave empty if they never gave one; never guess from caller ID." },
  phone: { type: "string", description: "Best callback number the caller gave or confirmed, any format." },
  email: { type: "string", description: "Email the caller gave, read back letter by letter and confirmed." },
  email_read_back: { type: "boolean", description: "true only after you read the email back letter by letter and the caller said it is right." },
  business: { type: "string", description: "The caller's business name." },
  website: { type: "string", description: "The caller's website, if they have one." },
  town: { type: "string", description: "Town or city and state the business serves." }
};

export const TOOLS = [
  {
    name: "recall_caller_history",
    description: "Look up whether this caller has contacted Local Rank Authority before (calls, website chats, forms, free scores) by phone number or email. Call this EARLY whenever you have a phone number or email, before asking the caller to re-explain anything. If found, acknowledge it naturally (\"I see you ran a free score last week\"). If found=false, carry on normally and never mention that you looked.",
    inputSchema: { type: "object", properties: { phone: { type: "string" }, email: { type: "string" } }, required: [] }
  },
  {
    name: "search_knowledge_base",
    description: "Search Local Rank Authority's verified answers about services, prices, process, timing, and policies. Use it before answering any specific question you are not certain about. Only say what the results say; if nothing fits, offer to take a message for Michael.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "The caller's question in a few words, e.g. \"how long does SEO take\"" } }, required: ["query"] }
  },
  {
    name: "capture_lead",
    description: "Use when a caller is interested in working with Local Rank Authority: wants a quote, a proposal, the Growth Audit, a callback about a service, or to get started. BEFORE calling, collect: (1) first and last name, (2) best phone, (3) email read back letter by letter, (4) business name and website if they have one, (5) town, (6) what they want in their words. Michael follows up Monday to Friday, 9 to 5 Eastern. If details are missing, the tool tells you what to ask.",
    inputSchema: { type: "object", properties: { ...contactProps,
      interest: { type: "string", description: "What they want, in their words: services, goals, problems." },
      services: { type: "array", items: { type: "string" }, description: "Services that fit, e.g. \"Local SEO & AI Search\", \"AI Receptionist\"." },
      timing: { type: "string", description: "When they want to start, if they said." },
      details_unavailable: { type: "boolean", description: "true only if the caller cannot or will not give the missing details." } }, required: ["caller_name", "interest"] }
  },
  {
    name: "take_message",
    description: "Take a message for Michael when the caller needs a person, has a question you cannot answer, is an existing client, or asks for a callback. Collect name, best phone, email read back letter by letter, business, and the message in detail first.",
    inputSchema: { type: "object", properties: { ...contactProps,
      message: { type: "string", description: "What they need, in detail." },
      urgency: { type: "string", enum: ["low", "normal", "high", "urgent"] },
      caller_asked_for_person: { type: "boolean", description: "true if they asked for Michael or a callback." },
      details_unavailable: { type: "boolean" } }, required: ["message"] }
  },
  {
    name: "escalate_to_michael",
    description: "Use ONLY for something that cannot wait for a normal callback: an existing client with an urgent problem (site down, lost leads, billing error) or an upset caller who needs Michael today. Michael is alerted right away. Try to help first; do not use this as a first resort.",
    inputSchema: { type: "object", properties: { caller_name: { type: "string" }, phone: { type: "string" }, business: { type: "string" },
      issue_summary: { type: "string", description: "Short summary of what is wrong and what they need." } }, required: ["phone", "issue_summary"] }
  },
  {
    name: "send_link_by_email",
    description: "Email the caller one page from the Local Rank Authority website, such as the free score or a service page. Only after they ask for it or agree, and only after reading the email back letter by letter.",
    inputSchema: { type: "object", properties: {
      to_email: { type: "string" }, email_read_back: { type: "boolean" }, caller_name: { type: "string" },
      link: { type: "string", enum: Object.keys(LINKS), description: "Which page to send." } }, required: ["to_email", "link"] }
  },
  {
    name: "log_call_recap",
    description: "Call this ONCE at the END of EVERY call, right after the caller says they are finished and before you close. It is the only record of the call: nothing else captures what you said. Write it from what was ACTUALLY said: never pad it, never invent a detail. Every fact, price, date, or promise you gave goes in told_them. Do not mention this tool to the caller or read the recap aloud.",
    inputSchema: { type: "object", properties: {
      call_topic: { type: "string", description: "Short title, e.g. \"Roofer in Troy wants more Google Maps calls\"." },
      caller_name: { type: "string" }, caller_phone: { type: "string" }, caller_email: { type: "string" }, business: { type: "string" }, website: { type: "string" },
      caller_wanted: { type: "string", description: "What the caller asked for, in their words." },
      told_them: { type: "array", items: { type: "string" }, description: "Every substantive thing you told the caller: facts, prices, dates, promises. One per entry. Empty if nothing." },
      actions_taken: { type: "array", items: { type: "string" }, description: "What you actually did: history looked up, lead captured, message taken, link emailed." },
      open_questions: { type: "array", items: { type: "string" }, description: "Anything you could not answer or resolve." },
      services_discussed: { type: "array", items: { type: "string" } },
      caller_mood: { type: "string", enum: ["calm", "happy", "confused", "frustrated", "angry"] },
      outcome: { type: "string", description: "How the call ended, e.g. \"Lead captured\", \"Message taken\", \"Answered questions\", \"Caller hung up\"." },
      needs_follow_up: { type: "boolean", description: "true if Michael still has to do something for this caller." }
    }, required: ["call_topic", "outcome"] }
  }
];

// ---------- helpers ----------

const s = (v, max = 2000) => (v == null ? "" : String(v).trim().slice(0, max));
const list = v => (Array.isArray(v) ? v.map(x => s(x, 500)).filter(Boolean).slice(0, 30) : []);
const text = t => ({ content: [{ type: "text", text: t }] });
const rpc = (id, result) => json({ jsonrpc: "2.0", id: id ?? null, result });
const rpcErr = (id, code, message) => json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

// The next weekday in Eastern time, as YYYY-MM-DD (today if asked and it's a weekday)
function businessDay(sameDay = false) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (!sameDay) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode("voice-mcp"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.sign("HMAC", key, enc.encode(String(v)))));
  const u = new Uint8Array(x), w = new Uint8Array(y);
  let d = u.length ^ w.length;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ w[i];
  return d === 0;
}

function ownerEmail(env) { return String(env.OWNER_EMAIL || "").split(",")[0].trim(); }

function emailOwner(env, waitUntil, subject, rows, extraHtml = "", contactId = null) {
  if (!ownerEmail(env)) return;
  const body = rows.filter(([, v]) => v && (!Array.isArray(v) || v.length)).map(([k, v]) =>
    Array.isArray(v) ? `<p><b>${esc(k)}:</b></p><ul>${v.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("");
  waitUntil(sendEmail(env, { to: ownerEmail(env), subject, html: body + extraHtml + (contactId ? `<p><a href="${SITE}/admin/#contact-${contactId}">Open in the CRM</a></p>` : "") })
    .catch(e => console.log("voice email", e && e.message)));
}

function contactFrom(a) {
  return { name: s(a.caller_name, 120), email: s(a.email || a.caller_email || a.to_email, 200), phone: s(a.phone || a.caller_phone, 40), business: s(a.business, 160), website: s(a.website, 300), source: "phone (AI receptionist)" };
}

function missingDetails(a, need) {
  const miss = [];
  if (need.includes("name") && !s(a.caller_name).includes(" ")) miss.push("their first AND last name");
  if (need.includes("phone") && !normPhone(a.phone)) miss.push("the best phone number to reach them");
  if (need.includes("email")) {
    if (!normEmail(a.email)) miss.push("their email address");
    else if (a.email_read_back !== true) miss.push("to read the email back letter by letter and have them confirm it");
  }
  return miss;
}

// Keyword search over the generated knowledge base
function searchKb(query) {
  const words = s(query, 300).toLowerCase().match(/[a-z0-9$]+/g) || [];
  const stop = new Set(["the", "a", "an", "do", "you", "i", "my", "is", "it", "to", "of", "and", "for", "how", "what", "can", "your", "are", "in", "on", "me", "does", "with", "much", "be"]);
  const terms = words.filter(w => !stop.has(w) && w.length > 1);
  if (!terms.length) return [];
  return VOICE_KB.map(e => {
    const hay = `${e.q} ${e.tags || ""}`.toLowerCase(), body = e.a.toLowerCase();
    let score = 0;
    for (const t of terms) { if (hay.includes(t)) score += 3; if (body.includes(t)) score += 1; }
    return { e, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.e);
}

// ---------- tools ----------

async function run(name, a, env, waitUntil) {
  switch (name) {
    case "recall_caller_history": {
      const h = await callerHistory(env, { phone: a.phone, email: a.email });
      if (!h) return { say: "History lookup is unavailable right now. Carry on normally.", log: "History lookup unavailable" };
      if (!h.found) return { say: "found=false. First-time caller: carry on normally and do not mention that you looked.", log: "History: first-time caller" };
      const recent = h.recent.map(r => `${r.type} on ${r.at.slice(0, 10)}: ${r.title || ""}${r.outcome ? ` (${r.outcome})` : ""}`).join("; ");
      return {
        say: `found=true. Name: ${h.name || "not on file"}. Business: ${h.company?.name || "not on file"}${h.company?.stage ? ` (stage: ${h.company.stage})` : ""}. ` +
          `Status: ${h.status}${h.tags.includes("client") ? ", existing client" : ""}. Earlier contact: ${recent || "none listed"}. Open follow-ups: ${h.open_tasks}. ` +
          "Acknowledge it naturally in one short sentence. Do not read this list out.",
        log: `History found: ${Object.entries(h.counts).map(([k, v]) => `${v} ${k}`).join(", ")}`
      };
    }

    case "search_knowledge_base": {
      const hits = searchKb(a.query);
      if (!hits.length) return { say: "No verified answer found. Do not guess. Offer to take a message so Michael can answer.", log: `KB: no match for "${s(a.query, 80)}"` };
      return { say: "Verified answers (say only what these say, in your own short words):\n" + hits.map(h => `Q: ${h.q}\nA: ${h.a}`).join("\n\n"), log: `KB: "${s(a.query, 80)}" → ${hits.length} answers` };
    }

    case "capture_lead": {
      const miss = a.details_unavailable === true ? [] : missingDetails(a, ["name", "phone", "email"]);
      if (!s(a.interest)) miss.push("what they want help with, in their words");
      if (miss.length) return { say: `Not saved yet. Ask for: ${miss.join("; ")}. Then call capture_lead again. If they cannot or will not give it, call again with details_unavailable: true.`, log: `Lead: asked for missing details (${miss.length})` };
      const contact = contactFrom(a);
      const r = await recordInteraction(env, { type: "call", title: `Phone lead: ${s(a.interest, 90)}`, urgency: "high", outcome: "Lead captured",
        summary: [s(a.interest), a.services?.length ? `Services: ${list(a.services).join(", ")}` : "", s(a.timing) && `Timing: ${s(a.timing)}`, s(a.town) && `Town: ${s(a.town)}`].filter(Boolean).join("\n"),
        contact, meta: { tool: "capture_lead", services: list(a.services), town: s(a.town), timing: s(a.timing), details_unavailable: !!a.details_unavailable } });
      if (!r) return { say: "Saving failed. Apologize, and give Michael's number: (518) 460-1010.", log: "Lead: CRM unavailable", ok: false };
      const key = crmKey(contact.website, contact.business);
      if (key) await saveCrm(env, { key, patch: { stage: "New lead", business: contact.business, website: contact.website, contact_name: contact.name, email: contact.email, phone: contact.phone, source: "Phone (AI receptionist)" }, note: `Phone lead: ${s(a.interest, 500)}`, by: "voice agent", addOnly: true });
      if (r.contact_id) await saveTask(env, { contact_id: r.contact_id, title: `Call back ${contact.name || "phone lead"} about ${s(a.interest, 80)}`, due: businessDay() });
      emailOwner(env, waitUntil, `New phone lead: ${contact.name || contact.phone}${contact.business ? ` · ${contact.business}` : ""}`,
        [["Name", contact.name], ["Business", contact.business], ["Phone", contact.phone], ["Email", contact.email], ["Website", contact.website], ["Town", s(a.town)], ["Wants", s(a.interest)], ["Services", list(a.services)], ["Timing", s(a.timing)]], "", r.contact_id);
      return { say: "Saved. Michael has it and will follow up, usually within one business day (Monday to Friday, 9 to 5 Eastern). Tell the caller that, and offer to email them the free score link meanwhile.", log: `Lead captured${contact.business ? ` (${contact.business})` : ""}` };
    }

    case "take_message": {
      const miss = a.details_unavailable === true ? [] : missingDetails(a, ["name", "phone"]);
      if (s(a.email) && normEmail(a.email) && a.email_read_back !== true && a.details_unavailable !== true) miss.push("to read the email back letter by letter and have them confirm it");
      if (miss.length) return { say: `Not saved yet. Ask for: ${miss.join("; ")}. Then call take_message again. If they cannot or will not give it, call again with details_unavailable: true.`, log: `Message: asked for missing details (${miss.length})` };
      const contact = contactFrom(a);
      const urgency = ["low", "normal", "high", "urgent"].includes(a.urgency) ? a.urgency : "normal";
      const r = await recordInteraction(env, { type: "call", title: `Message from ${contact.name || contact.phone || "a caller"}`, urgency, outcome: a.caller_asked_for_person ? "Asked for Michael" : "Message taken",
        summary: s(a.message, 4000), contact, meta: { tool: "take_message", caller_asked_for_person: !!a.caller_asked_for_person } });
      if (!r) return { say: "Saving failed. Apologize, and give Michael's number: (518) 460-1010.", log: "Message: CRM unavailable", ok: false };
      if (r.contact_id) await saveTask(env, { contact_id: r.contact_id, title: `Return call: ${contact.name || contact.phone}`, due: businessDay(urgency === "urgent" || urgency === "high") });
      emailOwner(env, waitUntil, `${urgency === "urgent" ? "URGENT · " : ""}Phone message: ${contact.name || contact.phone}`,
        [["Name", contact.name], ["Business", contact.business], ["Phone", contact.phone], ["Email", contact.email], ["Urgency", urgency], ["Message", s(a.message)]], "", r.contact_id);
      return { say: "Saved. Michael gets it right away and usually replies within one business day. Tell the caller that.", log: `Message taken (${urgency})` };
    }

    case "escalate_to_michael": {
      if (!normPhone(a.phone)) return { say: "Ask for the best phone number to reach them right away, then call escalate_to_michael again.", log: "Escalation: missing phone" };
      const contact = contactFrom(a);
      const r = await recordInteraction(env, { type: "call", title: `Urgent: ${s(a.issue_summary, 100)}`, urgency: "urgent", outcome: "Escalated to Michael",
        summary: s(a.issue_summary, 4000), contact, meta: { tool: "escalate_to_michael" } });
      if (r?.contact_id) await saveTask(env, { contact_id: r.contact_id, title: `URGENT callback: ${contact.name || contact.phone}`, due: businessDay(true) });
      emailOwner(env, waitUntil, `URGENT phone escalation: ${contact.name || contact.phone}`, [["Name", contact.name], ["Business", contact.business], ["Phone", contact.phone], ["Issue", s(a.issue_summary)]], "", r?.contact_id);
      return { say: "Michael has been alerted and will call back as soon as he can. Do not promise a specific time.", log: "Escalated to Michael" };
    }

    case "send_link_by_email": {
      const to = normEmail(a.to_email);
      const link = LINKS[a.link];
      if (!link) return { say: `That page isn't one you can send. Available: ${Object.keys(LINKS).join(", ")}.`, log: "Link: unknown page" };
      if (!to) return { say: "Ask for their email address, read it back letter by letter, then try again.", log: "Link: missing email" };
      if (a.email_read_back !== true) return { say: "Read the email back letter by letter and get a yes before sending. Then call again with email_read_back: true.", log: "Link: email not read back" };
      // At most 3 emails per address per day, so this can't be used to spam someone
      const rl = `rl-voice-mail:${to}:${new Date().toISOString().slice(0, 10)}`;
      const n = +(await env.REPORTS?.get(rl)) || 0;
      if (n >= 3) return { say: "That address already got a few links today. Offer to have Michael follow up instead.", log: "Link: daily limit reached" };
      if (env.REPORTS) await env.REPORTS.put(rl, String(n + 1), { expirationTtl: 86400 });
      const ok = await sendEmail(env, { to, subject: `${link[0]} · Local Rank Authority`,
        html: `<p>Hi${s(a.caller_name) ? " " + esc(s(a.caller_name).split(" ")[0]) : ""},</p><p>Here's the link you asked for on the phone:</p><p><a href="${link[1]}" style="display:inline-block;background:#FFBE00;color:#2A1E00;padding:12px 20px;border-radius:6px;font-weight:700;text-decoration:none">${esc(link[0])}</a></p><p>Questions? Call (518) 460-1010 or reply to this email.</p><p>Michael Carlson<br>Local Rank Authority</p>`,
        replyTo: ownerEmail(env) || undefined });
      if (!ok) return { say: "The email didn't go through. Apologize and say the link is on localrankauthority.com.", log: "Link: send failed", ok: false };
      await recordInteraction(env, { type: "email", direction: "out", title: `Emailed: ${link[0]}`, url: link[1], contact: { email: to, name: s(a.caller_name, 120), source: "phone (AI receptionist)" }, meta: { tool: "send_link_by_email" } });
      return { say: `Sent ${link[0]} to their email. Tell them it may take a minute and to check spam if they don't see it.`, log: `Link sent: ${a.link}` };
    }

    case "log_call_recap": {
      const contact = { name: s(a.caller_name, 120), email: s(a.caller_email, 200), phone: s(a.caller_phone, 40), business: s(a.business, 160), website: s(a.website, 300), source: "phone (AI receptionist)" };
      const hasPerson = contact.name || normEmail(contact.email) || normPhone(contact.phone) || contact.business;
      const told = list(a.told_them), acts = list(a.actions_taken), open = list(a.open_questions), svc = list(a.services_discussed);
      const body = [
        s(a.caller_wanted) && `Caller wanted: ${s(a.caller_wanted)}`,
        told.length && `What the agent told them:\n${told.map(x => "• " + x).join("\n")}`,
        acts.length && `Actions taken:\n${acts.map(x => "• " + x).join("\n")}`,
        open.length && `Open questions:\n${open.map(x => "• " + x).join("\n")}`,
        svc.length && `Services discussed: ${svc.join(", ")}`,
        a.caller_mood && `Caller mood: ${a.caller_mood}`
      ].filter(Boolean).join("\n\n");
      const urgency = a.needs_follow_up === true || ["frustrated", "angry"].includes(a.caller_mood) || open.length ? "high" : "normal";
      const r = await recordInteraction(env, { type: "call", title: s(a.call_topic, 200) || "Phone call", outcome: s(a.outcome, 200), urgency,
        summary: s(a.caller_wanted, 1000) || null, body, contact: hasPerson ? contact : { name: "Unknown caller", source: "phone (AI receptionist)" },
        meta: { tool: "log_call_recap", told_them: told, actions_taken: acts, open_questions: open, services: svc, mood: a.caller_mood || null, needs_follow_up: a.needs_follow_up === true } });
      if (r?.contact_id && a.needs_follow_up === true) await saveTask(env, { contact_id: r.contact_id, title: `Follow up on call: ${s(a.call_topic, 80)}`, due: businessDay() });
      emailOwner(env, waitUntil, `Call recap: ${s(a.call_topic, 80)}${a.needs_follow_up === true ? " · needs follow-up" : ""}`,
        [["Caller", [contact.name, contact.business].filter(Boolean).join(" · ")], ["Phone", contact.phone], ["Email", contact.email], ["Outcome", s(a.outcome)], ["Caller wanted", s(a.caller_wanted)],
         ["Told them", told], ["Actions", acts], ["Open questions", open], ["Mood", a.caller_mood]], "", r?.contact_id);
      return { say: "Recap saved. Close the call warmly. Do not mention the recap.", log: `Recap: ${s(a.call_topic, 80)}${a.needs_follow_up ? " (follow-up)" : ""}` };
    }

    default:
      return null;
  }
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.VOICE_TOOL_SECRET) return rpcErr(null, -32001, "Not configured");
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !(await sameSecret(token, env.VOICE_TOOL_SECRET))) return rpcErr(null, -32001, "Unauthorized");

  let b;
  try { b = await request.json(); } catch { return rpcErr(null, -32700, "Parse error"); }
  const { id, method, params } = b || {};

  if (method === "initialize") return rpc(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "lra-voice", version: "1.0.0" } });
  if (typeof method === "string" && method.startsWith("notifications/")) return new Response(null, { status: 202 });
  if (method === "ping") return rpc(id, {});
  if (method === "tools/list") return rpc(id, { tools: TOOLS });
  if (method !== "tools/call") return rpcErr(id, -32601, "Method not found");

  const name = String(params?.name || "");
  const args = params?.arguments && typeof params.arguments === "object" ? params.arguments : {};
  // Our own addresses are never the caller's (Atlantic Flagpole learned this one the hard way)
  const own = ["email", "to_email", "caller_email"].map(k => s(args[k]).toLowerCase()).find(e => e && OWN_DOMAIN.test(e));
  if (own && name !== "log_call_recap") {
    await logToolCall(env, { tool: name, summary: "Refused: caller gave our own address", ok: true }).catch(() => {});
    return rpc(id, text(`${own} is Local Rank Authority's own address, not the caller's. Nothing was saved. Ask for the email THEY use and read it back letter by letter.`));
  }
  try {
    const r = await run(name, args, env, waitUntil);
    if (!r) return rpc(id, { ...text(`Unknown tool: ${name}`), isError: true });
    await logToolCall(env, { tool: name, summary: r.log, ok: r.ok !== false }).catch(() => {});
    return rpc(id, text(r.say));
  } catch (e) {
    await logToolCall(env, { tool: name, summary: "Error", ok: false, error: e && e.message }).catch(() => {});
    return rpc(id, { ...text("Something went wrong saving that. Apologize briefly and offer Michael's number: (518) 460-1010."), isError: true });
  }
}

export const onRequestGet = () => json({ error: "This is an MCP endpoint. Use POST with JSON-RPC." }, 405);
