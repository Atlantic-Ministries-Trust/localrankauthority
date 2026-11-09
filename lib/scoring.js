// Scoring formulas for the free Local Visibility Score, anchored to published industry methods (2026-11-09):
// - Search visibility: Maps 60% / organic 40%, as BrightLocal's Location Score splits visibility; Maps measured as
//   "in the top 3" like Local Falcon's Share of Local Voice (one location here, so it is a spot check, labelled as such).
// - Website: Google Lighthouse's own performance score (Google's published metric weights), not our own blend.
// - Reputation: Google rating and review count compared with the businesses in the Map Pack (Whitespark 2026:
//   "high numerical Google ratings" and "quantity of native Google reviews" are top-10 local pack factors).
// - AI visibility: share of voice across several customer questions, as Semrush and HubSpot measure it:
//   mention rate 60%, citation of your site 25%, how early you're named 15%.
// - Standing: compared with the leading Map Pack competitor instead of a school letter grade.
// Pure functions, so tests can check every conclusion (tests/assessment.test.mjs).

export const WEIGHTS = {
  visibility: { maps: 0.6, organic: 0.4 },
  ai: { mention: 0.6, citation: 0.25, position: 0.15 },
  reputation: { rating: 0.5, reviews: 0.5 }
};

const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

// Organic position to points: page-one positions earn most of the clicks
export function organicPoints(pos) {
  if (!pos) return 0;
  if (pos === 1) return 100;
  if (pos === 2) return 90;
  if (pos === 3) return 80;
  if (pos <= 5) return 60;
  if (pos <= 10) return 40;
  return 0;
}

// mapsTop3: true/false, or null when the search showed no Map Pack. organic: positions (null = not in the results checked)
// from the engines whose results were usable. Returns null when there's nothing reliable to score.
export function visibilityScore({ mapsTop3 = null, organic = [] }) {
  const org = organic.length ? organic.reduce((s, p) => s + organicPoints(p), 0) / organic.length : null;
  if (mapsTop3 == null && org == null) return null;
  if (mapsTop3 == null) return clamp(org);
  if (org == null) return mapsTop3 ? 100 : 0;
  return clamp(WEIGHTS.visibility.maps * (mapsTop3 ? 100 : 0) + WEIGHTS.visibility.organic * org);
}

// Star rating to points: buyers filter hard below ~4.0
export function ratingPoints(r) {
  if (r == null) return null;
  if (r >= 4.8) return 100;
  if (r >= 4.5) return 85;
  if (r >= 4.2) return 70;
  if (r >= 4.0) return 55;
  if (r >= 3.5) return 30;
  return 10;
}

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

// you: { rating, reviews } (null if unknown). competitors: [{ rating, reviews }] from the Map Pack.
export function reputationScore(you, competitors = []) {
  if (!you || (you.rating == null && you.reviews == null)) return null;
  const rp = ratingPoints(you.rating);
  const med = median(competitors.map(c => c.reviews).filter(n => n != null));
  const vp = you.reviews == null ? null : med ? clamp(Math.min(1, you.reviews / med) * 100) : you.reviews >= 25 ? 100 : clamp(you.reviews * 4);
  if (rp == null) return vp;
  if (vp == null) return rp;
  return clamp(WEIGHTS.reputation.rating * rp + WEIGHTS.reputation.reviews * vp);
}

// answers: [{ mentioned: bool, cited: bool, position: 0..1 or null (0 = named first) }]
export function aiShareScore(answers) {
  if (!answers.length) return null;
  const n = answers.length;
  const mention = answers.filter(a => a.mentioned).length / n;
  const cited = answers.filter(a => a.cited).length / n;
  const pos = answers.filter(a => a.mentioned && a.position != null);
  const position = pos.length ? pos.reduce((s, a) => s + (1 - a.position), 0) / pos.length : 0;
  return clamp(100 * (WEIGHTS.ai.mention * mention + WEIGHTS.ai.citation * cited + WEIGHTS.ai.position * position));
}

// Where a business is first named in an answer, 0 (first) to 1 (last); null if not named
export function namedPosition(text, isNamed) {
  if (!isNamed) return null;
  const low = String(text || "").toLowerCase();
  const idx = isNamed(low);
  return idx < 0 ? null : Math.min(1, idx / Math.max(1, low.length));
}

// Average of the categories both sides were measured on, so a missing check never counts as zero
export function comparableOverall(a, b) {
  const keys = Object.keys(a).filter(k => a[k] != null && b[k] != null);
  if (!keys.length) return { you: null, them: null, keys };
  const avg = o => Math.round(keys.reduce((s, k) => s + o[k], 0) / keys.length);
  return { you: avg(a), them: avg(b), keys };
}

export function standing(you, leader) {
  if (you == null || leader == null) return null;
  const d = you - leader;
  if (d >= 0) return { key: "leading", label: "Leading this search", gap: d };
  if (d >= -10) return { key: "close", label: "Close to the leaders", gap: d };
  if (d >= -25) return { key: "behind", label: "Behind the leaders", gap: d };
  return { key: "far", label: "Well behind the leaders", gap: d };
}

// Method check: does our score order the businesses the way Google's Map Pack does? Counts agreeing pairs.
// ranked: [{ mapsRank (1 = first), score }]. Ties in score count as half agreement.
export function rankAgreement(ranked) {
  const r = ranked.filter(x => x.mapsRank != null && x.score != null);
  let agree = 0, pairs = 0;
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const [hi, lo] = r[i].mapsRank < r[j].mapsRank ? [r[i], r[j]] : [r[j], r[i]];
    pairs++;
    agree += hi.score > lo.score ? 1 : hi.score === lo.score ? 0.5 : 0;
  }
  return { pairs, agree, rate: pairs ? Math.round(agree / pairs * 100) / 100 : null };
}
