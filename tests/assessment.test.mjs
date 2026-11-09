// Assessment reliability tests (Part Six of the 2026-11-09 homepage brief). Run: node --test tests/
// Each test can fail if the assessment draws the wrong conclusion, not just if text is missing.
import test from "node:test";
import assert from "node:assert/strict";
import { describeVerdict, searchRelevance, scoreFrom, completeRankings, METHOD_VERSION } from "../lib/audit.js";

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
    assert.equal(sec.score, 100, "the unusable Bing data must not pull the score down");
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
