# Local Rank Authority

Website for localrankauthority.com, with a free Local Visibility Audit that shows a teaser report and unlocks the full report after a visitor enters their contact details.

## How it's organized

| Path | What it is |
|---|---|
| `docs/index.html` | The website (one page) |
| `functions/api/audit.js` | Runs an audit, saves the full report, returns only the teaser |
| `functions/api/unlock.js` | Saves the lead, emails the full report, returns it to the page |
| `functions/api/contact.js` | The "Tell us about your business" form |
| `lib/audit.js` | The audit checks, scoring, and report emails |

The site runs on **Cloudflare Pages** (free). GitHub Pages can show the page, but the audit and forms only work on Cloudflare because they need the `/api` functions.

## The audit

| Section | Source | Free limit |
|---|---|---|
| Website score | Google PageSpeed Insights (mobile) | Generous daily quota |
| SEO audit | Reads the homepage, robots.txt, and sitemap directly | Unlimited |
| Search rankings | SerpApi: Google (including map pack), Bing, DuckDuckGo | 250 searches/month; each audit uses 3 |
| AI visibility | Gemini with Google Search, Llama on Workers AI, AI crawler access | Daily free allowances |

Each section runs only when its key is set. Missing or failed sections tell the visitor the check is included in a free consultation.
Repeat audits of the same site and search within 24 hours reuse the saved report, and ranking checks stop before the monthly free allowance runs out.

## Setup on Cloudflare

1. **Create the Pages project.** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `Atlantic-Ministries-Trust/localrankauthority`.
   Framework preset: None. Build command: leave empty. Build output directory: `docs`.
2. **Storage.** Storage & Databases → KV → Create namespace `lra-reports`.
   Then in the Pages project: Settings → Bindings → Add → KV namespace → Variable name `REPORTS` → `lra-reports`.
3. **AI model.** Settings → Bindings → Add → Workers AI → Variable name `AI`.
4. **Keys.** Settings → Variables and Secrets → Add each one as type **Secret**:

   | Name | Where to get it |
   |---|---|
   | `PSI_KEY` | console.cloud.google.com → new project → APIs & Services → Library → enable **PageSpeed Insights API** → Credentials → Create API key (restrict it to that API) |
   | `GEMINI_KEY` | aistudio.google.com → Get API key |
   | `SERPAPI_KEY` | serpapi.com → free plan → Dashboard → Your API key |
   | `RESEND_KEY` | resend.com → Domains → add `localrankauthority.com` and its DNS records → API Keys |

   And these as plain text:

   | Name | Value |
   |---|---|
   | `OWNER_EMAIL` | Where leads should go |
   | `FROM_EMAIL` | `Local Rank Authority <audit@localrankauthority.com>` |
   | `SERP_MONTHLY_LIMIT` | `240` |
   | `DAILY_LIMIT_PER_VISITOR` | `5` |
5. **Redeploy** (Deployments → Retry deployment) so the settings take effect.
6. **Domain.** Custom domains → Set up → `localrankauthority.com`.

## Where leads go

Every unlock and contact form is saved in the `lra-reports` KV namespace (keys starting with `lead:` and `contact:`) and emailed to `OWNER_EMAIL` once Resend is set up. Full reports are kept for 30 days.
