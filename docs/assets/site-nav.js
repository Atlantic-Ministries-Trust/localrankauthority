// Site header: the left hamburger menu (all pages, grouped) and the expanding site search.
// Search reads /search-index.json, which design/_stage.py builds from every page at publish time.
(function () {
  var header = document.querySelector("header.top");
  if (!header) return;

  // ---------- hamburger menu ----------
  var menuBtn = header.querySelector(".menu-btn");
  var drawer = document.getElementById("site-menu");
  // The header's frosted-glass blur traps fixed-position children inside it, so the menu lives at the page level
  if (drawer && drawer.parentNode !== document.body) document.body.appendChild(drawer);
  var lastFocus = null;
  function focusables() {
    return Array.prototype.slice.call(drawer.querySelectorAll("a[href], button, summary")).filter(function (el) { return el.offsetParent !== null; });
  }
  function openMenu() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    var f = drawer.querySelector(".drawer-panel summary") || focusables()[0];
    if (f) f.focus();
  }
  function closeMenu() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.focus();
  }
  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", openMenu);
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-menu]")) closeMenu();
      else if (e.target.closest("a[href]")) { drawer.hidden = true; document.body.classList.remove("menu-open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
    drawer.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // ---------- search ----------
  var searchBtn = header.querySelector(".search-btn");
  var form = header.querySelector(".site-search");
  if (!searchBtn || !form) return;
  var input = form.querySelector("input");
  var box = form.querySelector(".ss-results");
  var index = null, loading = null, sel = -1, items = [];

  function load() {
    if (index || loading) return loading;
    loading = fetch("/search-index.json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) { index = Array.isArray(d) ? d : []; })
      .catch(function () { index = []; });
    return loading;
  }
  function openSearch() {
    form.hidden = false;
    searchBtn.setAttribute("aria-expanded", "true");
    input.focus();
    load();
  }
  function closeSearch() {
    form.hidden = true;
    box.hidden = true;
    input.value = "";
    input.setAttribute("aria-expanded", "false");
    searchBtn.setAttribute("aria-expanded", "false");
    searchBtn.focus();
  }
  var STOP = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, for: 1, in: 1, on: 1, my: 1, i: 1, do: 1, you: 1, is: 1, it: 1, how: 1, what: 1, can: 1, your: 1, with: 1, does: 1 };
  function terms(q) {
    return (q.toLowerCase().match(/[a-z0-9$]+/g) || []).filter(function (w) { return w.length > 1 && !STOP[w]; });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function search(q) {
    var ts = terms(q);
    if (!ts.length || !index) return [];
    return index.map(function (p) {
      var t = (p.t || "").toLowerCase(), h = (p.h || "").toLowerCase(), d = (p.d || "").toLowerCase(), x = (p.x || "").toLowerCase();
      var s = 0, hit = 0;
      ts.forEach(function (w) {
        var m = 0;
        if (t.indexOf(w) > -1) { s += 6; m = 1; if (t.indexOf(w) === 0) s += 5; }
        if (h.indexOf(w) > -1) { s += 3; m = 1; }
        if (d.indexOf(w) > -1) { s += 2; m = 1; }
        if (x.indexOf(w) > -1) { s += 1; m = 1; }
        hit += m;
      });
      if (hit < ts.length) s = s * hit / ts.length / 2;   // pages matching every word rank first
      return { p: p, s: s };
    }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8).map(function (r) { return r.p; });
  }
  function render() {
    var q = input.value.trim();
    if (!q) { box.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
    items = search(q); sel = -1;
    box.innerHTML = items.length
      ? items.map(function (p, i) { return '<a role="option" id="ss-o' + i + '" href="' + esc(p.u) + '"><b>' + esc(p.t) + "</b><span>" + esc(p.d || "") + "</span></a>"; }).join("")
      : '<p class="ss-none">No matches. Try a service, a town, or a question, or <a href="/contact">ask Michael</a>.</p>';
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  function move(dir) {
    var opts = box.querySelectorAll("a[role=option]");
    if (!opts.length) return;
    sel = (sel + dir + opts.length) % opts.length;
    opts.forEach(function (o, i) { o.setAttribute("aria-selected", i === sel ? "true" : "false"); });
    input.setAttribute("aria-activedescendant", "ss-o" + sel);
    opts[sel].scrollIntoView({ block: "nearest" });
  }

  searchBtn.addEventListener("click", function () { form.hidden ? openSearch() : closeSearch(); });
  form.querySelector("[data-close-search]").addEventListener("click", closeSearch);
  input.addEventListener("input", function () { (index ? Promise.resolve() : load()).then(render); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var opts = box.querySelectorAll("a[role=option]");
    var go = opts[sel > -1 ? sel : 0];
    if (go) location.href = go.getAttribute("href");
  });
  document.addEventListener("click", function (e) { if (!form.hidden && !form.contains(e.target) && !searchBtn.contains(e.target)) closeSearch(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && form.hidden && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openSearch(); }
  });
})();
