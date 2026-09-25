// Bamboo Flags — small vanilla behaviours. Each init is a no-op when its markup is absent.
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(el) { el.classList.remove('hidden'); el.classList.add('flex'); }
  function hide(el) { el.classList.add('hidden'); el.classList.remove('flex'); }

  // ── Header: Services dropdown ─────────────────────────
  function initDropdown() {
    var root = document.querySelector('[data-dropdown]');
    if (!root) return;
    var trigger = root.querySelector('[data-dropdown-trigger]');
    var panel = root.querySelector('[data-dropdown-panel]');

    function setOpen(open) {
      trigger.setAttribute('aria-expanded', String(open));
      open ? show(panel) : hide(panel);
    }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(trigger.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        trigger.focus();
      }
    });
  }

  // ── Header: mobile menu ───────────────────────────────
  function initMobileNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var panel = document.querySelector('[data-nav-panel]');
    if (!toggle || !panel) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      open ? show(panel) : hide(panel);
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    // Following an in-page link (e.g. #book) closes the menu.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  // ── Home: task ledger ─────────────────────────────────
  // step advances 0→7 every 1300ms; rows below min(step,5) read "Automated".
  function initLedger() {
    var list = document.querySelector('[data-ledger]');
    if (!list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll('.ledger-row'));
    var step = 0;
    var timer = null;

    function render() {
      var done = Math.min(step, rows.length);
      rows.forEach(function (row, i) {
        row.classList.toggle('is-done', i < done);
        row.classList.toggle('is-active', i === done - 1 && !reducedMotion);
      });
    }
    function start() {
      if (timer) return;
      timer = setInterval(function () { step = (step + 1) % 8; render(); }, 1300);
    }
    function stop() { clearInterval(timer); timer = null; }

    if (reducedMotion) { step = rows.length; render(); return; }
    render();
    start();
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  }

  // ── Home: Cal.com inline embed, loaded when the booking section nears the viewport ──
  function initCal() {
    var el = document.querySelector('[data-cal-embed]');
    if (!el) return;
    var loaded = false;

    function load() {
      if (loaded) return;
      loaded = true;
      var ns = el.getAttribute('data-cal-namespace');
      /* Official Cal.com loader snippet */
      (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', ns, { origin: 'https://app.cal.com' });
      window.Cal.ns[ns]('inline', {
        elementOrSelector: '#' + el.id,
        config: { layout: 'month_view', theme: 'dark' },
        calLink: el.getAttribute('data-cal-link')
      });
      window.Cal.ns[ns]('ui', {
        theme: 'dark',
        hideEventTypeDetails: false,
        layout: 'month_view',
        cssVarsPerTheme: { dark: { 'cal-brand': '#9184d9' } }
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); load(); }
      }, { rootMargin: '600px 0px' });
      io.observe(el);
    } else {
      load();
    }
  }

  // ── Blog index: topic filter ──────────────────────────
  function initTopicFilter() {
    var group = document.querySelector('[data-topic-filters]');
    var list = document.querySelector('[data-post-list]');
    if (!group || !list) return;
    var empty = document.querySelector('[data-post-empty]');
    var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-topic-filter]'));
    var items = Array.prototype.slice.call(list.querySelectorAll('[data-topic]'));

    group.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-topic-filter]');
      if (!btn) return;
      var topic = btn.getAttribute('data-topic-filter');
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var visible = 0;
      items.forEach(function (li) {
        var match = topic === 'All' || li.getAttribute('data-topic') === topic;
        li.hidden = !match;
        if (match) visible++;
      });
      if (empty) empty.classList.toggle('hidden', visible > 0);
    });
  }

  // ── Blog article: reading progress ────────────────────
  function initReadProgress() {
    var bar = document.querySelector('[data-read-progress]');
    if (!bar) return;
    var queued = false;
    function update() {
      queued = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      bar.style.width = (p * 100).toFixed(1) + '%';
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ── Careers: submit via fetch, then show the success panel ──
  function initApplicationForm() {
    var form = document.querySelector('[data-application-form]');
    if (!form) return;
    var success = document.querySelector('[data-form-success]');
    var error = document.querySelector('[data-form-error]');

    function showSuccess() {
      form.hidden = true;
      if (error) error.classList.add('hidden');
      show(success);
      success.focus();
    }

    // No-JS fallback redirects back with ?success=true
    if (/[?&]success=true/.test(window.location.search)) {
      showSuccess();
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      var data = new FormData(form);
      data.delete('redirect');
      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().then(function (json) { return res.ok && json.success; }); })
        .then(function (ok) {
          if (ok) { showSuccess(); return; }
          throw new Error('submit failed');
        })
        .catch(function () {
          button.disabled = false;
          if (error) error.classList.remove('hidden');
        });
    });
  }

  initDropdown();
  initMobileNav();
  initLedger();
  initCal();
  initTopicFilter();
  initReadProgress();
  initApplicationForm();
})();
