// Assessment reliability tests (Part Six of the 2026-11-09 homepage brief). Run: node --test tests/
// Each test can fail if the assessment draws the wrong conclusion, not just if text is missing.
import test from "node:test";
import assert from "node:assert/strict";
import { describeVerdict, searchRelevance, scoreFrom, completeRankings, reputationSection, overallOf, gbpSection, METHOD_VERSION } from "../lib/audit.js";
import { visibilityScore, organicPoints, reputationScore, aiShareScore, standing, rankAgreement, comparableOverall } from "../lib/scoring.js";

// Real inputs from the Marquee Moments report (Oct 27, 2026) and its homepage (fetched Nov 9, 2026)
const MM = { business: "Marquee Moments", service: "party rentals", city: "albany, ny", host: "marqueemoments.net", url: "https://marqueemoments.net/" };
const MM_PAGE = { title: "Marquee Letter Rentals | Albany & Capital Region, NY",
  metaDesc: "Rent 4ft light-up marquee letters for weddings, birthdays, and events in Albany, Saratoga, Troy, and Schenectady. Delivery, setup, and removal included. From $499.",
  h1: ["Make Your Event Unforgettable"] };
const MM_ABOUT = "Marquee Moments is a family-owned event enhancement business that specializes in providing premium, life-size illuminated marquee letters and numbers. They offer white-glove rental services—including delivery, setup, and removal—featuring customizable smart lighting and options like icons or special effects for weddings, corporate functions, and milestone celebrations. The company is based in Schenectady, New York, and serves clients across the state's Capital Region.";

test("accurate AI description is recognized (no contradictory warning)", () => {
  const v = describeVerdict(MM_ABOUT, MM, MM.host, MM_PAGE);
  assert.equal(v.status, "pass");
  for (const w of ["marquee", "letters", "schenectady"]) assert.ok(v.matched.includes(w), `should match ${w}`);
});

test("inaccurate AI description is not passed", () => {
  const wrong = "Marquee Moments is a plumbing company in Buffalo, New York that repairs water heaters and drains.";
  assert.notEqual(describeVerdict(wrong, MM, MM.host, MM_PAGE).status, "pass");
});

test("AI says it can't find the business: fail", () => {
  assert.equal(describeVerdict("I couldn't find reliable information about Marquee Moments.", MM, MM.host, MM_PAGE).status, "fail");
});

// Captured Nov 9, 2026: Bing via SerpApi with no market, query "party rentals albany, ny"
const BING_JUNK = [
  { link: "https://www.zhihu.com/question/19581089", title: "为什么这么多人把「Wikipedia」称作「wiki」？ - 知乎" },
  { link: "https://www.zhihu.com/question/24790852", title: "Wikipedia 和 Wikia 哪个是维基百科；它们和维基解密有什么联系？ - 知乎" },
  { link: "https://zhidao.baidu.com/question/1830391065414523220.html", title: "bigbang一天一天的歌词、要原版歌词和中文版翻译的如题 谢谢了" },
  { link: "https://zhidao.baidu.com/question/723469471435372885.html", title: "维基百科官方网址是什么？ - 百度知道" },
  { link: "https://www.zhihu.com/question/359009187", title: "维基百科（ Wikipedia） 为什么现在需要人捐钱 ？ - 知乎" }];
const RELEVANT = [
  { link: "https://www.capitalpartyrentals.example/", title: "Party Rentals in Albany NY | Tents, Tables, Chairs" },
  { link: "https://www.yelp.com/search?find_desc=party+rentals&find_loc=Albany", title: "Top 10 Best Party Rentals in Albany, NY" },
  { link: "https://albanyevents.example/rentals", title: "Event and party equipment rentals, Capital Region" },
  { link: "https://example.com/blog", title: "How to plan a backyard wedding" }];

test("suspicious or unrelated search response is flagged", () => {
  assert.equal(searchRelevance("party rentals albany, ny", BING_JUNK).ok, false);
});
test("relevant search response passes validation", () => {
  assert.equal(searchRelevance("party rentals albany, ny", RELEVANT).ok, true);
});

test("needs-review findings never change a score", () => {
  const base = [{ status: "pass", w: 2 }, { status: "fail", w: 2 }];
  assert.equal(scoreFrom(base), 50);
  assert.equal(scoreFrom([...base, { status: "review", w: 3 }]), 50);
  assert.equal(scoreFrom([{ status: "review", w: 3 }]), null, "a section with only review findings gets no score, not zero");
  assert.equal(scoreFrom([...base, { status: "warn", w: 0 }]), 50, "weight-0 exploratory notes don't count");
});

test("suspicious Bing results go to review and don't lower the rankings score", async () => {
  const kv = new Map();
  const env = { SERPAPI_KEY: "test", REPORTS: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; }, put: async (k, v) => kv.set(k, v) } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async u => {
    const url = new URL(String(u));
    if (url.pathname.includes("locations")) return new Response(JSON.stringify([{ target_type: "City", canonical_name: "Albany,New York,United States", gps: [-73.7, 42.6] }]));
    assert.equal(url.searchParams.get("mkt"), "en-US", "Bing must run in the US market");
    return new Response(JSON.stringify({ organic_results: BING_JUNK.map((o, i) => ({ ...o, position: i + 1 })) }));
  };
  try {
    const googleFinding = { status: "pass", title: "Google organic ranking", detail: "#2", fix: "", w: 2 };
    const report = { input: MM, sections: [{ key: "rankings", label: "Search rankings", available: true, score: 100, findings: [googleFinding],
      extra: { keyword: "party rentals albany, ny", engines: [{ engine: "Google", position: 2, competitors: [] }] } }] };
    const out = await completeRankings(report, env);
    const sec = out.sections[0];
    const bing = sec.findings.find(f => f.title.startsWith("Bing"));
    assert.equal(bing.status, "review");
    assert.equal(sec.score, visibilityScore({ organic: [2] }), "the unusable Bing data must not change the score (Google-only result stands)");
    assert.ok(!sec.extra.engines.some(e => e.engine === "Bing" && (e.competitors || []).length), "no made-up competitors from bad data");
  } finally { globalThis.fetch = realFetch; }
});

test("not-found wording says what was checked, not that the business is absent everywhere", async () => {
  const kv = new Map();
  const env = { SERPAPI_KEY: "test", REPORTS: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; }, put: async (k, v) => kv.set(k, v) } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async u => {
    const url = new URL(String(u));
    if (url.pathname.includes("locations")) return new Response(JSON.stringify([]));
    return new Response(JSON.stringify({ organic_results: RELEVANT.map((o, i) => ({ ...o, position: i + 1 })) }));
  };
  try {
    const report = { input: MM, sections: [{ key: "rankings", label: "Search rankings", available: false, score: null, findings: [] }] };
    const out = await completeRankings(report, env);
    const f = out.sections[0].findings.find(x => x.title === "Bing organic ranking");
    assert.match(f.detail, /Not found within the top \d+ results checked/);
    assert.ok(f.evidence && f.evidence.query === "party rentals albany, ny" && f.evidence.checked_at, "evidence records the query and time");
  } finally { globalThis.fetch = realFetch; }
});

test("new reports carry a method version", () => {
  assert.match(METHOD_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
});

// ---- industry-anchored scoring (lib/scoring.js) ----
test("visibility: Maps 60% / organic 40%; Map Pack presence outweighs organic", () => {
  assert.equal(visibilityScore({ mapsTop3: true, organic: [null] }), 60);
  assert.equal(visibilityScore({ mapsTop3: false, organic: [1] }), 40);
  assert.ok(visibilityScore({ mapsTop3: true, organic: [8] }) > visibilityScore({ mapsTop3: false, organic: [1] }));
  assert.equal(visibilityScore({ mapsTop3: null, organic: [] }), null, "nothing reliable measured means no score, not zero");
  assert.equal(organicPoints(null), 0);
});

test("reputation compares rating and review count with the Map Pack", () => {
  const pack = [{ rating: 4.9, reviews: 212 }, { rating: 4.6, reviews: 80 }, { rating: 4.4, reviews: 40 }];
  const strong = reputationScore({ rating: 4.9, reviews: 150 }, pack), weak = reputationScore({ rating: 4.1, reviews: 6 }, pack);
  assert.ok(strong > 85 && weak < 40, `${strong} / ${weak}`);
  assert.equal(reputationScore(null, pack), null);
  const sec = reputationSection(pack.map((p, i) => ({ ...p, rank: i + 1, title: "Comp " + i, you: false })), null);
  assert.equal(sec.available, false, "unknown rating is shown as not measured, not scored zero");
});

test("AI share of voice: named, cited, and how early", () => {
  assert.equal(aiShareScore([{ mentioned: true, cited: true, position: 0 }, { mentioned: true, cited: true, position: 0 }]), 100);
  assert.equal(aiShareScore([{ mentioned: false, cited: false, position: null }]), 0);
  const some = aiShareScore([{ mentioned: true, cited: false, position: 0.5 }, { mentioned: false, cited: false, position: null }, { mentioned: false, cited: false, position: null }]);
  assert.ok(some > 0 && some < 40, String(some));
  assert.equal(aiShareScore([]), null);
});

test("overall ignores categories that weren't measured", () => {
  assert.equal(overallOf([{ score: 80 }, { score: null }, { score: 60 }]), 70);
  assert.equal(overallOf([{ score: null }]), null);
});

test("standing is relative to the leading competitor", () => {
  assert.equal(standing(80, 75).key, "leading");
  assert.equal(standing(70, 78).key, "close");
  assert.equal(standing(55, 78).key, "behind");
  assert.equal(standing(40, 90).key, "far");
  assert.equal(standing(null, 80), null);
});

test("method check: agreement with Google's Map Pack order", () => {
  assert.deepEqual(rankAgreement([{ mapsRank: 1, score: 80 }, { mapsRank: 2, score: 70 }, { mapsRank: 3, score: 60 }]), { pairs: 3, agree: 3, rate: 1 });
  assert.equal(rankAgreement([{ mapsRank: 1, score: 50 }, { mapsRank: 2, score: 70 }]).rate, 0);
  const c = comparableOverall({ seo: 80, reputation: null, ai: 40 }, { seo: 60, reputation: 90, ai: 80 });
  assert.deepEqual(c.keys, ["seo", "ai"], "only categories measured for both sides are compared");
});

test("competitor benchmark: standing and Map Pack agreement, without extra searches", async () => {
  const { benchmarkReport } = await import("../lib/benchmark.js");
  const realFetch = globalThis.fetch; let fetches = 0;
  globalThis.fetch = async () => { fetches++; throw new Error("no network in tests"); };
  try {
    const report = { id: "t", input: { ...MM, url: "https://marqueemoments.net/" }, sections: [
      { key: "seo", score: 88 }, { key: "rankings", score: 0, extra: { engines: [{ engine: "Google", position: null, mapsTop3: false,
        organicDomains: [{ position: 1, domain: "leader.example" }, { position: 4, domain: "second.example" }],
        pack: [{ rank: 1, title: "Leader Rentals", website: "https://leader.example/", rating: 4.9, reviews: 210, you: false },
               { rank: 2, title: "Second Events", website: "https://second.example/", rating: 4.7, reviews: 90, you: false },
               { rank: 3, title: "Third Party Co", website: "", rating: 4.2, reviews: 12, you: false }] }] } },
      { key: "reputation", score: null }, { key: "ai", score: 0, extra: { share: [{ text: "Try Leader Rentals or Second Events.", sources: [] }] } }] };
    const b = await benchmarkReport(report, {});
    assert.equal(b.status, "ok");
    assert.equal(b.leader.name, "Leader Rentals");
    assert.ok(b.standing && ["behind", "far"].includes(b.standing.key), JSON.stringify(b.standing));
    assert.ok(b.competitors.every(c => c.scores.seo === null), "a website check that couldn't run is left out, not scored zero");
    assert.ok(b.check.pairs >= 1 && b.check.rate === 1, `Map Pack order should be reproduced: ${JSON.stringify(b.check)}`);
    assert.equal(fetches, 2, "only the two competitor homepages are fetched; no searches");
  } finally { globalThis.fetch = realFetch; }
});

test("reference sites (dictionaries, encyclopedias) can't pass as search results", () => {
  // Captured Nov 10, 2026: Bing (US market) for "light-up letter rentals albany, ny"
  const bing = [
    { link: "https://en.wikipedia.org/wiki/Letter_(alphabet)", title: "Letter (alphabet) - Wikipedia" },
    { link: "https://www.britannica.com/topic/letter-character", title: "Letter | Definition, History, & Facts | Britannica" },
    { link: "https://simple.wikipedia.org/wiki/Letter", title: "Letter - Simple English Wikipedia" },
    { link: "https://www.merriam-webster.com/dictionary/letter", title: "Letter Definition & Meaning - Merriam-Webster" },
    { link: "https://alphalitletters.com/", title: "Light-up letter rentals | Alpha Lit" }];
  const r = searchRelevance("light-up letter rentals albany, ny", bing);
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(searchRelevance("party rentals albany, ny", RELEVANT).ok, true, "real local results still pass");
});

// ---- Google Business Profile (free score: category + basics; the Growth Audit reviews all 14 details) ----
const PACK = [{ rank: 1, title: "LI Marquee Letter Rentals", type: "Marquee letter rental service", you: false },
              { rank: 2, title: "Three Sisters Party Co.", type: "Marquee letter rental service", you: false },
              { rank: 3, title: "Party Rentals Of Albany", type: "Party equipment rental service", you: false }];
const IN = { service: "marquee letter rentals", city: "Albany, NY" };

test("GBP: category that doesn't match the service or the leaders is flagged, generic words don't count", () => {
  const s = gbpSection({ found: true, type: "Party equipment rental service", hours: true, phone: "x", website: "https://marqueemoments.net", address: "Schenectady", query: "q", checked_at: "t" }, PACK, IN, "marqueemoments.net");
  const cat = s.findings.find(f => f.title === "Primary category");
  assert.equal(cat.status, "warn");
  assert.match(cat.detail, /Marquee letter rental service/);
});

test("GBP: matching category and all basics pass", () => {
  const s = gbpSection({ found: true, type: "Marquee letter rental service", hours: true, phone: "x", website: "https://marqueemoments.net/", address: "Schenectady", query: "q", checked_at: "t" }, PACK, IN, "marqueemoments.net");
  assert.equal(s.score, 100);
  assert.ok(s.findings.every(f => f.status === "pass"));
});

test("GBP: missing basics are named; wrong website link is flagged", () => {
  const s = gbpSection({ found: true, type: "Plumber", hours: null, phone: null, website: "https://facebook.com/joes", address: "Troy", query: "q", checked_at: "t" }, PACK, { service: "plumber", city: "Troy, NY" }, "joesplumbing.test");
  const basics = s.findings.find(f => f.title === "Profile basics");
  assert.equal(basics.status, "warn");
  assert.match(basics.detail, /3 of 5 basics found\. Missing: hours, phone/);
  assert.equal(s.findings.find(f => f.title === "Profile links to your website").status, "warn");
  assert.ok(s.extra.nudge.includes("5 of the 14"), "the free check states its scope honestly");
});

test("GBP: no profile found, or not checked yet", () => {
  const nf = gbpSection({ found: false, query: "q", checked_at: "t" }, PACK, IN, "x.test");
  assert.equal(nf.score, 0);
  assert.equal(nf.findings[0].status, "fail");
  const locked = gbpSection(null);
  assert.equal(locked.available, false);
  assert.equal(locked.score, null, "not checked yet never counts as zero");
});
