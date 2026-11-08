"""Service pages in the new design: one full page per service, each with its own content.

Writes design/content/svc-<slug>.html fragments. Then:
    python3 design/_build.py   -> design/svc-<slug>.html (local preview)
    python3 design/_stage.py   -> docs/services/<slug>.html (served at /services/<slug>)

Rules for this content: no invented numbers or guarantees, no prices here (packages.html has them),
plain English, and every page different from the others and from the ad landing pages.
"""
import html
import json
from pathlib import Path

D = Path(__file__).resolve().parent / "content"
LIVE = "https://localrankauthority.com"
e = lambda t: html.escape(t, quote=False)

LANES = {"found": "Get found", "win": "Win the conversation", "remember": "Stay remembered"}

SERVICES = [
 dict(slug="local-seo-ai-search", lane="found", name="Local SEO & AI Search",
  service_type="Local search engine optimization and AI search visibility",
  title="Local SEO & AI Search Visibility | Local Rank Authority",
  desc="Show up in Google's map results, organic search, and the answers ChatGPT, Gemini, and Google AI give when customers ask who to hire.",
  h1="Be the business Google and AI assistants recommend",
  lede="When someone searches \"near me\" or asks ChatGPT who to call, a short list of businesses gets named. We work on everything those tools check, so your business is on that list more often, and we show you each month whether it is.",
  problems=[
   ("You're missing from the map", "Competitors with fewer years in business show up in the top three on Google Maps, and you're further down the list or not there at all."),
   ("AI assistants name someone else", "Ask ChatGPT or Google's AI who to hire for your service in your town, and your business isn't mentioned."),
   ("Your website doesn't say enough", "One services page and a contact form don't tell Google which jobs you do or which towns you cover."),
   ("You've paid for SEO before", "You got reports full of charts but couldn't tell whether any of it brought in a single call."),
  ],
  fit=["Contractors and home service companies", "Professional offices: legal, medical, financial", "Event, rental, and seasonal businesses", "Shops and studios that rely on nearby customers", "Any business where most customers find you by searching"],
  included=[
   ("A Google Business Profile that works", "Categories, services, photos, hours, and posts set up so Google understands exactly what you do. See our listings service for the full details."),
   ("Service and town pages", "A page for each money service and each area you serve, written the way customers actually search, not stuffed with keywords."),
   ("Technical fixes", "Speed, mobile layout, indexing, broken links, and structured data, so Google and AI crawlers can read every important page."),
   ("Answers AI tools can quote", "Clear, specific answers to the questions customers ask, on your site, in a form AI assistants can find and cite."),
   ("Mentions on trusted sites", "Directory listings, local organizations, and the \"best of\" guides AI assistants draw on when they recommend businesses."),
   ("Monthly tracking", "Your map and search rankings by town, plus a fixed set of real customer questions asked of AI assistants every month."),
  ],
  steps=[
   ("Measure where you stand", "We check your rankings town by town, what AI assistants say about you, and what the top three competitors are doing differently."),
   ("Fix what's holding you back", "The first month goes to the biggest gaps: profile problems, missing pages, technical errors, and listings that don't match."),
   ("Build what earns trust", "New pages, reviews, and mentions on other sites, added steadily so the improvement lasts."),
   ("Report in plain English", "Each month: where you rank, which AI answers name you, and the calls and inquiries that came in."),
  ],
  timeline="Technical and profile fixes usually go live in the first month. Rankings tend to build over three to six months, depending on how competitive your market is.",
  deliverables=["A baseline report of rankings and AI mentions", "A prioritized fix list you can see", "New and improved pages on your site", "Monthly ranking, AI mention, and lead reports", "Everything stays in your name"],
  faqs=[
   ("What's the difference between local SEO and AI search visibility?", "Local SEO gets you into Google's map results and regular search. AI search visibility gets you named when people ask ChatGPT, Gemini, Perplexity, or Google's AI. They rely on many of the same signals, so we work on both together."),
   ("Is this the same as GEO or AEO?", "Yes. Generative engine optimization (GEO) and answer engine optimization (AEO) are names for the AI half of this work: making your business easy for AI tools to find, understand, and recommend."),
   ("Can you guarantee a top-three ranking or an AI recommendation?", "No one honestly can. Results depend on your market, your competitors, and your location. We improve the signals that matter and show you the numbers every month."),
   ("How long until I see results?", "Fixes to your profile and website take effect within weeks. Steady ranking gains usually take three to six months, and less competitive markets often move faster."),
   ("Do you work with businesses outside the Capital Region?", "Yes. We're based near Albany and work with local businesses across the US. The work is the same wherever your customers are."),
   ("Will I have to write anything?", "No. We write the pages and answers, and you approve them. We'll ask you for details only you know, like the jobs you most want more of."),
  ],
  related=["google-business-profile-listings", "review-systems", "website-design"], demo=None),

 dict(slug="google-business-profile-listings", lane="found", name="Google Business Profile & Listings",
  service_type="Google Business Profile optimization and local citation management",
  title="Google Business Profile & Local Listings | Local Rank Authority",
  desc="Your Google Business Profile, Apple Maps, Bing, Yelp, and directory listings set up, matched, and kept current, so customers and AI tools get the same facts everywhere.",
  h1="Your business, listed right everywhere customers look",
  lede="Your Google Business Profile is often the first thing a customer sees, before your website. We set it up properly, match your details on every major map and directory, and keep it all current.",
  problems=[
   ("Your profile is half finished", "Missing services, the wrong main category, a few old photos, and no posts, so Google shows a competitor's fuller profile first."),
   ("Your details don't match", "An old phone number on Yelp, a different business name on Facebook, a previous address on a directory. Mismatches make Google and AI tools less sure about you."),
   ("Duplicates and suggested edits", "A duplicate listing splits your reviews, or someone changes your hours and you don't notice."),
   ("No time to keep it up", "Posting updates, adding photos, and answering questions on your profile always falls to the bottom of the list."),
  ],
  fit=["Businesses that get calls from Google Maps", "Service-area businesses without a storefront", "Businesses that moved, rebranded, or changed numbers", "Owners who inherited a messy profile", "Anyone who has never claimed all of their listings"],
  included=[
   ("Google Business Profile setup", "The right main and secondary categories, every service you offer, service areas, hours, attributes, and a clear description."),
   ("Photos and posts", "Real photos of your work, team, and vehicles, plus regular posts about offers, seasonal services, and finished jobs."),
   ("Apple Maps, Bing, and Yelp", "Your profiles on the other maps people use, claimed and matched to your Google profile."),
   ("Directory cleanup", "Your name, address, and phone matched across the directories that matter for your industry, with old and duplicate listings fixed."),
   ("Questions and answers", "Common customer questions answered on your profile, so people get the facts before they call."),
   ("Monitoring", "Alerts when someone suggests an edit or a duplicate appears, so nothing changes without you knowing."),
  ],
  steps=[
   ("Find every listing", "We search for your business across Google, Apple, Bing, Yelp, Facebook, and the directories in your industry, and list what's wrong."),
   ("Claim and correct", "We help you claim what you don't control yet, then fix names, numbers, categories, and hours so everything matches."),
   ("Fill in the details", "Services, photos, descriptions, and answers added, so your profile is as complete as the best one in your area."),
   ("Keep it current", "Regular posts and photos, and a quick fix whenever something changes."),
  ],
  timeline="Most corrections are made in the first two to four weeks. Some directories take longer to update their records, and we follow up until they do.",
  deliverables=["A list of every listing we found and its status", "A complete, optimized Google Business Profile", "Matching details across major maps and directories", "Regular posts and photo updates", "Alerts for suggested edits and duplicates"],
  faqs=[
   ("What is a Google Business Profile?", "It's the free listing that shows your business on Google Maps and in the map results on Google Search, with your hours, reviews, photos, and phone number. For most local businesses it brings in more calls than the website does."),
   ("Why does it matter if my listings match?", "Google and AI assistants compare your details across many sites. When your name, address, and phone number agree everywhere, they can trust they have the right business, and you're more likely to be shown."),
   ("I work from home. Will my address be public?", "It doesn't have to be. Service-area businesses can hide their address on Google and show the towns they serve instead. We set that up correctly."),
   ("Do I need to give you my Google password?", "No. You add us as a manager on your profile, and you stay the owner. You can remove our access at any time."),
   ("Can you remove bad reviews?", "Only reviews that break Google's rules, such as spam or reviews from someone who was never a customer, can be reported for removal. For the rest, a calm, helpful public reply works best, and we can help you write it."),
  ],
  related=["local-seo-ai-search", "review-systems", "ongoing-care"], demo=None),

 dict(slug="rank-and-rent", lane="found", name="Rank & Rent Lead Sites",
  service_type="Rank and rent lead generation",
  title="Rank & Rent Lead Sites: Exclusive Local Leads | Local Rank Authority",
  desc="We build and rank a lead site for one service in one market, then send its calls and inquiries to one business in that territory.",
  h1="Exclusive leads from a site we've already built",
  lede="Instead of building and ranking your own site from scratch, rent the calls from one we've built for your service and area. One business per territory, so the leads come only to you.",
  problems=[
   ("Shared leads go to everyone", "Lead services sell the same inquiry to three or four companies, and you race to call first."),
   ("Ads stop when the money does", "Paid ads bring calls only while you keep paying, and the price per click keeps rising."),
   ("SEO takes a while", "Ranking a new site in a competitive market can take many months before the phone rings."),
   ("You want to expand", "You'd like work in a nearby town without building a whole new marketing plan for it."),
  ],
  fit=["Service businesses with room for more jobs", "Companies expanding into a nearby town", "Owners who don't want to run ads or a website", "Trades where one extra job a month pays off", "Businesses that answer the phone and follow up fast"],
  included=[
   ("A lead site for one service and area", "A site we build, own, and rank for a service and territory, such as fence installation in a specific area."),
   ("Exclusive territory", "Only one business gets the leads in that territory, agreed in writing."),
   ("Calls and forms sent to you", "Calls forward straight to your phone, and form inquiries go to your email or phone as they come in."),
   ("Call tracking", "Every call and inquiry is logged, so you can see what the site produced."),
   ("Monthly lead report", "A simple list of the calls and inquiries from the month."),
   ("Option to own it later", "If the arrangement works well, we can discuss transferring the site to you."),
  ],
  steps=[
   ("Pick the service and territory", "We look at search demand and competition to choose a market where a site can realistically rank."),
   ("Build and rank the site", "We build the site and its listings and work on it until it brings in steady calls."),
   ("Agree on terms", "Territory, exclusivity, how leads are handled, and the monthly fee, all written down."),
   ("Send you the leads", "Calls and inquiries go straight to you, with a monthly report of everything that came in."),
  ],
  timeline="Some territories have a ranked site ready to rent now. A new site usually needs several months to rank before it can be rented.",
  deliverables=["Exclusive leads for your territory", "Calls forwarded to your phone", "Form inquiries sent as they arrive", "A monthly lead report", "A written agreement"],
  faqs=[
   ("What is rank and rent?", "We build a website that ranks for a service in a specific area, such as \"gutter cleaning in Saratoga County.\" The calls it brings in go to one business in that territory, for a monthly fee."),
   ("Who owns the lead site?", "We do. You rent access to its calls and inquiries. Territory, exclusivity, lead handling, and fees are agreed in writing before you start."),
   ("How many leads will I get?", "It depends on the market and how well the site ranks. Lead volume is never guaranteed, and you see every lead in your monthly report."),
   ("Are the leads shared with other companies?", "No. Each territory goes to one business only."),
   ("What if I want my own website instead?", "That's often the better long-term choice, and we build those too. Rank and rent suits owners who want calls now without managing a site."),
  ],
  related=["local-seo-ai-search", "ai-receptionist", "lead-capture-follow-up"], demo=None),

 dict(slug="website-design", lane="win", name="Website Design",
  service_type="Website design for local service businesses",
  title="Website Design for Local Service Businesses | Local Rank Authority",
  desc="Fast, mobile-first websites that explain what you do, where you do it, and how to book, built to rank on Google and be understood by AI assistants.",
  h1="A website that turns visitors into booked jobs",
  lede="Most visitors decide in a few seconds whether to call, keep reading, or leave. We build sites that answer their questions quickly, look trustworthy on a phone, and make it easy to call, book, or ask for a quote.",
  problems=[
   ("It looks fine but nobody calls", "Visitors land, scroll, and leave, because the next step isn't obvious or the phone number is hard to find on mobile."),
   ("It's slow on a phone", "Pages take seconds to load on a cell connection, and visitors give up before they see your work."),
   ("It doesn't say where you work", "Google and AI assistants can't tell which towns you serve or which jobs you do best."),
   ("You can't update it", "Changing a price, a photo, or your hours means waiting on a developer."),
  ],
  fit=["Businesses with an outdated or slow site", "New businesses that need a first site", "Owners whose site brings traffic but few calls", "Companies adding services or service areas", "Anyone who wants to own their site outright"],
  included=[
   ("Clear offer and next step", "Every page leads with what you do, where you do it, and one obvious way to call, book, or get a quote."),
   ("Built for phones first", "Most local customers visit on a phone, so we design for small screens and quick loading first."),
   ("Pages for services and towns", "A page for each main service and area you serve, so you can rank for each one."),
   ("Proof that builds trust", "Reviews, photos of real jobs, licenses, guarantees, and your story, placed where they help someone decide."),
   ("Booking and quote options", "Click-to-call, booking calendars, quote forms, and deposit links, matched to how you take work."),
   ("Ready for search and AI", "Fast pages, clean structure, and structured data, so search engines and AI tools understand your business."),
  ],
  steps=[
   ("Plan the pages", "We review your current site, your competitors, and your best jobs, then agree on the pages and what each one needs to do."),
   ("Write and design", "We write the content and design the pages. You review a working draft, not just pictures."),
   ("Build and test", "Built, tested on phones and computers, and connected to your forms, booking, and tracking."),
   ("Launch and measure", "Old pages are redirected so you keep what you've earned in search, and we track calls and forms from day one."),
  ],
  timeline="Most service business sites take four to eight weeks, depending on how many pages and features you need.",
  deliverables=["A fast, mobile-first website", "Written content for every page", "Contact, booking, and quote forms connected", "Redirects from your old pages", "Call and form tracking", "Your domain, site, and content in your name"],
  faqs=[
   ("How long does a new website take?", "Most service business sites take four to eight weeks, depending on the number of pages and features."),
   ("Can you work with my existing website?", "Yes. Sometimes improving what you have is the better choice. We review the platform, content, and how customers move through it before recommending a rebuild."),
   ("Do I own my website?", "Yes. Your domain, content, and site are yours, and everything is set up in your name."),
   ("Will I lose my Google rankings if I switch?", "Not if it's done carefully. We redirect every old page to its new home and check search results after launch."),
   ("Can I make changes myself?", "Yes. You can update text, photos, and hours yourself, and we're available for anything bigger."),
   ("Do you write the content?", "Yes. We write it from a short interview with you, then you approve it."),
  ],
  related=["local-seo-ai-search", "lead-capture-follow-up", "ai-chat-agents"], demo=None),

 dict(slug="lead-capture-follow-up", lane="win", name="Lead Capture & Follow-Up",
  service_type="Lead capture, estimate builders, and automated follow-up",
  title="Lead Capture & Follow-Up Systems | Local Rank Authority",
  desc="Estimate builders, instant lead alerts, booking, and follow-up texts and emails you approve, so more inquiries become booked jobs without chasing them by hand.",
  h1="Turn more inquiries into booked jobs",
  lede="Leads go cold fast. The business that answers first, with a clear price range and an easy way to book, usually gets the job. We set up tools that respond for you within seconds and follow up until the customer decides.",
  problems=[
   ("Leads wait too long", "A form comes in while you're on a job, and by the time you call back they've hired someone else."),
   ("Everyone asks \"how much?\"", "You spend hours on calls and site visits for people who were never going to pay your price."),
   ("Follow-up depends on memory", "Quotes go out and nobody checks in, so jobs you could have won quietly disappear."),
   ("Leads are scattered", "Calls, texts, emails, and Facebook messages live in different places, and some get missed."),
  ],
  fit=["Contractors and home services that quote jobs", "Rental and event businesses", "Businesses that get after-hours inquiries", "Owners who are on job sites all day", "Anyone sending quotes that don't get answered"],
  included=[
   ("Estimate and quote builders", "Visitors choose options and see a price range right away, then leave their details to get an exact quote."),
   ("Instant lead alerts", "Every new inquiry sent to your phone by text or email as it arrives, with the details attached."),
   ("Automatic first reply", "A friendly message goes out within seconds, so the customer knows you got it and what happens next."),
   ("Follow-up you approve", "A short series of texts and emails for quotes that haven't been answered, written in your voice."),
   ("Booking and deposits", "Online booking and deposit links, so ready customers can commit on the spot."),
   ("Everything in one place", "Leads from your site, calls, and messages gathered into one simple list or the CRM you already use."),
  ],
  steps=[
   ("Map how leads arrive", "We look at where your inquiries come from, how fast they're answered, and where they're lost."),
   ("Build the tools", "Estimate builders, forms, alerts, and booking set up around how you already work."),
   ("Write the follow-up", "Messages written with you and approved by you, sent only to people who asked for a quote or booking."),
   ("Test and tune", "We test every path, then track how many inquiries turn into jobs and adjust what isn't working."),
  ],
  timeline="A focused setup usually takes two to four weeks. Estimate builders with many options can take longer.",
  deliverables=["An estimate or quote builder on your site", "Instant alerts for every new lead", "Automatic replies and follow-up sequences", "Booking and deposit options", "A simple view of every lead and where it came from"],
  faqs=[
   ("What is an estimate builder?", "A tool on your website where customers pick the job details and see a ballpark price right away. To get an exact quote, they leave their contact details, so you get a lead with the job scope already filled in."),
   ("Will automatic texts annoy my customers?", "They shouldn't. Messages go only to people who asked for a quote or booking, are written in your voice, stop when someone replies or opts out, and you approve every one."),
   ("Do I need a CRM?", "No. We can send leads to your phone and email, or connect to a CRM you already use."),
   ("Will a price range scare people off?", "Usually the opposite. A range answers the first question most customers have and filters out jobs that were never a fit. You decide which numbers to show."),
   ("What does it cost to run?", "Some tools have monthly platform or texting fees. We list every one in your proposal before you commit."),
  ],
  related=["ai-chat-agents", "ai-receptionist", "website-design"],
  demo=("estimate builder", "Try the sample estimate builder for a fictional plumbing company: pick a job, adjust the size, and watch the price range update.")),

 dict(slug="ai-chat-agents", lane="win", name="AI Chat Agents",
  service_type="AI website chat agent for local businesses",
  title="AI Chat Agents for Local Business Websites | Local Rank Authority",
  desc="A website assistant trained on your services, prices, and service area. It answers questions any time of day, qualifies the job, and sends you the lead.",
  h1="A website assistant that answers like your best employee",
  lede="Visitors have questions at 10 PM and on Sunday mornings. An AI chat agent trained on your business answers them right away, asks the questions you would ask, and sends you a summary with the customer's contact details.",
  problems=[
   ("Questions go unanswered", "Visitors want to know your hours, area, and rough prices, can't find them quickly, and leave."),
   ("Contact forms feel like a dead end", "People don't want to fill out a form and wait. They want an answer now."),
   ("The same questions all day", "You or your staff answer \"do you service my town?\" and \"how much?\" over and over."),
   ("Night and weekend visitors", "Your busiest website hours are often when nobody is there to respond."),
  ],
  fit=["Businesses with lots of repeat questions", "Sites with evening and weekend traffic", "Services with many options or price levels", "Owners who can't watch a live chat box", "Businesses that want leads, not just conversations"],
  included=[
   ("Trained on your business", "Your services, service area, hours, policies, and pricing guidance, written into a knowledge base you approve."),
   ("Answers any time", "Immediate replies on every page of your site, on phones and computers."),
   ("Qualifies the job", "Asks what you would ask: the type of job, location, timing, and budget."),
   ("Captures contact details", "Collects a name, phone, and email when the visitor is ready, and offers to book."),
   ("Lead summaries", "Each conversation ends with a short summary sent to you by text or email."),
   ("Clear limits", "It hands anything unusual to you instead of guessing, and it never invents prices or promises."),
  ],
  steps=[
   ("Gather what it should know", "A short interview and your existing materials become the agent's knowledge base."),
   ("Set the rules", "We agree on what it answers, which details it collects, and when it hands off to you."),
   ("Test before launch", "We test it with dozens of real customer questions, including tricky ones, and fix any weak answers."),
   ("Launch and review", "It goes live on your site, and we review conversations to improve answers over time."),
  ],
  timeline="Most chat agents are ready in two to three weeks, including testing.",
  deliverables=["A chat agent on your website", "A knowledge base you approve", "Lead summaries by text or email", "Conversation history you can review", "Regular updates as your services change"],
  faqs=[
   ("Will the chat agent know everything about my business?", "Only what you approve. Each agent gets a knowledge base you sign off on, clear limits, and testing before launch."),
   ("What if a customer asks something it doesn't know?", "It says so, takes their details, and passes the question to you. It's set up not to guess."),
   ("Can it quote prices?", "It can share the price guidance you approve, such as typical ranges, and explain what affects the final price. Exact quotes stay with you."),
   ("Is this the same as an AI receptionist?", "They're related. The chat agent answers on your website, and the AI receptionist answers phone calls. Many businesses use both."),
   ("Does it work on my current website?", "Usually, yes. It's added with a small piece of code that works on most website platforms."),
  ],
  related=["ai-receptionist", "lead-capture-follow-up", "website-design"],
  demo=("AI chat agent", "Ask the sample chat agent for a fictional plumbing company a question and see how it answers and captures the lead.")),

 dict(slug="ai-receptionist", lane="win", name="AI Receptionist",
  service_type="AI voice receptionist for missed and after-hours calls",
  title="AI Receptionist: Answer Every Call | Local Rank Authority",
  desc="An AI voice receptionist that answers the calls you'd otherwise miss, books appointments, flags urgent jobs, and texts you the details.",
  h1="Never send another customer to voicemail",
  lede="When you're on a ladder, under a sink, or closed for the night, your phone still rings. An AI receptionist answers in a natural voice, gets the details, books the job or marks it urgent, and texts you a summary.",
  problems=[
   ("Missed calls are lost jobs", "Many callers who reach voicemail don't leave a message. They call the next business on the list."),
   ("You can't answer on the job", "Stopping work to answer every call slows you down, and ignoring calls costs you customers."),
   ("After-hours emergencies", "Urgent calls at night go unanswered, even when you'd gladly take the job."),
   ("A full-time receptionist is expensive", "Hiring someone to answer the phone doesn't make sense for many small businesses."),
  ],
  fit=["Trades and home services working in the field", "Businesses with after-hours or emergency calls", "Offices with busy front-desk hours", "Solo owners and small teams", "Anyone whose voicemail fills up"],
  included=[
   ("Answers in your business name", "A natural-sounding voice greets callers with your business name and handles common questions."),
   ("Gets the details", "Name, number, address, and what the job is, asked the way you would ask."),
   ("Books or flags urgent jobs", "Books into your calendar when it can, and marks emergencies so you can call back right away."),
   ("Text summaries", "A short text after every call with who called, what they need, and what was promised."),
   ("Your rules", "You choose when it answers: after hours, when you're busy, or every call. It sends anything unusual to you."),
   ("Call records", "A log of calls and summaries, so nothing falls through the cracks."),
  ],
  steps=[
   ("Write the call script", "We learn your services, area, hours, and how you handle urgent calls, then write how it should answer."),
   ("Connect your phone", "Calls forward to the receptionist when you choose, and your number stays the same."),
   ("Test real calls", "We call it ourselves with common and tricky requests and adjust until it handles them well."),
   ("Launch and improve", "It goes live, and we review calls to keep improving answers and booking."),
  ],
  timeline="A typical setup takes two to three weeks, including testing with real calls.",
  deliverables=["An AI receptionist on your existing number", "A call script you approve", "Text summaries after every call", "Calendar booking where it fits", "A log of every call"],
  faqs=[
   ("Will an AI receptionist sound robotic?", "Modern voice agents sound natural and handle common questions well. We script them around your services, test them before launch, and route anything unusual to you."),
   ("Do I need a new phone number?", "No. Your existing number forwards calls to the receptionist when you choose, such as after hours or when you don't pick up."),
   ("What happens with emergencies?", "You decide. It can mark the call urgent and text you immediately, transfer the call, or book the first available slot."),
   ("Can callers reach a person?", "Yes. It can take a message for a callback or transfer the call, based on rules you set."),
   ("Is the call recorded?", "Calls can be recorded and transcribed so you have the details. Callers are told when recording is on, as the law requires."),
  ],
  related=["ai-chat-agents", "lead-capture-follow-up", "review-systems"],
  demo=("AI receptionist", "Read a sample after-hours call with a fictional plumbing company and the text summary the owner receives.")),

 dict(slug="review-systems", lane="remember", name="Review Systems",
  service_type="Customer review request and response system",
  title="Review Systems: More Google Reviews | Local Rank Authority",
  desc="Automatic review requests after every job, simple links for Google and other sites, and alerts with reply drafts, all within Google's rules.",
  h1="More reviews, without having to remember to ask",
  lede="Customers trust reviews, and so do Google and AI assistants. Most happy customers will leave one if you ask at the right moment and make it easy. We set up a system that asks every customer, every time.",
  problems=[
   ("Happy customers don't leave reviews", "Most satisfied customers never think to write one unless someone asks."),
   ("Asking is awkward and easy to forget", "At the end of a long job, asking for a review is the last thing on your mind."),
   ("Competitors have more reviews", "A competitor with more recent reviews looks safer, even when your work is better."),
   ("Reviews go unanswered", "New reviews, good and bad, sit without a reply, and potential customers notice."),
  ],
  fit=["Any business that depends on its reputation", "Service companies finishing several jobs a week", "Businesses with an older, thin review history", "Owners who want to reply to every review", "Multi-location or multi-crew businesses"],
  included=[
   ("Automatic requests", "A text or email goes out after each finished job, timed for when the customer is happiest."),
   ("One-tap review links", "Links straight to your Google review form and other sites that matter in your industry."),
   ("Follow-up reminders", "One polite reminder for customers who didn't get to it the first time."),
   ("New review alerts", "You hear about every new review right away."),
   ("Reply drafts", "Suggested replies for each review, written in your voice, for you to edit and post."),
   ("Within the rules", "Every customer is asked, no incentives are offered, and nobody is filtered out, as Google's policies require."),
  ],
  steps=[
   ("Connect your job list", "We connect to how you track finished jobs, or set up a simple way to add each customer."),
   ("Write the messages", "Short, friendly requests in your voice, approved by you."),
   ("Turn it on", "Requests go out automatically after each job, and new reviews come to you with reply drafts."),
   ("Track progress", "Review count, rating, and how recent your reviews are, compared with your top competitors."),
  ],
  timeline="Most review systems are running within one to two weeks.",
  deliverables=["Automatic review requests after each job", "Direct review links for Google and other sites", "Alerts for new reviews", "Reply drafts for every review", "A simple monthly review report"],
  faqs=[
   ("Is it allowed to ask customers for reviews?", "Yes. Google allows and encourages asking for reviews. What it doesn't allow is paying for reviews, offering discounts or gifts in exchange, or asking only customers you expect to be happy."),
   ("Can I send unhappy customers somewhere else first?", "No. Screening customers before asking for a review is called review gating, and Google doesn't allow it. We ask every customer the same way."),
   ("What about negative reviews?", "A prompt, calm, helpful reply shows future customers how you treat people. We draft replies for you to approve. Reviews that break Google's rules can be reported."),
   ("Will the requests come from my business?", "Yes. Texts and emails come from your business name, written in your voice."),
   ("Do reviews help with AI search too?", "Yes. AI assistants often draw on reviews when they recommend businesses, so a steady flow of genuine reviews helps both Google rankings and AI answers."),
  ],
  related=["google-business-profile-listings", "local-seo-ai-search", "lead-capture-follow-up"], demo=None),

 dict(slug="branding-brand-identity", lane="remember", name="Branding & Brand Identity",
  service_type="Brand identity design and brand strategy for local businesses",
  title="Branding & Brand Identity for Local Businesses | Local Rank Authority",
  desc="A cohesive, professional brand: logo, colors, type, voice, and guidelines used the same way everywhere, so customers trust you before they call and choose you when they compare.",
  h1="A brand that earns trust before you say a word",
  lede="Customers judge a business in seconds: the truck in the driveway, the Google profile, the website, the invoice. When all of it looks and sounds like one professional company, people trust you sooner, call more readily, and are easier to close. We build that identity and make sure it shows up the same way everywhere.",
  problems=[
   ("You look different everywhere", "The logo on the truck, the website, the Facebook page, and the estimates don't match, so customers aren't sure they found the right business."),
   ("You look smaller than you are", "Your work is excellent, but a homemade logo and mismatched colors make you look less established than competitors who charge more."),
   ("Price is the only thing that sets you apart", "Without a clear identity and message, customers compare on price alone and shop you against the cheapest quote."),
   ("Nobody knows how to describe you", "There's no set wording for what you do, so every ad, post, and profile says something a little different."),
  ],
  fit=["New businesses that need a professional start", "Established businesses with a dated or homemade look", "Companies adding services, locations, or partners", "Businesses rebranding after a name change or buyout", "Owners who want to charge what their work is worth"],
  included=[
   ("Brand discovery", "A working session on your customers, competitors, strengths, and the reputation you want, so the brand is built on what makes you different."),
   ("Logo and visual identity", "A primary logo plus versions for small spaces, vehicles, and dark backgrounds, with a color palette and typefaces that work together."),
   ("Brand voice and messaging", "Your one-line description, tagline options, the key points that set you apart, and the words to use and avoid."),
   ("Brand guidelines", "A short, practical guide that shows anyone, from a sign shop to a new hire, how to use your logo, colors, fonts, and voice correctly."),
   ("Everywhere customers see you", "Your website, Google Business Profile, social profiles, email signature, estimates, and invoices brought in line with the new brand."),
   ("Print and vehicle files", "Ready-to-print files for business cards, yard signs, shirts, and vehicle graphics, in the formats printers ask for."),
  ],
  steps=[
   ("Discover", "We learn your business, your customers, and your competitors, and agree on how you want to be seen."),
   ("Design", "We present logo and identity directions. You choose one, and we refine it with your feedback."),
   ("Define", "We write your messaging and voice, and put everything into a simple brand guide."),
   ("Roll out", "We update your website, profiles, and documents, and deliver print-ready files for everything else."),
  ],
  timeline="Most brand identity projects take four to eight weeks, depending on how many pieces need updating.",
  deliverables=["Logo files in every format you'll need", "Color palette and typefaces", "Messaging, tagline options, and brand voice", "A practical brand guide", "Updated website, Google profile, and social profiles", "Print-ready files for cards, signs, apparel, and vehicles", "All files and rights in your name"],
  faqs=[
   ("Why does branding matter for a local service business?", "Customers can't see your work before they hire you, so they judge what they can see: your profile, website, truck, and paperwork. A consistent, professional brand makes you look established and trustworthy, which helps more people call and makes it easier to win the job without competing on price alone."),
   ("Is branding just a logo?", "No. The logo is one piece. A brand is the whole impression: your look, your colors, how you describe yourself, and how consistently it all shows up wherever customers find you."),
   ("Do I have to change my business name?", "No. Most projects keep the name and improve how it's presented. If a name is causing real confusion, we'll talk it through honestly, but it's your call."),
   ("Can you refresh my current logo instead of starting over?", "Yes. If your logo has recognition worth keeping, a refresh can modernize it while keeping what customers already know."),
   ("Who owns the logo and files?", "You do. All final files and the rights to use them are yours, set out in writing."),
   ("How does branding help with Google and AI search?", "Search engines and AI assistants trust businesses whose name, details, and description match everywhere. A clear, consistent brand makes your listings, website, and profiles agree, which supports the rest of your local SEO."),
  ],
  related=["website-design", "google-business-profile-listings", "custom-jingles"], demo=None),

 dict(slug="custom-jingles", lane="remember", name="Custom Jingles",
  service_type="Custom advertising jingles and audio branding",
  title="Custom Ad Jingles for Local Businesses | Local Rank Authority",
  desc="A short, original jingle built around your business name or phone number, for radio, video, social ads, and your on-hold message.",
  h1="A jingle people hum on the way to calling you",
  lede="A good jingle puts your name in people's heads before they need you, so when the pipe bursts or the roof leaks, yours is the business they remember. We write and produce original jingles built around your name or number.",
  problems=[
   ("Your ads blend in", "Radio and video ads that sound like everyone else's are forgotten as soon as they end."),
   ("Nobody remembers the number", "Customers saw your ad but can't remember your name or number when they need you."),
   ("Stock music sounds generic", "Licensed background music doesn't say anything about your business."),
   ("No sound for your brand", "Your on-hold message, videos, and social posts have no consistent sound tying them together."),
  ],
  fit=["Businesses running radio, TV, or streaming ads", "Brands posting video on social media", "Companies with a phone number worth remembering", "Family businesses with a story to tell", "Anyone who wants to be remembered, not just found"],
  included=[
   ("Original melody and lyrics", "Written around your business name, phone number, or slogan, with no stock music."),
   ("Professional vocals and production", "Recorded and mixed so it sounds right on radio, phones, and social media."),
   ("Short and long cuts", "5, 15, and 30-second versions to fit different ads, plus an instrumental bed."),
   ("Revision rounds", "You hear a sketch first and help shape it before final production."),
   ("Ready-to-use files", "Delivered in the formats radio stations, video editors, and phone systems need."),
   ("Usage rights", "You get the rights to use your jingle in your own advertising, spelled out in writing."),
  ],
  steps=[
   ("Learn your business", "A short call about your business, your customers, and the feeling you want people to have."),
   ("Write and sketch", "We write lyrics and a melody sketch for you to hear and react to."),
   ("Produce", "Final vocals, instruments, and mixing, with a round of revisions."),
   ("Deliver every cut", "All lengths and formats delivered, ready for ads, video, and on-hold."),
  ],
  timeline="Most jingles are finished in two to four weeks, from first call to final files.",
  deliverables=["An original jingle", "5, 15, and 30-second versions", "An instrumental version", "Files for radio, video, social, and on-hold", "Written usage rights"],
  faqs=[
   ("Do jingles still work?", "Sound is one of the most memorable parts of an ad. A short tune built around your name or number can help people remember you long after the ad ends."),
   ("Will it sound cheesy?", "Not unless you want it to. Styles range from classic radio jingles to modern, understated sound logos, and you hear a sketch before anything is final."),
   ("Who owns the jingle?", "You get the rights to use it in your own advertising, set out in writing in your agreement."),
   ("Where can I use it?", "Radio, TV and streaming ads, social video, your website, trade shows, and your phone's on-hold message."),
   ("Can it include my phone number?", "Yes. Building the number into the melody is one of the most effective ways to make it stick."),
  ],
  example=dict(title="“Make Your Moment Shine” for Marquee Moments",
    text="Marquee Moments, owned by Laiala Margonar, rents 4-foot light-up marquee letters for weddings, birthdays, and events across Albany and the Capital Region. We created this jingle around the name and the promise behind it.",
    audio="../docs/assets/audio/marquee-moments-make-your-moment-shine.mp3", length="14 seconds", link=("marqueemoments.net", "https://marqueemoments.net"),
    quote="One of my favorite parts was the custom jingle they created for us! “MarqueeMoments.net — make your moment shine” captures our business perfectly. It’s catchy, memorable, and gives our marketing so much personality. I still catch myself singing it!",
    quote_by="Laiala Margonar, Marquee Moments", quote_note="Marquee Moments is my wife Laiala’s business.", case="case-marquee-moments.html"),
  related=["review-systems", "ongoing-care", "website-design"],
  demo=("jingle sketch", "Play a melody sketch for a fictional plumbing company, made in your browser. Finished jingles add professional vocals and production.")),

 dict(slug="ongoing-care", lane="remember", name="Ongoing Care & Reporting",
  service_type="Website care, local SEO maintenance, and monthly reporting",
  title="Website Care & Monthly SEO Reporting | Local Rank Authority",
  desc="Monthly updates, fixes, backups, and plain-English reports on your rankings, AI mentions, reviews, and leads, so your site and listings keep working after launch.",
  h1="Keep everything working, and know what it's doing for you",
  lede="Websites, listings, and rankings don't stay in place by themselves. Ongoing care keeps your site fast, secure, and current, keeps your marketing improving, and shows you in plain English what it's bringing in each month.",
  problems=[
   ("The site slowly breaks", "Plugins go out of date, forms quietly stop sending, and pages slow down, and nobody notices until leads drop."),
   ("Rankings slip", "Competitors keep improving while your site and profile stand still."),
   ("Reports you can't use", "You get charts full of jargon, but no answer to whether marketing brought in more work."),
   ("Small changes take weeks", "Updating a price, adding a service, or posting a seasonal offer keeps getting pushed back."),
  ],
  fit=["Businesses after a new site or SEO project", "Owners without a web person on staff", "Companies that want steady improvement", "Anyone tired of reports they can't understand", "Seasonal businesses that need timely updates"],
  included=[
   ("Updates, backups, and security", "Software kept up to date, regular backups, and monitoring so problems are caught early."),
   ("Forms and tracking checks", "We test your forms, call tracking, and booking regularly so leads never silently disappear."),
   ("Content and listing updates", "New services, seasonal offers, photos, and posts added for you."),
   ("Ongoing SEO", "Steady improvements to pages, listings, and reviews, based on what the numbers show."),
   ("AI mention tracking", "The same set of customer questions asked of AI assistants each month, so you can see changes over time."),
   ("A monthly plain-English report", "Calls, inquiries, rankings, reviews, and AI mentions, with what we did and what's next."),
  ],
  steps=[
   ("Set the baseline", "We record where your rankings, reviews, AI mentions, and leads stand today."),
   ("Agree on priorities", "Each month we focus on the changes most likely to bring in more work."),
   ("Do the work", "Updates, fixes, content, and improvements, with you approving anything customers will see."),
   ("Report and adjust", "A short monthly report, a quick call if you want one, and a plan for next month."),
  ],
  timeline="Care starts right away and runs month to month. There are no long contracts.",
  deliverables=["Updates, backups, and security monitoring", "Regular checks of forms and tracking", "Content, listing, and seasonal updates", "Rankings and AI mention tracking", "A monthly plain-English report"],
  faqs=[
   ("Do I need ongoing care after a new website?", "Most businesses benefit from it. Websites need updates and checks to stay fast and secure, and rankings keep improving only with steady work."),
   ("Is there a long contract?", "No. Care runs month to month."),
   ("What's in the monthly report?", "Calls and inquiries, where you rank in each town you serve, new reviews, which AI answers mention you, what we did, and what's next, in plain English."),
   ("Can you take care of a site you didn't build?", "Usually, yes. We review it first and tell you about anything that needs fixing before we take it on."),
   ("How quickly are changes made?", "Small updates are usually made within a couple of business days."),
  ],
  related=["local-seo-ai-search", "website-design", "review-systems"], demo=None),
]

BY_SLUG = {s["slug"]: s for s in SERVICES}


def ld_for(s):
    url = f"{LIVE}/services/{s['slug']}"
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "@id": url + "#service", "name": s["name"], "serviceType": s["service_type"],
         "description": s["desc"], "url": url, "provider": {"@id": LIVE + "/#business"},
         "areaServed": [{"@type": "AdministrativeArea", "name": "New York's Capital Region"}, {"@type": "Country", "name": "United States"}]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Services", "item": LIVE + "/#services"},
            {"@type": "ListItem", "position": 3, "name": s["name"], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in s["faqs"]]}]}


def page(s):
    probs = "".join(f'<div class="point"><span class="k">{i}</span><div><h3>{e(h)}</h3><p>{e(p)}</p></div></div>' for i, (h, p) in enumerate(s["problems"], 1))
    fit = "".join(f"<li>{e(x)}</li>" for x in s["fit"])
    inc = "".join(f'<div class="card"><h3>{e(h)}</h3><p>{e(p)}</p></div>' for h, p in s["included"])
    steps = "".join(f'<div class="point"><span class="k">{i}</span><div><h3>{e(h)}</h3><p>{e(p)}</p></div></div>' for i, (h, p) in enumerate(s["steps"], 1))
    dels = "".join(f"<li>{e(x)}</li>" for x in s["deliverables"])
    faqs = "".join(f"<details{' open' if i == 0 else ''}><summary>{e(q)}</summary><p>{e(a)}</p></details>" for i, (q, a) in enumerate(s["faqs"]))
    rel = "".join(f'<a class="card svc-rel" href="svc-{r}.html"><span class="eyebrow">{e(LANES[BY_SLUG[r]["lane"]])}</span><h3>{e(BY_SLUG[r]["name"])}</h3><p>{e(BY_SLUG[r]["desc"])}</p><span class="textlink">Learn more →</span></a>' for r in s["related"])
    example = ""
    if s.get("example"):
        x = s["example"]
        quote_html = ""
        if x.get("quote"):
            quote_html = (f'<figure class="testimonial"><blockquote>{e(x["quote"])}</blockquote>'
                          f'<figcaption><b>{e(x["quote_by"])}</b><span>{e(x["quote_note"])}</span></figcaption></figure>'
                          f'<a class="textlink" href="{x["case"]}">Read the Marquee Moments case study →</a>')
        example = f"""
<section class="sec-tight">
  <div class="wrap two">
    <div class="stack">
      <p class="eyebrow">Real client work</p>
      <h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">{e(x['title'])}</h2>
      <p class="lede">{e(x['text'])}</p>
      {quote_html}
    </div>
    <div class="panel">
      <h3>Listen</h3>
      <audio controls preload="none" src="{x['audio']}" style="width:100%">Your browser can't play this audio.</audio>
      <p style="color:var(--muted)">{e(x['length'])} · <a href="{x['link'][1]}" target="_blank" rel="noopener">{e(x['link'][0])}</a></p>
    </div>
  </div>
</section>"""
    demo = ""
    if s["demo"]:
        label, text = s["demo"]
        demo = f"""
<section class="ctaband sec-tight">
  <div class="wrap">
    <div><p class="eyebrow" style="color:var(--on-sign-muted)">Try it</p><h2>See the {e(label)} in action</h2><p>{e(text)}</p></div>
    <div class="btns"><a class="btn btn-primary" href="homepage-redesign.html#demos">Open the demo</a></div>
  </div>
</section>"""
    return f"""<!--
title: {s['title']}
description: {s['desc']}
-->
<script type="application/ld+json">{json.dumps(ld_for(s), ensure_ascii=False)}</script>
<section class="phero">
  <div class="wrap">
    <p class="crumbs"><a href="homepage-redesign.html">Home</a> / <a href="homepage-redesign.html#services">Services</a> / {e(s['name'])}</p>
    <p class="eyebrow">{e(LANES[s['lane']])} · {e(s['name'])}</p>
    <h1 style="margin-top:14px">{e(s['h1'])}</h1>
    <p class="lede">{e(s['lede'])}</p>
    <div class="ctas"><a class="btn btn-primary" href="homepage-redesign.html#book">Get your free score</a><a class="textlink" href="contact.html">or talk to Michael</a></div>
  </div>
</section>
<section class="sec-tight">
  <div class="wrap two">
    <div class="stack">
      <p class="eyebrow">Sound familiar?</p>
      <h2 class="h2">What's getting in the way</h2>
      <div class="points" style="margin-top:18px">{probs}</div>
    </div>
    <div class="panel">
      <h3>A good fit for</h3>
      <ul style="margin:0;padding-left:20px;display:grid;gap:8px;color:var(--muted)">{fit}</ul>
    </div>
  </div>
</section>
<section class="route sec-tight">
  <div class="wrap stack">
    <p class="eyebrow">What's included</p>
    <h2 class="h2">What we do</h2>
    <div class="cards" style="margin-top:22px">{inc}</div>
  </div>
</section>
<section class="sec-tight">
  <div class="wrap two">
    <div class="stack">
      <p class="eyebrow">How it works</p>
      <h2 class="h2">Four steps, no surprises</h2>
      <div class="points" style="margin-top:18px">{steps}</div>
    </div>
    <div class="panel">
      <h3>What you get</h3>
      <ul style="margin:0;padding-left:20px;display:grid;gap:8px;color:var(--muted)">{dels}</ul>
      <p style="color:var(--muted)"><b style="color:var(--ink)">Timing:</b> {e(s['timeline'])}</p>
      <a class="textlink" href="packages.html{'#branding' if s['slug'] == 'branding-brand-identity' else ''}">See packages and pricing →</a>
    </div>
  </div>
</section>{example}{demo}
<section class="sec-tight">
  <div class="wrap faq">
    <div class="stack"><p class="eyebrow">Questions</p><h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">{e(s['name'])}: common questions</h2></div>
    <div>{faqs}</div>
  </div>
</section>
<section class="route sec-tight">
  <div class="wrap stack">
    <p class="eyebrow">Works well with</p>
    <h2 class="h2" style="font-size:clamp(28px,3.4vw,40px)">Related services</h2>
    <div class="cards" style="margin-top:22px">{rel}</div>
  </div>
</section>
<section class="ctaband sec-tight">
  <div class="wrap">
    <div><h2>Not sure where to start?</h2><p>Your free score checks your website, your rankings, and what AI assistants say about you, in about a minute.</p></div>
    <div class="btns"><a class="btn btn-primary" href="homepage-redesign.html#book">Get your free score</a><a class="btn btn-ghost" href="contact.html">Talk to Michael</a></div>
  </div>
</section>
"""


if __name__ == "__main__":
    for s in SERVICES:
        (D / f"svc-{s['slug']}.html").write_text(page(s))
    print(f"wrote {len(SERVICES)} service pages")
