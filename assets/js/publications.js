/*
 * Filtros de publicaciones: búsqueda libre, línea, tipo y destacadas.
 * Genera BibTeX a partir de los atributos data-* de cada publicación.
 * El listado completo está en el HTML, así que funciona sin JavaScript.
 */
(function () {
  "use strict";

  var list = document.getElementById("pub-list");
  if (!list) return;

  var pubs = Array.prototype.slice.call(list.querySelectorAll(".pub"));
  var years = Array.prototype.slice.call(list.querySelectorAll(".pub-year"));
  var search = document.getElementById("pub-search");
  var typeSel = document.getElementById("pub-type");
  var selOnly = document.getElementById("pub-selected");
  var count = document.getElementById("pub-count");
  var empty = document.getElementById("pub-empty");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var state = { q: "", line: "all", type: "all", sel: false };
  var PREVIEW = 12;          // sin filtros, muestra solo las más recientes
  var expanded = false;
  var moreBtn = document.getElementById("pub-more");

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Índice de búsqueda precalculado
  pubs.forEach(function (p) {
    p._text = norm([p.dataset.title, p.dataset.authors, p.dataset.venue, p.dataset.year].join(" "));
  });

  function apply() {
    var terms = norm(state.q).split(/\s+/).filter(Boolean);
    var filtering = terms.length || state.line !== "all" || state.type !== "all" || state.sel;
    var limit = (filtering || expanded) ? Infinity : PREVIEW;
    var shown = 0, matched = 0;
    pubs.forEach(function (p) {
      var ok = (state.line === "all" || p.dataset.line === state.line) &&
               (state.type === "all" || p.dataset.type === state.type) &&
               (!state.sel || p.dataset.selected === "1") &&
               terms.every(function (t) { return p._text.indexOf(t) !== -1; });
      if (ok) matched++;
      var visible = ok && matched <= limit;
      p.hidden = !visible;
      if (visible) shown++;
    });
    moreBtn.hidden = !(limit !== Infinity && matched > limit);
    // Oculta los encabezados de año sin publicaciones visibles
    years.forEach(function (h) {
      var el = h.nextElementSibling, any = false;
      while (el && !el.classList.contains("pub-year")) {
        if (el.classList.contains("pub") && !el.hidden) { any = true; break; }
        el = el.nextElementSibling;
      }
      h.hidden = !any;
    });
    count.textContent = shown === pubs.length
      ? pubs.length + " publicaciones"
      : (filtering ? matched + " de " + pubs.length + " publicaciones"
                   : "Las " + shown + " más recientes de " + pubs.length);
    empty.hidden = matched !== 0;
  }

  function setLine(line) {
    state.line = line;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.line === line)); });
    apply();
  }

  function reset() {
    state = { q: "", line: "all", type: "all", sel: false };
    search.value = ""; typeSel.value = "all"; selOnly.checked = false;
    setLine("all");
  }

  var t;
  search.addEventListener("input", function () {
    clearTimeout(t);
    t = setTimeout(function () { state.q = search.value; apply(); }, 120);
  });
  typeSel.addEventListener("change", function () { state.type = typeSel.value; apply(); });
  selOnly.addEventListener("change", function () { state.sel = selOnly.checked; apply(); });
  chips.forEach(function (c) { c.addEventListener("click", function () { setLine(c.dataset.line); }); });
  document.getElementById("pub-reset").addEventListener("click", reset);
  moreBtn.textContent = "Mostrar las " + pubs.length + " publicaciones";
  moreBtn.addEventListener("click", function () {
    expanded = true; apply();
    // lleva el foco a la primera publicación recién mostrada
    var next = pubs[PREVIEW]; if (next) { var a = next.querySelector("a, button"); if (a) a.focus({ preventScroll: true }); }
  });
  apply();

  // Enlaces "Ver las N publicaciones de esta línea"
  document.querySelectorAll("[data-filter-line]").forEach(function (a) {
    a.addEventListener("click", function () {
      search.value = ""; state.q = ""; typeSel.value = "all"; state.type = "all";
      selOnly.checked = false; state.sel = false;
      setLine(a.dataset.filterLine);
    });
  });

  // ── BibTeX ───────────────────────────────────────────────
  var BIBTYPE = { journal: "article", outreach: "article", editorial: "article", conference: "inproceedings", chapter: "incollection", book: "book" };
  var VENUEFIELD = { article: "journal", inproceedings: "booktitle", incollection: "booktitle", book: "publisher" };

  function bibKey(p) {
    var first = (p.dataset.authors.split(";")[0] || "anon").trim();
    var last = first.split(" ").pop().split("-")[0];
    var word = (p.dataset.title.match(/[A-Za-zÀ-ÿ]{4,}/) || ["x"])[0];
    return norm(last).replace(/[^a-z]/g, "") + p.dataset.year + norm(word).replace(/[^a-z]/g, "");
  }

  function toBib(p) {
    var type = BIBTYPE[p.dataset.type] || "misc";
    var authors = p.dataset.authors.split(";").map(function (a) { return a.trim(); })
      .filter(function (a) { return a && a !== "et al."; }).join(" and ");
    if (/et al\./.test(p.dataset.authors)) authors += " and others";
    var lines = [
      "@" + type + "{" + bibKey(p) + ",",
      "  title     = {" + p.dataset.title + "},",
      "  author    = {" + authors + "},",
      "  " + (VENUEFIELD[type] + "          ").slice(0, 9) + " = {" + p.dataset.venue + "},",
      "  year      = {" + p.dataset.year + "}"
    ];
    if (p.dataset.doi) lines[lines.length - 1] += ",", lines.push("  doi       = {" + p.dataset.doi + "}");
    lines.push("}");
    return lines.join("\n");
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  list.addEventListener("click", function (e) {
    var btn = e.target.closest(".bib-btn");
    if (!btn) return;
    var p = btn.closest(".pub");
    var label = "Copiar BibTeX";
    copy(toBib(p)).then(function () { btn.textContent = "BibTeX copiado"; })
      .catch(function () { btn.textContent = "No se pudo copiar"; })
      .then(function () { setTimeout(function () { btn.textContent = label; }, 2000); });
  });
})();
