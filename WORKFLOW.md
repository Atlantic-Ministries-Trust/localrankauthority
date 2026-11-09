# How changes go live

Three stages, always in this order. GitHub holds all of them, so GitHub is the backup.

| Stage | Branch | Address | Who sees it |
|---|---|---|---|
| Experiment (optional) | any new branch, e.g. `try-new-homepage` | `https://try-new-homepage.localrankauthority.pages.dev` | Only people with the link |
| Staging | `staging` | https://staging.localrankauthority.pages.dev | Only people with the link |
| Live | `main` | https://localrankauthority.com | Everyone |

Cloudflare Pages builds every branch on push with `bash design/build.sh`. On `main` it builds the live site; on every other
branch it builds the staging version (orange "Staging preview" banner and the draft notes). The pages in `docs/` that the
build writes are not committed; edit the sources in `design/` instead. Hand-made files in `docs/` (assets, `_headers`,
`robots.txt`, `admin/`, `portal/`, `audit-intake.html`, `comprehensive-audit.html`) are committed as usual.

## 1. Try something (optional)

```bash
git checkout staging && git pull
git checkout -b try-something
# edit, then
bash design/build.sh          # builds docs/ locally to preview
git commit -am "Try something" && git push -u origin try-something
```

Keep it: merge it into `staging` (step 2). Drop it: `git push origin --delete try-something`.

## 2. Staging

```bash
git checkout staging && git pull
git merge try-something        # or commit small changes straight to staging
git push
```

Check https://staging.localrankauthority.pages.dev. Nothing here reaches customers.

## 3. Go live (Michael says go)

```bash
git checkout main && git pull
git merge --ff-only staging    # live becomes exactly what was tested on staging
git push
git tag -a live-YYYY-MM-DD -m "What went live" && git push origin live-YYYY-MM-DD
git checkout staging
```

Never edit `main` directly; every live change comes through `staging`. If `--ff-only` refuses, `main` has
something `staging` doesn't: run `git checkout staging && git merge main && git push` first, then try again.

## Restore points

Every go-live gets a `live-YYYY-MM-DD` tag (`git tag -l "live-*"` lists them). To put the live site back:

- **Fastest:** Cloudflare dashboard → localrankauthority → Deployments → pick an older Production deployment → Rollback.
- **In Git:** `git checkout main && git revert --no-edit <bad commit>` (or reset to a tag), push, and Cloudflare redeploys.

## Phone and chat Miles

Their live settings are in the xAI console (phone) and DM Champ (chat), not in this repo. The repo keeps matching copies in
`design/voice-agent/instructions.md` and `design/chat-agent/`. Update both when either changes.
