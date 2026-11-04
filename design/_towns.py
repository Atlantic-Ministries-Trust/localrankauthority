"""Writes the town pages and the Areas We Serve hub into design/content/.
Each town page must carry real local detail; don't add towns by copying an entry
and swapping the name (Google treats near-identical town pages as doorway pages).
Run: python3 design/_towns.py && python3 design/_build.py
"""
import json, pathlib, html

D = pathlib.Path(__file__).parent / "content"
LIVE = "https://localrankauthority.com"

TOWNS = [
 dict(slug="troy", name="Troy", full="Troy, NY", county="Rensselaer County",
  lede="Troy customers search by neighborhood, and they see businesses from across the river too. We help Troy businesses show up first for the people closest to them.",
  points=[
   ("Albany businesses compete for Troy searches", "Troy sits right across the Hudson from Albany County, and many service businesses list a wide service area. A \"near me\" search in Troy often shows companies based somewhere else. A clear Troy service area, a Troy page, and reviews from Troy customers help Google pick you."),
   ("People search by neighborhood", "Customers type downtown Troy, Lansingburgh, South Troy, Brunswick, or North Greenbush. Your website and listings should use the names they use, not just \"Capital Region.\""),
   ("New residents start on Google Maps and AI", "RPI and Russell Sage bring a steady stream of people new to the area. They don't have a plumber or a dentist yet, so they ask Google Maps and AI assistants who to call."),
  ],
  nearby=["Lansingburgh","South Troy","Brunswick","North Greenbush","Watervliet","Cohoes","Wynantskill"],
  faqs=[
   ("Can a business based outside Troy rank in Troy?", "Yes, if it really serves Troy, but distance matters in Google's map results. A Troy page, a service area that includes Troy, Troy reviews, and mentions on Troy sites give you the best chance."),
   ("What should a Troy business fix first?", "Usually the Google Business Profile: the right primary category, real photos, services listed by name, and a steady flow of reviews. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="schenectady", name="Schenectady", full="Schenectady, NY", county="Schenectady County",
  lede="Schenectady customers search by town name: Niskayuna, Rotterdam, Glenville, Scotia. We make sure they find you under every name they use.",
  points=[
   ("Town names matter more than the city", "Many customers around Schenectady search for their own town. A business that only says \"Schenectady\" can miss searches in Niskayuna, Rotterdam, Glenville, and Scotia. Clear service-area pages fix that."),
   ("A busier downtown means more competition", "Proctors and Mohawk Harbor have brought more restaurants, venues, and events downtown, and more businesses competing for the same visitors' searches."),
   ("Steady new arrivals", "Union College and the area's large employers bring new residents every year. People new to town lean on Google reviews and AI recommendations to choose who to call."),
  ],
  nearby=["Niskayuna","Rotterdam","Glenville","Scotia","Duanesburg","Princetown"],
  faqs=[
   ("Should I have separate pages for Niskayuna and Rotterdam?", "If you get work there and can say something specific about it, such as projects, neighborhoods, or common jobs, yes. Thin pages that only swap the town name can hurt, so we only build ones with real content."),
   ("What should a Schenectady business fix first?", "Usually the Google Business Profile and listings, so your name, address, and phone match everywhere. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="saratoga-springs", name="Saratoga Springs", full="Saratoga Springs, NY", county="Saratoga County",
  lede="Saratoga has two markets: year-round residents and a summer wave of visitors. We help businesses get found by both.",
  points=[
   ("Track season changes everything", "During the summer meet at Saratoga Race Course, visitors search on their phones for places to eat, stay, and get things fixed. If your profile, hours, and photos aren't ready before July, you miss the busiest weeks of the year."),
   ("Visitors plan with AI", "Many visitors ask AI assistants for the best restaurants, shops, and services before they arrive. Those answers lean on \"best of\" lists, local guides, and reviews, so being named on them matters as much as your website."),
   ("Fast-growing towns nearby", "Wilton, Malta, Ballston Spa, and Gansevoort keep adding homes and families. Home service businesses that cover those towns by name pick up searches that Saratoga-only competitors miss."),
  ],
  nearby=["Wilton","Malta","Ballston Spa","Gansevoort","Greenfield Center","Milton","Round Lake"],
  faqs=[
   ("When should a Saratoga business get ready for summer?", "By spring. Google profiles, photos, posts, and seasonal hours take a few weeks to settle, and \"best of\" lists are often updated before the season starts."),
   ("Do AI assistants recommend Saratoga businesses?", "Yes, and they tend to name businesses that appear on trusted local guides and roundups with strong reviews. Our audit checks which lists AI tools cite for your service and whether you're on them."),
  ]),
 dict(slug="clifton-park", name="Clifton Park", full="Clifton Park, NY", county="Saratoga County",
  lede="Clifton Park and Halfmoon are busy suburban markets where homeowners compare reviews before they call. We help local businesses win that comparison.",
  points=[
   ("Reviews often decide the map results", "In suburban markets with many competitors, the businesses in Google's top three usually have the most recent, detailed reviews. A simple system that asks every happy customer is often the biggest win."),
   ("Clifton Park, Halfmoon, and Rexford overlap", "Customers search by whichever name is on their mailbox. Your listings and pages should cover Clifton Park, Halfmoon, Rexford, and Ballston Lake clearly."),
   ("Homeowners want a price before they call", "Contractors, landscapers, and cleaners that show price ranges or an instant estimate get more inquiries from busy homeowners comparing three companies at once."),
  ],
  nearby=["Halfmoon","Rexford","Ballston Lake","Mechanicville","Round Lake","Waterford"],
  faqs=[
   ("How many reviews does a Clifton Park business need?", "There's no fixed number. What matters is how you compare with the businesses currently in the top three for your service, and how recent your reviews are. Our audit shows those numbers side by side."),
   ("What should a Clifton Park business fix first?", "Usually reviews and the Google Business Profile. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="colonie-latham", name="Colonie and Latham", full="Colonie and Latham, NY", county="Albany County",
  lede="The Town of Colonie goes by many names: Latham, Loudonville, and mailing addresses that say Albany or Schenectady. We make sure customers find you under all of them.",
  points=[
   ("One town, many names", "Colonie includes Latham, Loudonville, and other hamlets, and many residents have Albany or Schenectady mailing addresses. Your website and listings should name the places customers actually type."),
   ("Busy retail corridors", "Wolf Road, Central Avenue, and the Latham area are crowded with stores, restaurants, and offices. Standing out there takes a complete Google profile, fresh photos, and strong reviews."),
   ("Travelers near the airport", "Albany International Airport is in Colonie, so hotels, restaurants, and auto services nearby get searches from people who have never been here and rely on maps and AI answers."),
  ],
  nearby=["Latham","Loudonville","Menands","Cohoes","Watervliet","Niskayuna"],
  faqs=[
   ("My address says Albany but I'm in Colonie. Does that matter?", "Google uses your actual location, but customers search by the names they know. Make sure your profile, website, and listings mention Colonie and Latham where they apply, and that your address matches everywhere."),
   ("What should a Colonie business fix first?", "Usually consistent listings and a complete Google profile. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="glens-falls-lake-george", name="Glens Falls and Lake George", full="Glens Falls and Lake George, NY", county="Warren County",
  lede="Lake George fills up every summer, and Glens Falls and Queensbury stay busy all year. We help businesses get found in both seasons.",
  points=[
   ("Be ready before Memorial Day", "Lake George's summer season multiplies searches for lodging, dining, boat rentals, and repairs. Profiles, photos, and seasonal hours need to be ready before visitors start planning."),
   ("Seasonal hours confuse customers", "A business that closes or changes hours for winter can look permanently closed, or open when it isn't. Keeping Google hours current protects your rating and your calls."),
   ("A year-round market too", "Glens Falls, Queensbury, and South Glens Falls have steady year-round demand for home, health, and professional services, with less competition than the Capital Region."),
  ],
  nearby=["Queensbury","South Glens Falls","Lake George Village","Bolton Landing","Hudson Falls","Fort Edward"],
  faqs=[
   ("How do I show seasonal hours on Google?", "Use your profile's regular hours for the current season and special hours for holidays, and update them when the season changes. We set reminders for our clients so this never slips."),
   ("What should a Lake George business fix first?", "Usually photos, hours, and reviews on the Google profile, then showing up on the guides visitors and AI assistants use. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="bethlehem-delmar", name="Bethlehem and Delmar", full="Bethlehem and Delmar, NY", county="Albany County",
  lede="Most customers in the Town of Bethlehem search for Delmar, Slingerlands, Glenmont, or Selkirk. We help local businesses show up for every one.",
  points=[
   ("Customers search by hamlet", "People say Delmar or Slingerlands, not \"Town of Bethlehem.\" Your listings and pages should use the hamlet names customers use."),
   ("Families compare reviews closely", "In family suburbs, people read reviews carefully and ask neighbors. Detailed, recent reviews that mention the job and the town carry a lot of weight."),
   ("Covering the Route 9W corridor", "Many service businesses here also cover Selkirk, Ravena, and Coeymans to the south. Naming those towns clearly picks up searches competitors miss."),
  ],
  nearby=["Delmar","Slingerlands","Glenmont","Selkirk","Elsmere","Ravena","Coeymans","Feura Bush"],
  faqs=[
   ("Should my listings say Delmar or Bethlehem?", "Use your official address on listings, and mention the hamlets you serve in your profile description, services, and website pages."),
   ("What should a Delmar business fix first?", "Usually reviews and a complete Google profile. The free score shows where you stand in about a minute."),
  ]),
 dict(slug="amsterdam", name="Amsterdam", full="Amsterdam, NY", county="Montgomery County",
  lede="Amsterdam and the towns of Fulton County are smaller markets where a strong online presence can put a business at the top quickly.",
  points=[
   ("Less competition online", "In smaller markets, competitors often have incomplete Google profiles and few reviews. A business that gets the basics right can often reach the top three faster than in Albany."),
   ("Customers come from Fulton County", "Many businesses here also serve Gloversville, Johnstown, and Broadalbin. Naming those towns clearly in your listings and pages brings in those searches."),
   ("Summer on the Sacandaga", "Great Sacandaga Lake brings seasonal demand for marinas, camps, contractors, and restaurants. Being ready before summer matters."),
  ],
  nearby=["Gloversville","Johnstown","Broadalbin","Fort Johnson","Hagaman","Great Sacandaga Lake"],
  faqs=[
   ("Is local SEO worth it in a smaller market?", "Often more so, because fewer competitors are doing it well. The cost of getting found is lower, and each new call matters more."),
   ("What should an Amsterdam business fix first?", "Usually the Google Business Profile and reviews. The free score shows where you stand in about a minute."),
  ]),
]

AREAS = [
 ("Albany County", ["Albany*","Colonie","Latham","Cohoes","Guilderland","Altamont","Bethlehem","Selkirk","Ravena","Coeymans Hollow"]),
 ("Rensselaer County", ["Troy","Rensselaer","East Greenbush","Nassau"]),
 ("Saratoga County", ["Saratoga Springs","Clifton Park","Rexford","Ballston Spa","Ballston Lake","Ballston Center","Round Lake","Mechanicville","Gansevoort","Greenfield Center","Milton"]),
 ("Schenectady County", ["Schenectady","Scotia"]),
 ("Warren County", ["Lake George","Glens Falls"]),
 ("Montgomery and Fulton Counties", ["Amsterdam","Gloversville","Johnstown","Broadalbin","Sacandaga Lake"]),
 ("Columbia and Greene Counties", ["Hudson","Kinderhook","Catskill"]),
 ("Ulster County", ["Saugerties"]),
]
PAGE_FOR = {"Albany*": LIVE + "/local-seo-albany-ny", "Troy": "local-seo-troy-ny.html", "Schenectady": "local-seo-schenectady-ny.html",
  "Saratoga Springs": "local-seo-saratoga-springs-ny.html", "Clifton Park": "local-seo-clifton-park-ny.html",
  "Colonie": "local-seo-colonie-latham-ny.html", "Latham": "local-seo-colonie-latham-ny.html",
  "Lake George": "local-seo-glens-falls-lake-george-ny.html", "Glens Falls": "local-seo-glens-falls-lake-george-ny.html",
  "Bethlehem": "local-seo-bethlehem-delmar-ny.html", "Amsterdam": "local-seo-amsterdam-ny.html"}

e = lambda t: html.escape(t, quote=False)

def town_page(t):
    fname = f"local-seo-{t['slug']}-ny.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "serviceType": "Local SEO and AI search visibility", "name": f"Local SEO in {t['full']}",
         "provider": {"@id": LIVE + "/#business"},
         "areaServed": [{"@type": "Place", "name": f"{x}, NY"} for x in [t["name"]] + t["nearby"]]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in t["faqs"]]}]}
    pts = "".join(f'<div class="point"><span class="k">{i}</span><div><h3>{e(h)}</h3><p>{e(p)}</p></div></div>' for i, (h, p) in enumerate(t["points"], 1))
    faqs = "".join(f"<details{' open' if i == 0 else ''}><summary>{e(q)}</summary><p>{e(a)}</p></details>" for i, (q, a) in enumerate(t["faqs"]))
    near = "".join(f"<span>{e(x)}</span>" for x in t["nearby"])
    body = f"""<!--
title: Local SEO in {t['full']} | Local Rank Authority
description: Local SEO and AI search for {t['name']} businesses: Google Maps, reviews, listings, and getting recommended by AI assistants. Free visibility score.
-->
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<section class="phero">
  <div class="wrap">
    <p class="crumbs"><a href="homepage-redesign.html">Home</a> / <a href="areas.html">Areas we serve</a> / {e(t['name'])}</p>
    <p class="eyebrow">{e(t['county'])}</p>
    <h1 style="margin-top:14px">Local SEO in {e(t['full'])}</h1>
    <p class="lede">{e(t['lede'])}</p>
    <div class="ctas"><a class="btn btn-primary" href="homepage-redesign.html#book">Get your free score</a><a class="textlink" href="contact.html">or talk to Michael</a></div>
  </div>
</section>
<section class="sec-tight">
  <div class="wrap two">
    <div class="stack">
      <p class="eyebrow">What's different about {e(t['name'])}</p>
      <h2 class="h2">What decides who gets the call</h2>
      <div class="points" style="margin-top:18px">{pts}</div>
    </div>
    <div class="panel">
      <h3>What we do for {e(t['name'])} businesses</h3>
      <ul style="margin:0;padding-left:20px;display:grid;gap:8px;color:var(--muted)">
        <li>Google Business Profile set up and kept current</li>
        <li>Service and town pages written for real customer searches</li>
        <li>Listings that match everywhere</li>
        <li>A review system that asks every happy customer</li>
        <li>Getting named in the guides and lists AI assistants use</li>
        <li>Monthly tracking of rankings, AI mentions, and calls</li>
      </ul>
      <a class="textlink" href="packages.html">See packages and pricing →</a>
    </div>
  </div>
</section>
<section class="route sec-tight">
  <div class="wrap stack">
    <p class="eyebrow">Nearby</p>
    <h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">We also help businesses serving</h2>
    <div class="towns" style="margin-top:8px">{near}</div>
    <p style="margin-top:6px"><a class="textlink" href="areas.html">See all areas we serve →</a></p>
  </div>
</section>
<section class="sec-tight">
  <div class="wrap faq">
    <div class="stack"><p class="eyebrow">Questions</p><h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">Local SEO in {e(t['name'])}</h2></div>
    <div>{faqs}</div>
  </div>
</section>
<section class="ctaband sec-tight">
  <div class="wrap">
    <div><h2>See where you rank in {e(t['name'])}</h2><p>Your free score checks your speed, SEO basics, rankings, and what AI assistants say, in about a minute.</p></div>
    <div class="btns"><a class="btn btn-primary" href="homepage-redesign.html#book">Get your free score</a></div>
  </div>
</section>
"""
    (D / fname).write_text(body)
    return fname

def hub():
    n = sum(len(t) for _, t in AREAS)
    blocks = ""
    for county, towns in AREAS:
        chips = ""
        for t in towns:
            label = t.rstrip("*")
            chips += f'<a href="{PAGE_FOR[t]}">{e(label)}</a>' if t in PAGE_FOR else f"<span>{e(label)}</span>"
        blocks += f'<div class="county"><h3>{e(county)}</h3><div class="towns">{chips}</div></div>'
    ld = {"@context": "https://schema.org", "@type": "Service", "serviceType": "Local SEO and AI search visibility",
          "provider": {"@id": LIVE + "/#business"},
          "areaServed": [{"@type": "Place", "name": f"{t.rstrip('*')}, NY"} for _, ts in AREAS for t in ts]}
    body = f"""<!--
title: Areas We Serve | Local Rank Authority
description: Local Rank Authority helps service businesses across New York's Capital Region, Saratoga, Lake George, the Mohawk Valley, and the Hudson Valley, and across the US.
-->
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<section class="phero">
  <div class="wrap">
    <p class="crumbs"><a href="homepage-redesign.html">Home</a> / Areas we serve</p>
    <h1>Areas we serve</h1>
    <p class="lede">We're based in New York's Capital Region and work with local businesses across the US. These are the {n} towns around home where we help businesses most often. Highlighted towns have their own page.</p>
  </div>
</section>
<section class="sec-tight">
  <div class="wrap">{blocks}</div>
</section>
<section class="route sec-tight">
  <div class="wrap stack">
    <p class="eyebrow">Outside New York?</p>
    <h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">Distance isn't a problem</h2>
    <p class="lede">The work happens online, and walkthroughs and check-ins are by phone or video. Start with the free score to see where you stand in your own market.</p>
  </div>
</section>
<section class="ctaband sec-tight">
  <div class="wrap">
    <div><h2>Don't see your town?</h2><p>We probably work there. Send a message or start with your free score.</p></div>
    <div class="btns"><a class="btn btn-primary" href="homepage-redesign.html#book">Get your free score</a><a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" href="contact.html">Send a message</a></div>
  </div>
</section>
"""
    (D / "areas.html").write_text(body)
    return n

if __name__ == "__main__":
    for t in TOWNS:
        print("wrote", town_page(t))
    print("hub towns:", hub())
