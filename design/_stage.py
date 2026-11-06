"""Copy the redesign into docs/ as a real, working site (for the `redesign` staging branch).

Run after _towns.py, _build.py and _lp.py:
    python3 design/_stage.py

- design/homepage-redesign.html becomes docs/index.html. The live homepage's working pieces
  (free score + unlock, AI search section, demos, contact form, and their script) are copied in
  from main's docs/index.html, with their CSS scoped under .lv so they keep their look.
- Every other draft page is copied to docs/<name>.html; ad landing pages go to docs/<slug>.html.
- Links become real site addresses (/contact, /why-us, /#book), assets load from /assets/.
"""
import re
import subprocess
from pathlib import Path

D = Path(__file__).resolve().parent
R = D.parent
OUT = R / "docs"

STAGING_NOTE = ('<div class="mocknote"><b>Staging preview</b> · not the live site yet · '
                'yellow tags still need real content</div>')


def live_home():
    """The pre-redesign homepage, kept in design/reference/legacy-live-home.html."""
    # The pre-redesign live homepage, saved at launch. Its free score, unlock flow, AI search section, demos and
    # contact form (and their script and CSS) are carried into the new homepage.
    return (D / "reference" / "legacy-live-home.html").read_text()


# ---------- links ----------
def fix_links(html):
    html = html.replace("../../docs/assets/", "/assets/").replace("../docs/assets/", "/assets/")

    def fix_href(m):
        u = m.group(1)
        u = re.sub(r"^https://localrankauthority\.com/", "/", u)
        page = re.match(r"^(?:\.\./)*([\w-]+)\.html(#[\w-]*)?$", u)
        if page:
            name, frag = page.group(1), page.group(2) or ""
            if name == "homepage-redesign":
                u = "/" + frag
            elif name.startswith("svc-"):
                u = f"/services/{name[4:]}{frag}"
            else:
                u = f"/{name}{frag}"
        return f'href="{u}"'

    # only <a> links: canonical and og:url tags keep the absolute live address
    return re.sub(r"<a\b[^>]*>", lambda a: re.sub(r'href="([^"]*)"', fix_href, a.group(0)), html)


def add_canonical(html, path):
    """Every page names its one true address, so the staging copy and old addresses never compete in search."""
    if 'rel="canonical"' in html:
        return html
    return html.replace("</title>", f'</title>\n<link rel="canonical" href="https://localrankauthority.com{path}">', 1)


WIDGET_FILE = D / "chat-agent" / "widget.html"


def add_widget(html):
    """The DM Champ chat widget: paste its embed snippet into design/chat-agent/widget.html and it goes on every page."""
    snippet = WIDGET_FILE.read_text().strip() if WIDGET_FILE.exists() else ""
    snippet = re.sub(r"<!--.*?-->", "", snippet, flags=re.S).strip()
    if not snippet.strip():
        return html
    if "</body>" in html:
        return html.replace("</body>", snippet + "\n</body>", 1)
    return html.rstrip() + "\n" + snippet + "\n"


import os
LIVE = os.environ.get("LRA_LIVE") == "1"   # LRA_LIVE=1 python3 design/_stage.py builds the production site


def set_note(html):
    if LIVE:
        html = re.sub(r'<div class="mocknote">.*?</div>\s*', "", html, count=1, flags=re.S)
        return re.sub(r'\s*<p class="draft">.*?</p>', "", html, flags=re.S)
    return re.sub(r'<div class="mocknote">.*?</div>', STAGING_NOTE, html, count=1, flags=re.S)


# ---------- scope the live CSS under .lv ----------
def _blocks(css):
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            return
        depth, k = 1, j + 1
        while depth and k < n:
            depth += {"{": 1, "}": -1}.get(css[k], 0)
            k += 1
        yield css[i:j].strip(), css[j + 1:k - 1]
        i = k


def _split_selectors(sel):
    parts, depth, cur = [], 0, ""
    for ch in sel:
        depth += {"(": 1, ")": -1, "[": 1, "]": -1}.get(ch, 0)
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    return [p.strip() for p in parts + [cur] if p.strip()]


def scope_css(css, pre=".lv"):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = []
    for sel, body in _blocks(css):
        if sel.startswith(("@media", "@supports", "@container")):
            out.append(f"{sel}{{{scope_css(body, pre)}}}")
        elif sel.startswith("@"):
            out.append(f"{sel}{{{body}}}")
        else:
            scoped = []
            for s in _split_selectors(sel):
                if s in (":root", "html", "body", "html,body"):
                    scoped.append(pre)
                elif s.startswith(("html ", "body ")):
                    scoped.append(pre + " " + s.split(" ", 1)[1])
                else:
                    scoped.append(f"{pre} {s}")
            out.append(f"{','.join(scoped)}{{{body}}}")
    return "\n".join(out)


def section(html, sid):
    return re.search(rf'<section[^>]*\bid="{sid}"[^>]*>.*?</section>', html, re.S).group(0)


def live_section(html, sid):
    """A live homepage section, with its "band" class renamed so the new design's .band styles don't leak in."""
    return re.sub(r'class="band\b', 'class="lvband', section(html, sid))


PREFILL = """<script>
/* Ad landing pages send /?url=&biz=&svc=&city=&src=#check: fill in the free score form. */
(()=>{const q=new URLSearchParams(location.search);const m={url:"a-url",biz:"a-biz",svc:"a-svc",city:"a-city"};
for(const[k,id]of Object.entries(m)){const v=q.get(k),el=document.getElementById(id);if(v&&el)el.value=v.slice(0,200);}
if(location.hash==="#check")document.getElementById("check")?.scrollIntoView();})();
</script>"""

HEADER_SCRIPT = """<script>
(function(){var h=document.querySelector('header.top');if(h)addEventListener('scroll',function(){h.classList.toggle('scrolled',scrollY>8)},{passive:true});})();
</script>"""

# Small adjustments so the live pieces sit well inside the new design.
BRIDGE_CSS = """
.lv{background:transparent}
.lv .tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
.lv .tabs button{border-radius:999px}
#book.lv{scroll-margin-top:80px}
.lv .real-jingle{grid-column:1/-1;border-top:1px solid var(--line);margin-top:6px;padding-top:18px;display:grid;gap:8px;justify-items:start}
.lv .real-jingle audio{width:100%;max-width:560px}
"""


def build_home():
    live = live_home()
    new = (D / "homepage-redesign.html").read_text()

    # head: live SEO tags + business schema, new title, redesign's FAQ schema stays
    live_head = live.split("<head>", 1)[1].split("</head>", 1)[0]
    keep = []
    for pat in [r'<meta name="description"[^>]*>', r'<link rel="canonical"[^>]*>',
                r'<meta property="og:[^>]*>', r'<meta name="twitter:[^>]*>', r'<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>']:
        keep += re.findall(pat, live_head)
    biz = re.search(r'<script type="application/ld\+json">\s*\{"@context":"https://schema.org","@graph".*?</script>', live_head, re.S).group(0)
    if '"openingHours"' not in biz:
        biz = biz.replace('"slogan":', '"openingHours":"Mo-Fr 09:00-17:00",\n  "slogan":', 1)
    new = re.sub(r"<title>.*?</title>\s*(<!--.*?-->)?",
                 "<title>Local SEO &amp; AI Search for Service Businesses | Albany, NY</title>\n" + "\n".join(keep) + "\n" + biz,
                 new, count=1, flags=re.S)
    new = new.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")

    # live CSS, scoped
    live_css = live.split("<style>", 1)[1].split("</style>", 1)[0]
    live_css = re.sub(r"(?<![\w-])\.band\b", ".lvband", live_css)
    new = new.replace("</style>", "\n/* ---- live homepage components, scoped under .lv ---- */\n"
                      + scope_css(live_css) + BRIDGE_CSS + "\n</style>", 1)

    # demos: the live AI search section + live interactive demos replace the static phone mockup
    new = new.replace(section(new, "demos"),
                      '<div class="lv">\n' + live_section(live, "ai-search") + "\n" + live_section(live, "demos") + "\n</div>")

    # booking: the live free score (with unlock) and the live contact form replace the mockups
    book = re.search(r'<section class="book" id="book">.*?</section>', new, re.S).group(0)
    new = new.replace(book, '<div class="lv" id="book">\n' + live_section(live, "check") + "\n" + live_section(live, "contact") + "\n</div>")

    # scripts: header behavior + the full live script + landing-page prefill
    live_script = re.findall(r"<script>\s*\(\(\)=>\{.*?</script>", live, re.S)[-1]
    new = re.sub(r"<script>\s*\(function\(\)\{\s*var hdr=.*?</script>", lambda _: HEADER_SCRIPT + "\n" + live_script + "\n" + PREFILL, new, count=1, flags=re.S)

    return set_note(fix_links(new))


def main():
    (OUT / "index.html").write_text(add_widget(build_home()))
    written = ["index.html"]
    (OUT / "services").mkdir(exist_ok=True)
    for f in sorted(D.glob("svc-*.html")):
        (OUT / "services" / (f.name[4:])).write_text(add_widget(set_note(add_canonical(fix_links(f.read_text()), f"/services/{f.stem[4:]}"))))
        written.append("services/" + f.name[4:])
    for f in sorted(D.glob("*.html")):
        if f.name == "homepage-redesign.html" or f.name.startswith("svc-"):
            continue
        (OUT / f.name).write_text(add_widget(set_note(add_canonical(fix_links(f.read_text()), f"/{f.stem}"))))
        written.append(f.name)
    for f in sorted((D / "lp").glob("*.html")):
        if f.name == "index.html":
            continue
        (OUT / f.name).write_text(add_widget(set_note(fix_links(f.read_text()))))
        written.append(f.name)
    write_sitemap(written)
    print(f"staged {len(written)} pages into docs/")




def write_sitemap(pages):
    import datetime
    today = datetime.date.today().isoformat()
    urls = ["/"] + [f"/{p[:-5]}" for p in pages if p != "index.html"] + ["/comprehensive-audit"]
    seen, rows = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            rows.append(f"  <url><loc>https://localrankauthority.com{u}</loc><lastmod>{today}</lastmod></url>")
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + "\n".join(rows) + "\n</urlset>\n")


if __name__ == "__main__":
    main()
