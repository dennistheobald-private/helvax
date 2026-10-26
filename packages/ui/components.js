/* ==========================================================================
   Helvax UI · Behaviour
   Dependency-free. Call HelvaxUI.init(root?) once after markup is in the DOM
   (it runs automatically on DOMContentLoaded). Every component is wired by a
   data-hx-* attribute, so React/Next wrappers can call the same functions
   or reimplement them against identical markup.
   ========================================================================== */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var once = function (el, key) { if (el["__hx_" + key]) return false; el["__hx_" + key] = true; return true; };

  /* Tabs: [data-hx-tabs] > [role=tablist] > [role=tab][aria-controls] ------ */
  function tabs(root) {
    $$("[data-hx-tabs]", root).forEach(function (wrap) {
      if (!once(wrap, "tabs")) return;
      var list = wrap.querySelector("[role=tablist]");
      var tabEls = $$("[role=tab]", list);
      function select(tab, focus) {
        tabEls.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", on);
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }
      tabEls.forEach(function (t) {
        t.addEventListener("click", function () { select(t); });
        t.addEventListener("keydown", function (e) {
          var i = tabEls.indexOf(t), n = tabEls.length, next = null;
          if (e.key === "ArrowRight") next = tabEls[(i + 1) % n];
          if (e.key === "ArrowLeft") next = tabEls[(i - 1 + n) % n];
          if (e.key === "Home") next = tabEls[0];
          if (e.key === "End") next = tabEls[n - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
      select(tabEls.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabEls[0]);
    });
  }

  /* Dialog & Drawer: native <dialog>; [data-hx-open="id"], [data-hx-close] - */
  function dialogs(root) {
    $$("[data-hx-open]", root).forEach(function (btn) {
      if (!once(btn, "open")) return;
      btn.addEventListener("click", function () {
        var d = document.getElementById(btn.getAttribute("data-hx-open"));
        if (d && d.showModal) { d.__sgReturn = btn; d.showModal(); }
      });
    });
    $$("dialog.hx-dialog, dialog.hx-drawer", root).forEach(function (d) {
      if (!once(d, "dialog")) return;
      d.addEventListener("click", function (e) {
        if (e.target === d) d.close("backdrop");            // backdrop click
        var c = e.target.closest("[data-hx-close]");
        if (c && d.contains(c)) d.close(c.value || c.getAttribute("data-hx-close") || "close");
      });
      d.addEventListener("close", function () {
        if (d.__sgReturn) d.__sgReturn.focus();             // restore focus
        d.dispatchEvent(new CustomEvent("hx:close", { detail: d.returnValue, bubbles: true }));
      });
    });
  }

  /* Switch: <button role="switch" aria-checked> ---------------------------- */
  function switches(root) {
    $$("button[role=switch]", root).forEach(function (s) {
      if (!once(s, "switch")) return;
      s.addEventListener("click", function () {
        var on = s.getAttribute("aria-checked") !== "true";
        s.setAttribute("aria-checked", on);
        s.dispatchEvent(new CustomEvent("hx:change", { detail: on, bubbles: true }));
      });
    });
  }

  /* Tooltip: Escape dismisses until pointer/focus leaves (WCAG 1.4.13) ---- */
  function tooltips(root) {
    $$(".hx-tooltip", root).forEach(function (t) {
      if (!once(t, "tip")) return;
      t.addEventListener("keydown", function (e) { if (e.key === "Escape") t.setAttribute("data-dismissed", ""); });
      ["mouseleave", "focusout"].forEach(function (ev) { t.addEventListener(ev, function () { t.removeAttribute("data-dismissed"); }); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") $$(".hx-tooltip:hover").forEach(function (t) { t.setAttribute("data-dismissed", ""); });
    });
  }

  /* Popover: [data-hx-popover] button with aria-controls + aria-expanded --- */
  function popovers(root) {
    $$("[data-hx-popover]", root).forEach(function (btn) {
      if (!once(btn, "pop")) return;
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      function set(open) { btn.setAttribute("aria-expanded", open); panel.hidden = !open; if (open) { var f = panel.querySelector("button, [href], input"); if (f) f.focus(); } }
      btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
      panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); btn.focus(); } });
      panel.addEventListener("click", function (e) { if (e.target.closest("[data-hx-close]")) { set(false); btn.focus(); } });
      document.addEventListener("click", function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) set(false); });
    });
  }

  /* Toast ------------------------------------------------------------------ */
  var ICONS = {
    success: '<path d="M4 10.5l4 4 8-9"/>',
    danger: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5M10 13.5v.01"/>',
    info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v4.5M10 6.5v.01"/>',
    brand: '<circle cx="10" cy="10" r="2"/><path d="M5.8 5.8a6 6 0 000 8.4M14.2 5.8a6 6 0 010 8.4"/>'
  };
  function region() {
    var r = document.querySelector(".hx-toast-region");
    if (!r) { r = document.createElement("div"); r.className = "hx-toast-region"; r.setAttribute("aria-live", "polite"); r.setAttribute("aria-relevant", "additions"); document.body.appendChild(r); }
    return r;
  }
  function toast(opts) {
    opts = opts || {};
    var tone = opts.tone || "info";
    var el = document.createElement("div");
    el.className = "hx-toast hx-toast--" + tone;
    el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.innerHTML = '<svg class="hx-icon" viewBox="0 0 20 20" aria-hidden="true">' + (ICONS[tone] || ICONS.info) + '</svg>' +
      '<div><div class="hx-toast__title"></div>' + (opts.body ? '<div class="hx-toast__body"></div>' : "") + '</div>' +
      '<button class="hx-btn hx-btn--ghost hx-btn--icon hx-btn--sm" type="button" aria-label="Dismiss notification"><svg class="hx-icon hx-icon--sm" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button>';
    el.querySelector(".hx-toast__title").textContent = opts.title || "";
    if (opts.body) el.querySelector(".hx-toast__body").textContent = opts.body;
    var timer;
    function dismiss() { clearTimeout(timer); el.setAttribute("data-leaving", ""); setTimeout(function () { el.remove(); }, 220); }
    el.querySelector("button").addEventListener("click", dismiss);
    // pause auto-dismiss while hovered or focused (WCAG 2.2.1)
    function arm() { if (opts.timeout !== 0) timer = setTimeout(dismiss, opts.timeout || 6000); }
    el.addEventListener("mouseenter", function () { clearTimeout(timer); });
    el.addEventListener("focusin", function () { clearTimeout(timer); });
    el.addEventListener("mouseleave", arm);
    region().appendChild(el); arm();
    return { dismiss: dismiss, el: el };
  }
  function toastTriggers(root) {
    $$("[data-hx-toast]", root).forEach(function (b) {
      if (!once(b, "toast")) return;
      b.addEventListener("click", function () { toast({ tone: b.getAttribute("data-hx-toast"), title: b.getAttribute("data-title"), body: b.getAttribute("data-body") }); });
    });
  }

  /* DataTable: sortable headers + row selection ---------------------------- */
  function tables(root) {
    $$("table[data-hx-table]", root).forEach(function (table) {
      if (!once(table, "table")) return;
      var tbody = table.tBodies[0];
      $$("th .hx-table__sort", table).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var th = btn.closest("th"), idx = Array.prototype.indexOf.call(th.parentNode.children, th);
          var dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
          $$("th[aria-sort]", table).forEach(function (h) { h.removeAttribute("aria-sort"); });
          th.setAttribute("aria-sort", dir);
          var rows = Array.prototype.slice.call(tbody.rows);
          rows.sort(function (a, b) {
            var x = a.cells[idx].getAttribute("data-value") || a.cells[idx].textContent.trim();
            var y = b.cells[idx].getAttribute("data-value") || b.cells[idx].textContent.trim();
            var nx = parseFloat(x), ny = parseFloat(y);
            var r = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y);
            return dir === "ascending" ? r : -r;
          });
          rows.forEach(function (r) { tbody.appendChild(r); });
        });
      });
      var all = table.querySelector("[data-hx-select-all]");
      var boxes = $$("tbody input[type=checkbox]", table);
      function sync() {
        var n = boxes.filter(function (b) { return b.checked; }).length;
        boxes.forEach(function (b) { b.closest("tr").setAttribute("aria-selected", b.checked); });
        if (all) { all.checked = n === boxes.length && n > 0; all.indeterminate = n > 0 && n < boxes.length; }
        table.dispatchEvent(new CustomEvent("hx:selection", { detail: n, bubbles: true }));
      }
      boxes.forEach(function (b) { b.addEventListener("change", sync); });
      if (all) all.addEventListener("change", function () { boxes.forEach(function (b) { b.checked = all.checked; }); sync(); });
      sync();
    });
  }

  /* Pagination: <nav data-hx-pagination data-pages data-current> ---------- */
  function pagination(root) {
    $$("[data-hx-pagination]", root).forEach(function (nav) {
      if (!once(nav, "pag")) return;
      var pages = +nav.getAttribute("data-pages"), cur = +nav.getAttribute("data-current") || 1;
      var list = nav.querySelector(".hx-pagination__list"), status = nav.querySelector("[data-hx-page-status]");
      var per = +nav.getAttribute("data-per-page") || 25, total = +nav.getAttribute("data-total") || pages * per;
      function btn(label, page, opts) {
        var li = document.createElement("li"), b = document.createElement("button");
        b.type = "button"; b.className = "hx-pagination__btn"; b.innerHTML = label;
        if (opts && opts.aria) b.setAttribute("aria-label", opts.aria);
        if (page === cur && !(opts && opts.nav)) b.setAttribute("aria-current", "page");
        if (opts && opts.disabled) b.disabled = true;
        b.addEventListener("click", function () { cur = page; render(); var c = list.querySelector("[aria-current]") || b; c.focus(); });
        li.appendChild(b); return li;
      }
      function render() {
        list.innerHTML = "";
        list.appendChild(btn("‹", Math.max(1, cur - 1), { aria: "Previous page", nav: true, disabled: cur === 1 }));
        var shown = [1, cur - 1, cur, cur + 1, pages].filter(function (p, i, a) { return p >= 1 && p <= pages && a.indexOf(p) === i; }).sort(function (a, b) { return a - b; });
        shown.forEach(function (p, i) {
          if (i && p - shown[i - 1] > 1) { var g = document.createElement("li"); g.className = "hx-pagination__gap"; g.textContent = "…"; g.setAttribute("aria-hidden", "true"); list.appendChild(g); }
          list.appendChild(btn(String(p), p, { aria: "Page " + p }));
        });
        list.appendChild(btn("›", Math.min(pages, cur + 1), { aria: "Next page", nav: true, disabled: cur === pages }));
        if (status) status.textContent = "Showing " + ((cur - 1) * per + 1) + "–" + Math.min(cur * per, total) + " of " + total;
        nav.dispatchEvent(new CustomEvent("hx:page", { detail: cur, bubbles: true }));
      }
      render();
    });
  }

  /* UploadDropzone: [data-hx-dropzone] with input[type=file] --------------- */
  function fmtBytes(n) { return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  function dropzones(root) {
    $$("[data-hx-dropzone]", root).forEach(function (zone) {
      if (!once(zone, "drop")) return;
      var input = zone.querySelector("input[type=file]");
      var list = document.getElementById(zone.getAttribute("data-hx-filelist"));
      var accept = (input.getAttribute("accept") || "").split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      var maxBytes = +zone.getAttribute("data-max-bytes") || 5 * 1048576;
      ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.setAttribute("data-dragging", ""); }); });
      ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function () { zone.removeAttribute("data-dragging"); }); });
      zone.addEventListener("drop", function (e) { e.preventDefault(); handle(e.dataTransfer.files); });
      input.addEventListener("change", function () { handle(input.files); });
      function handle(files) {
        Array.prototype.forEach.call(files, function (f) {
          var ext = "." + f.name.split(".").pop().toLowerCase();
          var err = accept.length && accept.indexOf(ext) < 0 ? "Only " + accept.join(", ") + " files can be imported." :
                    f.size > maxBytes ? "This file is larger than " + fmtBytes(maxBytes) + "." : "";
          zone.setAttribute("data-state", err ? "error" : "ok");
          if (!list) return;
          var li = document.createElement("li"); li.className = "hx-file";
          li.innerHTML = '<span class="hx-badge ' + (err ? "hx-badge--danger" : "hx-badge--brand") + '">' + ext.slice(1).toUpperCase() + '</span><div style="min-width:0"><div class="hx-file__name"></div><div class="hx-file__meta"></div></div><button type="button" class="hx-btn hx-btn--ghost hx-btn--icon hx-btn--sm" aria-label="Remove file"><svg class="hx-icon hx-icon--sm" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button>';
          li.querySelector(".hx-file__name").textContent = f.name;
          var meta = li.querySelector(".hx-file__meta");
          meta.textContent = err || fmtBytes(f.size) + " · checking rows…";
          if (err) meta.style.color = "var(--danger)";
          li.querySelector("button").addEventListener("click", function () { li.remove(); zone.removeAttribute("data-state"); input.value = ""; });
          list.appendChild(li);
          if (!err && ext === ".csv" && window.FileReader) {
            var r = new FileReader();
            r.onload = function () {
              var lines = String(r.result).split(/\r?\n/).filter(function (l) { return l.trim(); });
              var header = (lines[0] || "").toLowerCase();
              var ok = header.indexOf("email") > -1;
              meta.textContent = fmtBytes(f.size) + " · " + Math.max(0, lines.length - 1) + " rows" + (ok ? " · ready for dry-run validation" : " · no email column found");
              if (!ok) meta.style.color = "var(--warning)";
            };
            r.readAsText(f.slice(0, 2 * 1048576));
          } else if (!err) { meta.textContent = fmtBytes(f.size); }
          zone.dispatchEvent(new CustomEvent("hx:file", { detail: { file: f, error: err }, bubbles: true }));
        });
      }
    });
  }

  /* DateRangePicker: [data-hx-daterange] with presets + two date inputs ---- */
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dateranges(root) {
    $$("[data-hx-daterange]", root).forEach(function (w) {
      if (!once(w, "dr")) return;
      var from = w.querySelector("[data-hx-from]"), to = w.querySelector("[data-hx-to]"), sum = w.querySelector(".hx-daterange__summary");
      var chips = $$("[data-hx-preset]", w);
      var anchor = w.getAttribute("data-today") ? new Date(w.getAttribute("data-today") + "T12:00:00") : new Date();
      function update() {
        var a = new Date(from.value + "T12:00:00"), b = new Date(to.value + "T12:00:00");
        var bad = from.value && to.value && a > b;
        to.setAttribute("aria-invalid", bad ? "true" : "false");
        var days = Math.round((b - a) / 864e5) + 1;
        sum.textContent = bad ? "The end date is before the start date. Pick a later end date." :
          (from.value && to.value ? days + " days · " + a.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " – " + b.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Pick a start and end date.");
        sum.style.color = bad ? "var(--danger)" : "";
        w.dispatchEvent(new CustomEvent("hx:range", { detail: { from: from.value, to: to.value, valid: !bad }, bubbles: true }));
      }
      chips.forEach(function (c) {
        c.addEventListener("click", function () {
          var p = c.getAttribute("data-hx-preset"), end = new Date(anchor), start = new Date(anchor);
          if (p === "month") start.setDate(1);
          else if (p === "lastmonth") { start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1); end = new Date(anchor.getFullYear(), anchor.getMonth(), 0); }
          else start.setDate(start.getDate() - (+p - 1));
          from.value = iso(start); to.value = iso(end);
          chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
          update();
        });
      });
      [from, to].forEach(function (i) { i.addEventListener("change", function () { chips.forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); update(); }); });
      var pre = chips.filter(function (c) { return c.getAttribute("aria-pressed") === "true"; })[0];
      if (pre) pre.click(); else update();
    });
  }

  /* App shell mobile nav: [data-hx-nav-toggle] inside .hx-shell ----------- */
  function shells(root) {
    $$("[data-hx-nav-toggle]", root).forEach(function (b) {
      if (!once(b, "nav")) return;
      var shell = b.closest(".hx-shell");
      b.addEventListener("click", function () {
        var open = !shell.hasAttribute("data-nav-open");
        shell.toggleAttribute("data-nav-open", open); b.setAttribute("aria-expanded", open);
        if (open) { var l = shell.querySelector(".hx-sidebar a"); if (l) l.focus(); }
      });
      shell.addEventListener("keydown", function (e) { if (e.key === "Escape" && shell.hasAttribute("data-nav-open")) { shell.removeAttribute("data-nav-open"); b.setAttribute("aria-expanded", "false"); b.focus(); } });
    });
  }

  /* Charts ----------------------------------------------------------------- */
  function svgEl(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function niceMax(v) { var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

  // lineChart(plotEl, { labels:[], series:[{name, values, tone:"highlight"|"neutral", dashed}], format })
  function lineChart(plot, cfg) {
    plot.innerHTML = "";
    var W = 640, H = 260, m = { t: 12, r: 16, b: 28, l: 40 };
    var fmt = cfg.format || function (v) { return v; };
    var max = cfg.yMax || niceMax(Math.max.apply(null, cfg.series.reduce(function (a, s) { return a.concat(s.values); }, [])));
    var n = cfg.labels.length;
    var x = function (i) { return m.l + (i * (W - m.l - m.r)) / (n - 1); };
    var y = function (v) { return m.t + (H - m.t - m.b) * (1 - v / max); };
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": cfg.label || "Line chart" }, plot);
    for (var g = 0; g <= 4; g++) {
      var v = (max * g) / 4;
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--chart-grid)", "stroke-width": 1 }, svg);
      svgEl("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, svg).textContent = fmt(v);
    }
    cfg.labels.forEach(function (l, i) { if (n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1) svgEl("text", { x: x(i), y: H - 8, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, svg).textContent = l; });
    // neutral first so the highlight draws on top
    var ordered = cfg.series.slice().sort(function (a, b) { return (a.tone === "highlight") - (b.tone === "highlight"); });
    ordered.forEach(function (s) {
      var color = s.tone === "highlight" ? "var(--chart-highlight)" : "var(--chart-neutral)";
      var d = s.values.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      if (s.tone === "highlight") svgEl("path", { d: d + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z", fill: "var(--chart-highlight)", "fill-opacity": 0.1, stroke: "none" }, svg);
      svgEl("path", { d: d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": s.dashed ? "5 4" : "none" }, svg);
      var li = s.values.length - 1;
      svgEl("circle", { cx: x(li), cy: y(s.values[li]), r: 4.5, fill: color, stroke: "var(--canvas)", "stroke-width": 2 }, svg);
    });
    // hover layer
    var cross = svgEl("line", { y1: m.t, y2: H - m.b, stroke: "var(--border-strong)", "stroke-width": 1, visibility: "hidden" }, svg);
    var dots = cfg.series.map(function (s) { return svgEl("circle", { r: 4.5, fill: s.tone === "highlight" ? "var(--chart-highlight)" : "var(--chart-neutral)", stroke: "var(--canvas)", "stroke-width": 2, visibility: "hidden" }, svg); });
    var hit = svgEl("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent", tabindex: 0, "aria-label": "Explore values; use left and right arrow keys" }, svg);
    var tip = document.createElement("div"); tip.className = "hx-chart__tip"; tip.hidden = true; plot.appendChild(tip);
    var cur = -1;
    function show(i) {
      cur = i; var px = x(i);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
      cfg.series.forEach(function (s, k) { dots[k].setAttribute("cx", px); dots[k].setAttribute("cy", y(s.values[i])); dots[k].setAttribute("visibility", "visible"); });
      tip.innerHTML = "<div>" + cfg.labels[i] + "</div>" + cfg.series.map(function (s) { return "<div>" + s.name + ": <b>" + fmt(s.values[i]) + "</b></div>"; }).join("");
      var r = svg.getBoundingClientRect(), sc = r.width / W;
      tip.style.left = Math.min(Math.max(px * sc, 80), r.width - 80) + "px";
      tip.style.top = Math.min.apply(null, cfg.series.map(function (s) { return y(s.values[i]); })) * sc + "px";
      tip.hidden = false;
    }
    function hide() { cur = -1; tip.hidden = true; cross.setAttribute("visibility", "hidden"); dots.forEach(function (d) { d.setAttribute("visibility", "hidden"); }); }
    hit.addEventListener("pointermove", function (e) { var r = svg.getBoundingClientRect(); var vx = ((e.clientX - r.left) / r.width) * W; show(Math.max(0, Math.min(n - 1, Math.round(((vx - m.l) / (W - m.l - m.r)) * (n - 1))))); });
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("blur", hide);
    hit.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(n - 1, cur + 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, cur < 0 ? n - 1 : cur - 1)); }
      if (e.key === "Escape") hide();
    });
  }

  // barChart(plotEl, { labels:[], values:[], highlight: index, format })
  function barChart(plot, cfg) {
    plot.innerHTML = "";
    var W = 640, H = 240, m = { t: 20, r: 8, b: 28, l: 8 };
    var fmt = cfg.format || function (v) { return v; };
    var max = cfg.yMax || niceMax(Math.max.apply(null, cfg.values));
    var n = cfg.values.length, slot = (W - m.l - m.r) / n, bw = Math.min(56, slot * 0.62);
    var y = function (v) { return m.t + (H - m.t - m.b) * (1 - v / max); };
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": cfg.label || "Bar chart" }, plot);
    svgEl("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: "var(--border-strong)", "stroke-width": 1 }, svg);
    var tip = document.createElement("div"); tip.className = "hx-chart__tip"; tip.hidden = true; plot.appendChild(tip);
    cfg.values.forEach(function (v, i) {
      var cx = m.l + slot * i + slot / 2, top = y(v), h = y(0) - top, r = Math.min(4, h);
      var hi = i === cfg.highlight;
      // rounded data-end, square baseline
      var d = "M" + (cx - bw / 2) + " " + y(0) + " V" + (top + r) + " Q" + (cx - bw / 2) + " " + top + " " + (cx - bw / 2 + r) + " " + top + " H" + (cx + bw / 2 - r) + " Q" + (cx + bw / 2) + " " + top + " " + (cx + bw / 2) + " " + (top + r) + " V" + y(0) + " Z";
      svgEl("path", { d: d, fill: hi ? "var(--chart-highlight)" : "var(--chart-neutral)", "fill-opacity": hi ? 1 : 0.55 }, svg);
      svgEl("text", { x: cx, y: H - 8, "text-anchor": "middle" }, svg).textContent = cfg.labels[i];
      if (hi || i === n - 1) svgEl("text", { x: cx, y: top - 6, "text-anchor": "middle", style: "fill:var(--ink);font-weight:600" }, svg).textContent = fmt(v);
      var hit = svgEl("rect", { x: m.l + slot * i, y: m.t, width: slot, height: H - m.t - m.b, fill: "transparent", tabindex: 0, "aria-label": cfg.labels[i] + ": " + fmt(v) }, svg);
      function show() { var R = svg.getBoundingClientRect(), sc = R.width / W; tip.innerHTML = cfg.labels[i] + "<div><b>" + fmt(v) + "</b> " + (cfg.unit || "") + "</div>"; tip.style.left = Math.min(Math.max(cx * sc, 80), R.width - 80) + "px"; tip.style.top = top * sc + "px"; tip.hidden = false; }
      hit.addEventListener("pointerenter", show); hit.addEventListener("focus", show);
      hit.addEventListener("pointerleave", function () { tip.hidden = true; }); hit.addEventListener("blur", function () { tip.hidden = true; });
    });
  }

  // sparkline(svgEl, values) — for StatCard
  function sparkline(svg, values) {
    var W = 120, H = 36, max = Math.max.apply(null, values), min = Math.min.apply(null, values), n = values.length;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("preserveAspectRatio", "none");
    var pts = values.map(function (v, i) { return [2 + (i * (W - 4)) / (n - 1), 4 + (H - 8) * (1 - (v - min) / (max - min || 1))]; });
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    svgEl("path", { d: d + " L" + (W - 2) + " " + H + " L2 " + H + " Z", fill: "var(--chart-highlight)", "fill-opacity": 0.12 }, svg);
    svgEl("path", { d: d, fill: "none", stroke: "var(--chart-highlight)", "stroke-width": 2, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" }, svg);
  }

  function charts(root) {
    $$("[data-hx-chart]", root).forEach(function (el) {
      if (!once(el, "chart")) return;
      var cfg; try { cfg = JSON.parse(el.getAttribute("data-hx-chart")); } catch (e) { return; }
      if (cfg.suffix) cfg.format = function (v) { return (Math.round(v * 10) / 10) + cfg.suffix; };
      (cfg.type === "bar" ? barChart : lineChart)(el, cfg);
    });
    $$("svg[data-hx-spark]", root).forEach(function (s) { if (once(s, "spark")) sparkline(s, JSON.parse(s.getAttribute("data-hx-spark"))); });
    $$("[data-hx-chart-table]", root).forEach(function (b) {
      if (!once(b, "ct")) return;
      var t = document.getElementById(b.getAttribute("aria-controls"));
      b.addEventListener("click", function () { var open = t.hidden; t.hidden = !open; b.setAttribute("aria-expanded", open); b.textContent = open ? "Hide data table" : "Show data table"; });
    });
  }

  /* Loading button helper -------------------------------------------------- */
  function setLoading(btn, on, label) {
    btn.setAttribute("aria-busy", on ? "true" : "false");
    btn.disabled = !!on;
    if (label) btn.setAttribute("aria-label", on ? label : "");
  }
  function loadingDemos(root) {
    $$("[data-hx-loading-demo]", root).forEach(function (b) {
      if (!once(b, "ld")) return;
      b.addEventListener("click", function () { setLoading(b, true); setTimeout(function () { setLoading(b, false); toast({ tone: "success", title: b.getAttribute("data-done") || "Done" }); }, 1600); });
    });
  }

  function init(root) {
    [tabs, dialogs, switches, tooltips, popovers, toastTriggers, tables, pagination, dropzones, dateranges, shells, charts, loadingDemos].forEach(function (f) { f(root || document); });
  }

  window.HelvaxUI = { init: init, toast: toast, lineChart: lineChart, barChart: barChart, sparkline: sparkline, setLoading: setLoading };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); }); else init();
})();
