// Competitor benchmark for each free score (2026-11-09). The businesses Google shows in the Map Pack for the same
// search are scored with the same checks, which gives two things:
// 1. Standing: how you compare with the leading competitor, instead of a school letter grade.
// 2. A method check: if our scores order the Map Pack businesses differently from Google, the method is flagged.
// Costs no extra searches: competitors come from the search already run. Saved separately (bench:<id>) so it can't
// collide with the unlock step writing the report.
import { seoAudit, mentions } from "./audit.js";
import { visibilityScore, reputationScore, aiShareScore, namedPosition, comparableOverall, standing, rankAgreement } from "./scoring.js";

const KEYS = ["seo", "rankings", "reputation", "ai"]; // categories we can measure the same way for competitors (no speed test: too slow to run for 3 more sites)
const hostOf = u => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

export async function benchmarkReport(report, env) {
  const google = (report.sections.find(s => s.key === "rankings")?.extra?.engines || []).find(e => e.engine === "Google");
  const pack = google?.pack || [];
  const comps = pack.filter(p => !p.you).slice(0, 3);
  if (!comps.length) return { status: "no-map-pack", at: new Date().toISOString() };
  const share = report.sections.find(s => s.key === "ai")?.extra?.share || [];
  const sec = k => report.sections.find(s => s.key === k)?.score ?? null;
  const you = Object.fromEntries(KEYS.map(k => [k, sec(k)]));

  const scored = await Promise.all(comps.map(async c => {
    const host = hostOf(c.website);
    let seo = null;
    if (c.website) { try { seo = (await seoAudit(new URL(c.website), report.input)).section.score; } catch { seo = null; } }
    const organic = host ? (google.organicDomains || []).find(o => o.domain === host || o.domain.endsWith("." + host))?.position ?? null : null;
    const rankings = visibilityScore({ mapsTop3: true, organic: [organic] });
    const others = pack.filter(p => p !== c);
    const reputation = reputationScore({ rating: c.rating, reviews: c.reviews }, others);
    const ai = share.length ? aiShareScore(share.map(a => {
      const isN = mentions(a.text, c.title, host || "x");
      const idx = t => t.indexOf(c.title.toLowerCase());
      return { mentioned: isN, cited: host ? (a.sources || []).some(s => s.toLowerCase().includes(host.split(".")[0])) : false, position: namedPosition(a.text, isN ? idx : null) };
    })) : null;
    return { name: c.title, website: c.website || null, mapsRank: c.rank, rating: c.rating, reviews: c.reviews, scores: { seo, rankings, reputation, ai } };
  }));

  const leader = scored.slice().sort((a, b) => a.mapsRank - b.mapsRank)[0];
  const cmp = comparableOverall(you, leader.scores);
  const me = pack.find(p => p.you);
  const avg = o => { const v = KEYS.map(k => o[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const ranked = [...scored.map(s => ({ name: s.name, mapsRank: s.mapsRank, score: avg(s.scores) })), ...(me ? [{ name: "You", mapsRank: me.rank, score: avg(you) }] : [])];
  return {
    status: "ok", at: new Date().toISOString(), keys: cmp.keys,
    you: { scores: you, overall: cmp.you }, leader: { name: leader.name, mapsRank: leader.mapsRank, overall: cmp.them, scores: leader.scores },
    competitors: scored, standing: standing(cmp.you, cmp.them), check: { ...rankAgreement(ranked), ranked }
  };
}

export async function saveBenchmark(report, env) {
  const b = await benchmarkReport(report, env).catch(e => ({ status: "error", error: String(e && e.message || e).slice(0, 200), at: new Date().toISOString() }));
  await env.REPORTS?.put(`bench:${report.id}`, JSON.stringify(b), { expirationTtl: 400 * 86400 });
  return b;
}
