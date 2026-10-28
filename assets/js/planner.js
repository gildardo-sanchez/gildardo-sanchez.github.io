/*
 * Planificador bidireccional en miniatura para el encabezado.
 * Dos árboles (desde el inicio y desde la meta) se expanden con muestreo
 * aleatorio, esquivan obstáculos y se detienen al conectarse. Después se
 * suaviza la trayectoria encontrada. Sin dependencias.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("planner-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var replay = document.getElementById("planner-replay");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Espacio de trabajo normalizado (0..1). Los obstáculos dejan un pasaje estrecho.
  // Tres muros con aberturas alternadas obligan a una trayectoria en zigzag.
  var OBSTACLES = [
    { x: 0.23, y: 0.17, w: 0.05, h: 0.83 },
    { x: 0.49, y: 0.00, w: 0.05, h: 0.80 },
    { x: 0.75, y: 0.27, w: 0.05, h: 0.73 },
    { x: 0.08, y: 0.40, w: 0.09, h: 0.12 },
    { x: 0.34, y: 0.52, w: 0.09, h: 0.10 },
    { x: 0.61, y: 0.38, w: 0.08, h: 0.10 },
    { x: 0.86, y: 0.58, w: 0.08, h: 0.12 }
  ];
  var START = { x: 0.07, y: 0.86 };
  var GOAL = { x: 0.93, y: 0.12 };
  var STEP = 0.032;        // longitud máxima de cada extensión
  var MARGIN = 0.012;      // holgura respecto a los obstáculos
  var MAX_ITERS = 4000;

  var W = 0, H = 0, dpr = 1, raf = null, seed = 1;

  function colors() {
    var s = getComputedStyle(document.documentElement);
    var v = function (n) { return s.getPropertyValue(n).trim(); };
    return { a: v("--agave"), b: v("--indigo"), ink: v("--ink"), obs: v("--obstacle"), bg: v("--surface"), muted: v("--muted") };
  }

  // Generador pseudoaleatorio con semilla, para repeticiones distintas pero reproducibles.
  function rng() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function free(p) {
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return false;
    for (var i = 0; i < OBSTACLES.length; i++) {
      var o = OBSTACLES[i];
      if (p.x > o.x - MARGIN && p.x < o.x + o.w + MARGIN && p.y > o.y - MARGIN && p.y < o.y + o.h + MARGIN) return false;
    }
    return true;
  }

  function segmentFree(a, b) {
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var n = Math.max(2, Math.ceil(d / 0.006));
    for (var i = 1; i <= n; i++) {
      var t = i / n;
      if (!free({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
    }
    return true;
  }

  function nearest(tree, q) {
    var best = 0, bd = Infinity;
    for (var i = 0; i < tree.length; i++) {
      var d = (tree[i].x - q.x) * (tree[i].x - q.x) + (tree[i].y - q.y) * (tree[i].y - q.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function steer(from, to) {
    var dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy);
    if (d <= STEP) return { x: to.x, y: to.y };
    return { x: from.x + dx / d * STEP, y: from.y + dy / d * STEP };
  }

  // Extiende el árbol un paso hacia q. Devuelve el índice del nodo nuevo o -1.
  function extend(tree, q) {
    var i = nearest(tree, q);
    var p = steer(tree[i], q);
    if (!segmentFree(tree[i], p)) return -1;
    tree.push({ x: p.x, y: p.y, parent: i });
    return tree.length - 1;
  }

  // Intenta llevar el árbol hasta q con varios pasos seguidos (estilo "connect").
  function connect(tree, q) {
    var last = -1;
    for (var k = 0; k < 60; k++) {
      var idx = extend(tree, q);
      if (idx < 0) return { reached: false, idx: last };
      last = idx;
      var n = tree[idx];
      if (Math.abs(n.x - q.x) < 1e-9 && Math.abs(n.y - q.y) < 1e-9) return { reached: true, idx: idx };
    }
    return { reached: false, idx: last };
  }

  function branch(tree, idx) {
    var out = [];
    while (idx !== undefined && idx >= 0) { out.push(tree[idx]); idx = tree[idx].parent; }
    return out;
  }

  function shortcut(path) {
    var out = [path[0]], i = 0;
    while (i < path.length - 1) {
      var j = path.length - 1;
      while (j > i + 1 && !segmentFree(path[i], path[j])) j--;
      out.push(path[j]); i = j;
    }
    return out;
  }

  // Ejecuta el planificador completo y registra el orden en que aparecen las aristas.
  function plan() {
    var A = [{ x: START.x, y: START.y, parent: -1 }];
    var B = [{ x: GOAL.x, y: GOAL.y, parent: -1 }];
    var edges = []; // {tree: 'a'|'b', from, to}
    var trees = [A, B], tags = ["a", "b"];
    var path = null;

    function log(t, tag, from) {
      for (var i = from; i < t.length; i++) edges.push({ tag: tag, from: t[t[i].parent], to: t[i] });
    }

    // RRT bidireccional: ambos árboles crecen hacia muestras aleatorias y se
    // intenta unirlos cada vez que uno agrega un nodo.
    for (var it = 0; it < MAX_ITERS && !path; it++) {
      var s = it % 2, o = 1 - s;
      var T = trees[s], U = trees[o];
      var q = { x: rng(), y: rng() };
      var before = T.length;
      var idx = extend(T, q);
      log(T, tags[s], before);
      if (idx < 0) continue;
      var j = nearest(U, T[idx]);
      var d = Math.hypot(U[j].x - T[idx].x, U[j].y - T[idx].y);
      if (d < STEP * 2.2 && segmentFree(T[idx], U[j])) {
        edges.push({ tag: tags[s], from: T[idx], to: U[j] });
        var p1 = branch(T, idx), p2 = branch(U, j);
        path = s === 0 ? p1.reverse().concat(p2) : p2.reverse().concat(p1);
      }
    }
    return { edges: edges, path: path ? shortcut(path) : null, rough: path };
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function X(p) { return p.x * W; }
  function Y(p) { return p.y * H; }

  function drawScene(c) {
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.obs;
    OBSTACLES.forEach(function (o) { ctx.fillRect(o.x * W, o.y * H, o.w * W, o.h * H); });
  }

  function drawEdges(c, edges, upto) {
    ctx.lineWidth = 1;
    for (var i = 0; i < upto; i++) {
      var e = edges[i];
      ctx.strokeStyle = e.tag === "a" ? c.a : c.b;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(X(e.from), Y(e.from)); ctx.lineTo(X(e.to), Y(e.to)); ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(X(e.to) - 1, Y(e.to) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawPath(c, path, t) {
    if (!path) return;
    // longitud total para revelar progresivamente
    var segs = [], total = 0;
    for (var i = 1; i < path.length; i++) {
      var l = Math.hypot(X(path[i]) - X(path[i - 1]), Y(path[i]) - Y(path[i - 1]));
      segs.push(l); total += l;
    }
    var left = total * t;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(X(path[0]), Y(path[0]));
    for (var j = 1; j < path.length && left > 0; j++) {
      var f = Math.min(1, left / segs[j - 1]);
      ctx.lineTo(X(path[j - 1]) + (X(path[j]) - X(path[j - 1])) * f, Y(path[j - 1]) + (Y(path[j]) - Y(path[j - 1])) * f);
      left -= segs[j - 1];
    }
    ctx.stroke();
  }

  function drawEnds(c) {
    [[START, c.a], [GOAL, c.b]].forEach(function (pair) {
      ctx.fillStyle = pair[1];
      ctx.beginPath(); ctx.arc(X(pair[0]), Y(pair[0]), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.bg; ctx.lineWidth = 2; ctx.stroke();
    });
  }

  function run(animate) {
    if (raf) cancelAnimationFrame(raf);
    seed = currentSeed;
    resize();
    var c = colors();
    var result = plan();
    var n = result.edges.length;

    if (!animate) {
      drawScene(c); drawEdges(c, result.edges, n); drawPath(c, result.path, 1); drawEnds(c);
      return;
    }

    var growMs = 2200, pathMs = 700, t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var el = ts - t0;
      var g = Math.min(1, el / growMs);
      var eased = 1 - Math.pow(1 - g, 2);
      drawScene(c);
      drawEdges(c, result.edges, Math.floor(eased * n));
      if (g >= 1) drawPath(c, result.path, Math.min(1, (el - growMs) / pathMs));
      drawEnds(c);
      if (el < growMs + pathMs) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  function replan() {
    currentSeed = (Math.random() * 1e9) >>> 0;
    run(!reduceMotion.matches);
  }

  // Primera ejecución: semilla fija para un resultado estable y agradable.
  var currentSeed = 20021;
  var started = false;
  function start() {
    if (started) return; started = true;
    run(!reduceMotion.matches);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { start(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(canvas);
  } else { start(); }

  canvas.addEventListener("click", replan);
  if (replay) replay.addEventListener("click", replan);

  // Solo redibuja si cambia el ancho (en móvil, la barra del navegador cambia el alto al hacer scroll).
  var rt, lastW = canvas.getBoundingClientRect().width;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = canvas.getBoundingClientRect().width;
      if (Math.abs(w - lastW) < 1 || !started) return;
      lastW = w; run(false);
    }, 150);
  });
  // Redibuja al cambiar entre modo claro y oscuro.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var redraw = function () { run(false); };
    if (mq.addEventListener) mq.addEventListener("change", redraw);
  }
})();
