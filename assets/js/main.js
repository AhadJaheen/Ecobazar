/* =========================================================
   Ecobazar – interactions
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  var toastEl = $('#toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  /* ---------- Dropdowns (categories + nav) ---------- */
  var dropdowns = $$('.dropdown');
  function closeDropdowns(except) {
    dropdowns.forEach(function (dd) {
      if (dd === except) return;
      dd.classList.remove('is-open');
      var btn = $('button[aria-haspopup]', dd);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  dropdowns.forEach(function (dd) {
    var btn = $('button[aria-haspopup]', dd);
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains('is-open');
      closeDropdowns(dd);
      dd.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) closeDropdowns();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDropdowns(); closeModal(); }
  });

  /* ---------- Mobile menu ---------- */
  var navToggle = $('.nav-toggle');
  var navLinks = $('#nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = !navLinks.classList.contains('is-open');
      navLinks.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- Hero slider ---------- */
  (function () {
    var hero = $('.hero');
    if (!hero) return;
    var slides = $$('.slide', hero);
    var dots = $$('.hero__dots button', hero);
    var index = 0, timer = null;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === index);
        s.setAttribute('aria-hidden', n === index ? 'false' : 'true');
        // let hidden slides load their (lazy) image once they become active
        var img = $('img', s);
        if (img && n === index) img.loading = 'eager';
      });
      dots.forEach(function (d, n) {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-selected', n === index ? 'true' : 'false');
      });
    }
    function next() { show(index + 1); }
    function start() { if (!reduceMotion && !timer) timer = setInterval(next, 5500); }
    function stop() { clearInterval(timer); timer = null; }

    $('.hero__arrow--prev', hero).addEventListener('click', function () { show(index - 1); });
    $('.hero__arrow--next', hero).addEventListener('click', function () { show(index + 1); });
    dots.forEach(function (d, n) { d.addEventListener('click', function () { show(n); }); });

    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);

    // basic swipe support
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    show(0);
    start();
  })();

  /* ---------- Product tabs (filter) ---------- */
  (function () {
    var tabs = $$('.tabs__btn');
    var cards = $$('#product-grid .p-card');
    var note = $('#empty-note');
    var grid = $('#product-grid');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.getAttribute('data-filter');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var visible = 0;
        cards.forEach(function (c) {
          var show = f === 'all' || c.getAttribute('data-cat') === f;
          c.hidden = !show;
          if (show) visible++;
        });
        if (note) note.hidden = visible !== 0;
        if (grid) grid.hidden = visible === 0;
      });
    });
  })();

  /* ---------- Cart + wishlist ---------- */
  (function () {
    var countEl = $('#cart-count');
    var totalEl = $('#cart-total');
    var count = parseInt(countEl ? countEl.textContent : '0', 10) || 0;
    var total = parseFloat((totalEl ? totalEl.textContent : '0').replace(/[^0-9.]/g, '')) || 0;

    function render() {
      if (countEl) countEl.textContent = count;
      if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    }

    document.addEventListener('click', function (e) {
      var cartBtn = e.target.closest('.p-cart');
      if (cartBtn) {
        var price = parseFloat(cartBtn.getAttribute('data-price')) || 0;
        count += 1;
        total += price;
        render();
        toast((cartBtn.getAttribute('data-name') || 'Item') + ' added to cart');
        return;
      }
      var wish = e.target.closest('.p-action--wish');
      if (wish) {
        var on = wish.getAttribute('aria-pressed') !== 'true';
        wish.setAttribute('aria-pressed', String(on));
        toast(on ? 'Added to wishlist' : 'Removed from wishlist');
      }
    });
  })();

  /* ---------- Video modal ---------- */
  var modal = $('#video-modal');
  var frame = $('#video-frame');
  var lastFocus = null;

  function openModal(src) {
    if (!modal) return;
    lastFocus = document.activeElement;
    frame.innerHTML = '';
    if (src) {
      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(src)) {
        var v = document.createElement('video');
        v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true;
        frame.appendChild(v);
      } else {
        var f = document.createElement('iframe');
        f.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        f.title = 'Video player';
        frame.appendChild(f);
      }
    } else {
      frame.textContent = 'Add your video link to the data-video attribute of the play button in index.html.';
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal__close', modal).focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    frame.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  var playBtn = $('.video__play');
  if (playBtn) playBtn.addEventListener('click', function () { openModal(playBtn.getAttribute('data-video')); });
  if (modal) {
    $('.modal__close', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  }

  /* ---------- Deal countdown (counts down to the end of the current month) ---------- */
  (function () {
    var root = $('#countdown');
    if (!root) return;
    var els = {
      days: $('[data-unit="days"]', root), hours: $('[data-unit="hours"]', root),
      mins: $('[data-unit="mins"]', root), secs: $('[data-unit="secs"]', root)
    };
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var now = new Date();
      var end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      var diff = Math.max(0, Math.floor((end - now) / 1000));
      els.days.textContent = pad(Math.floor(diff / 86400));
      els.hours.textContent = pad(Math.floor(diff % 86400 / 3600));
      els.mins.textContent = pad(Math.floor(diff % 3600 / 60));
      els.secs.textContent = pad(diff % 60);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- Newsletter ---------- */
  var form = $('#newsletter-form');
  if (form) {
    var input = $('#newsletter-email');
    var msg = $('#newsletter-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok ? 'Thanks for subscribing!' : 'Please enter a valid email address.';
      if (ok) form.reset();
    });
  }
})();
