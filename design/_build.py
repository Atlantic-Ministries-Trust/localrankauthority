"""Build the redesign's inner pages from design/content/*.html.

Each content file starts with a comment block:
<!--
title: Page title for the browser tab
description: Meta description
-->
followed by the page's <main> content. Header, footer, styles and the phone
action bar are copied from homepage-redesign.html, so editing the homepage's
header or footer and re-running this script updates every page.

Run: python3 design/_build.py
"""
import re, pathlib

D = pathlib.Path(__file__).parent
HOME = "homepage-redesign.html"
home = (D / HOME).read_text()

style = re.search(r"<style>(.*?)</style>", home, re.S).group(1)
note = re.search(r'<div class="mocknote">.*?</div>', home, re.S).group(0)
header = re.search(r'<header class="top".*?</header>', home, re.S).group(0)
footer = re.search(r"<footer>.*?</footer>", home, re.S).group(0)
mbar = re.search(r'<nav class="mbar".*?</nav>', home, re.S).group(0)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>', home).group(0)

# In-page anchors on the homepage become links back to it.
def relink(html):
    return re.sub(r'href="#(?!top")', f'href="{HOME}#', html)

header = relink(header).replace('href="#top"', f'href="{HOME}"')
footer = relink(footer).replace('href="#top"', f'href="{HOME}"')
mbar = relink(mbar)

PAGE_CSS = """
/* inner pages */
.phero{padding-block:clamp(48px,7vw,88px) clamp(36px,5vw,56px);border-bottom:1px solid var(--line)}
.crumbs{font:500 14px/1.4 var(--body);color:var(--muted);margin-bottom:18px}
.crumbs a{color:var(--sign);text-decoration:none}
.phero h1{font-size:clamp(40px,5.4vw,68px);font-weight:900;letter-spacing:-.02em}
.phero .lede{margin-top:20px}
.phero .ctas{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;margin-top:30px}
.draft{background:#FFF4CC;border:1px solid #E9C766;color:#4A3800;border-radius:12px;padding:14px 18px;font-size:15px;margin-top:26px;max-width:72ch}
.draft b{font-family:var(--display)}
.prose{max-width:72ch;display:grid;gap:16px}
.prose h2{font:800 28px/1.15 var(--display);margin-top:28px}
.prose h3{font:800 20px/1.2 var(--display);margin-top:8px}
.prose ul,.prose ol{margin:0;padding-left:22px;display:grid;gap:8px}
.prose p,.prose li{color:#2B3A33}
.prose .meta{color:var(--muted);font-size:15px}
.toc{border:1px solid var(--line);border-radius:var(--r);background:var(--card);padding:20px 24px;font-size:15px}
.toc b{font:800 14px/1 var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.toc ol{margin:12px 0 0;padding-left:20px;columns:2;column-gap:32px}
.toc a{color:var(--sign)}
.two{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(32px,5vw,72px);align-items:start}
.panel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:clamp(22px,3vw,34px);display:grid;gap:16px}
.panel h2,.panel h3{font:800 22px/1.2 var(--display)}
.form{display:grid;gap:16px}
.form .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form label{display:grid;gap:7px;font:600 14px/1.2 var(--body)}
.form label span{font-weight:400;color:var(--muted)}
.form input,.form select,.form textarea{font:400 16px/1.4 var(--body);padding:13px 14px;border:1px solid #C9D2CC;border-radius:10px;background:var(--paper);color:var(--ink);width:100%;min-width:0}
.form textarea{min-height:130px;resize:vertical}
.form .fine{font-size:13.5px;color:var(--muted)}
.form .msg{font-weight:600;color:var(--sign);min-height:1.4em}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);background:var(--card)}
.tbl table{border-collapse:collapse;width:100%;min-width:620px;font-size:15px}
.tbl th,.tbl td{text-align:left;padding:14px 16px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl th{font:800 13px/1.2 var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:var(--paper)}
.tbl tr:last-child td{border-bottom:0}
.tbl td b{font-family:var(--display)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px;display:grid;gap:10px;align-content:start}
.card h3{font:800 21px/1.2 var(--display)}
.card p{color:var(--muted);font-size:15.5px}
.points{display:grid;gap:22px}
.point{display:grid;grid-template-columns:44px 1fr;gap:16px}
.point .k{width:44px;height:44px;border-radius:50%;background:var(--sign);color:var(--on-sign);display:grid;place-items:center;font:800 18px/1 var(--display)}
.point h3{font:800 21px/1.2 var(--display);margin-bottom:6px}
.point p{color:var(--muted)}
.towns{display:flex;flex-wrap:wrap;gap:8px}
.towns span,.towns a{font:500 14.5px/1 var(--body);padding:9px 13px;border-radius:999px;border:1px solid var(--line);background:var(--card);text-decoration:none}
.towns a{border-color:var(--sign);color:var(--sign);font-weight:600}
.county{display:grid;gap:12px;padding-block:22px;border-top:1px solid var(--line)}
.county h3{font:800 20px/1.2 var(--display)}
.ctaband{background:var(--sign);color:var(--on-sign)}
.ctaband .wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px}
.ctaband h2{font-size:clamp(28px,3.4vw,40px);font-weight:800;max-width:22ch}
.ctaband p{color:var(--on-sign-muted);margin-top:10px;max-width:56ch}
.ctaband .btns{display:flex;flex-wrap:wrap;gap:12px}
.sec-tight{padding-block:clamp(48px,7vw,80px)}
.mapbox{border-radius:20px;overflow:hidden;border:1px solid var(--line);background:#E4EBE6;aspect-ratio:4/3;max-width:100%}
.mapframe{display:block;width:100%;height:100%;border:0}
.compare td:nth-child(3){background:#EEF5F0}
@media (max-width:980px){.two,.cards{grid-template-columns:1fr}.toc ol{columns:1}}
@media (max-width:640px){.form .grid2{grid-template-columns:1fr}}
"""

SCRIPT = """<script>
(function(){var h=document.querySelector('header.top');addEventListener('scroll',function(){h.classList.toggle('scrolled',scrollY>8)},{passive:true});
document.querySelectorAll('form[data-mock]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var m=f.querySelector('.msg');if(m)m.textContent=f.dataset.mock})});})();
</script>"""

DOC_HEAD = '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'

def build(src):
    raw = src.read_text()
    meta = dict(re.findall(r"^(\w+):\s*(.+)$", re.search(r"<!--(.*?)-->", raw, re.S).group(1), re.M))
    body = raw.split("-->", 1)[1].strip()
    head = DOC_HEAD + f"""<title>{meta['title']}</title>
<meta name="description" content="{meta.get('description','')}">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
{fonts}
"""
    ld = re.findall(r'<script type="application/ld\+json">.*?</script>', body, re.S)
    for x in ld:
        body = body.replace(x, "")
    html = head + "\n".join(ld) + f"\n<style>{style}{PAGE_CSS}</style>\n\n{note}\n\n{header}\n\n<main>\n{body}\n</main>\n\n{footer}\n\n{mbar}\n\n{SCRIPT}\n"
    out = D / src.name
    out.write_text(html)
    return out.name

if __name__ == "__main__":
    for src in sorted((D / "content").glob("*.html")):
        print("built", build(src))
