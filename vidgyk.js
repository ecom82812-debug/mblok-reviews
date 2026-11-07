(function () {
  'use strict';
  var root = document.querySelector('.mbr');
  if (!root || root.__ready) return;
  root.__ready = true;
  var pid = root.getAttribute('data-product') || '';

  var FIREBASE = { apiKey: 'AIzaSyCS-7Vn4X_NDxbEGyTrb1JQewf1QCQNffA', projectId: 'shop-reviews-3aedd' };
  var FILE = 'https://ecom82812-debug.github.io/mblok-reviews/all.json';
  /* Sizes the site already uses, so nothing is generated again. */
  var IMG = {
    card: 'c_fill,g_auto,w_480,h_480,q_auto,f_auto', cardS: 'c_fill,g_auto,w_320,h_320,q_auto,f_auto',
    small: 'c_fill,g_auto,w_320,h_320,q_auto,f_auto', smallS: 'c_fill,g_auto,w_200,h_200,q_auto,f_auto',
    full: 'c_limit,w_1200,q_auto,f_auto'
  };
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-label="Підтверджена покупка" role="img"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ARROW = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };

  var all = [], view = [], shown = 0, cols = [];
  var filter = 'all', sort = 'new', query = '';
  var $ = function (id) { return document.getElementById(id); };
  var small = function () { return window.innerWidth <= 640; };
  var step = function () { return pid ? 4 : small() ? 8 : 12; };

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/"/g, '&quot;'); }
  function cld(u, t) { return !u || u.indexOf('/upload/') < 0 ? u : u.replace('/upload/', '/upload/' + t + '/'); }
  function thumb(u) { return cld(u, small() ? IMG.cardS : IMG.card); }
  function tiny(u) { return cld(u, small() ? IMG.smallS : IMG.small); }
  function full(u) { return cld(u, IMG.full); }
  function time(r) { var t = r.createdAt; if (!t) return 0; return (t.toDate ? t.toDate() : new Date(t)).getTime() || 0; }
  function date(r) { var t = time(r); return t ? new Date(t).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; }
  function stars(n) { n = Math.round(n || 0); return '<span class="mbr-stars" role="img" aria-label="' + n + ' з 5">' + '★★★★★'.slice(0, n) + '<s>' + '★★★★★'.slice(n) + '</s></span>'; }
  function word(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y > 1 && y < 5 ? b : c; }
  function photos(r) { return r.photos || []; }
  function match(r, f) {
    var v = Math.round(r.rating || 0);
    if (f === 'photo') return photos(r).length > 0;
    if (f === 'low') return v <= 4;
    if (/^\d$/.test(f)) return v === +f;
    return true;
  }

  function paintScore() {
    var sum = 0, pics = 0, by = [0, 0, 0, 0, 0, 0];
    all.forEach(function (r) { sum += r.rating || 0; pics += photos(r).length; by[Math.round(r.rating || 0)]++; });
    var avg = (sum / all.length).toFixed(1).replace('.', ',');
    var bars = '';
    for (var v = 5; v >= 1; v--) {
      bars += '<button type="button" class="mbr-bar" data-f="' + v + '" aria-label="Показати відгуки з оцінкою ' + v + '"><span>' + v + ' ★</span><i><b style="width:' +
        (all.length ? by[v] / all.length * 100 : 0) + '%"></b></i><span>' + by[v] + '</span></button>';
    }
    $('mbr-score').innerHTML = '<div><div class="mbr-score__n">' + avg + '</div><div class="mbr-score__s">★★★★★</div><div class="mbr-score__m">' +
      all.length + ' ' + word(all.length, 'відгук', 'відгуки', 'відгуків') + ' · ' + pics + ' фото</div></div><div class="mbr-bars">' + bars + '</div>';
  }

  /* One brick per review, different models first. */
  function paintWall() {
    var seen = {}, first = [], rest = [];
    all.forEach(function (r) {
      if (!photos(r).length || (r.rating || 0) < 5) return;
      (seen[r.productId] ? rest : first).push(r);
      seen[r.productId] = 1;
    });
    var picks = first.concat(rest).slice(0, 12), h = '';
    for (var row = 0; row < 3; row++) {
      h += '<div class="mbr-row">';
      picks.slice(row * 4, row * 4 + 4).forEach(function (r, i) {
        h += '<button type="button" class="mbr-brick" data-id="' + esc(r.id) + '" style="--d:' + ((2 - row) * 130 + i * 50) + 'ms" aria-label="Відгук: ' + esc(r.name) + '"><img src="' +
          esc(thumb(r.photos[0])) + '" alt="" decoding="async"></button>';
      });
      h += '</div>';
    }
    $('mbr-wall').innerHTML = h;
  }

  /* Product page: every photo of this product, each opens its review. */
  function paintStrip() {
    var list = [];
    all.forEach(function (r) { photos(r).forEach(function (u, i) { list.push([r, u, i]); }); });
    var box = $('mbr-strip');
    box.style.display = list.length ? '' : 'none';
    box.innerHTML = list.slice(0, 12).map(function (x) {
      return '<button type="button" data-id="' + esc(x[0].id) + '" data-pic="' + x[2] + '" aria-label="Фото покупця"><img src="' + esc(tiny(x[1])) + '" alt="" loading="lazy" decoding="async"></button>';
    }).join('');
  }

  function paintChips() {
    var list = [['all', 'Усі'], ['photo', 'З фото'], ['5', '5 зірок'], ['low', '4 і нижче']];
    if ($('mbr-chips')) $('mbr-chips').innerHTML = list.map(function (c) {
      return '<button type="button" class="mbr-chip' + (filter === c[0] ? ' is-on' : '') + '" data-f="' + c[0] + '" aria-pressed="' + (filter === c[0]) + '">' + c[1] +
        ' <span>' + all.filter(function (r) { return match(r, c[0]); }).length + '</span></button>';
    }).join('');
    [].forEach.call(root.querySelectorAll('.mbr-bar'), function (b) { b.classList.toggle('is-on', b.dataset.f === filter); });
  }

  /* Product page on a phone: a plain list under the photo gallery. */
  function classic() { return !!pid && small(); }
  function rowCard(r) {
    var p = photos(r), name = r.name || 'Покупець';
    var h = '<article class="mbr-row-c" tabindex="0" role="button" data-id="' + esc(r.id) + '" aria-label="Відгук: ' + esc(name) + '">' +
      '<div class="mbr-row-c__h"><span class="mbr-ava" aria-hidden="true">' + esc(name.trim().charAt(0).toUpperCase()) + '</span>' +
      '<div class="mbr-row-c__id"><div class="mbr-who">' + '<span>' + esc(name) + '</span>' + (r.verified ? TICK : '') + '</div>' + stars(r.rating) + '</div>' +
      '<span class="mbr-date">' + date(r) + '</span></div>';
    if (r.text) h += '<p class="mbr-card__x">' + esc(r.text) + '</p>';
    if (p.length) {
      h += '<div class="mbr-row-c__ph">' + p.slice(0, 4).map(function (u, i) {
        var rest = i === 3 && p.length > 4 ? '<b>+' + (p.length - 4) + '</b>' : '';
        return '<span data-id="' + esc(r.id) + '" data-pic="' + i + '"><img src="' + esc(tiny(u)) + '" alt="Фото покупця" loading="lazy" decoding="async">' + rest + '</span>';
      }).join('') + '</div>';
    }
    if (r.reply) h += '<div class="mbr-m__reply"><b>Відповідь mBlok</b>' + esc(r.reply) + '</div>';
    return h + '</article>';
  }

  function card(r) {
    if (classic()) return rowCard(r);
    var p = photos(r), h = '<article class="mbr-card" tabindex="0" role="button" data-id="' + esc(r.id) + '" aria-label="Відгук: ' + esc(r.name) + '">';
    if (p.length) {
      h += '<div class="mbr-card__ph"><img src="' + esc(thumb(p[0])) + '" alt="Фото покупця" loading="lazy" decoding="async">' +
        (p.length > 1 ? '<span class="mbr-card__n">+' + (p.length - 1) + ' фото</span>' : '') + '</div>';
    }
    h += '<div class="mbr-card__b"><div class="mbr-card__t">' + stars(r.rating) + '<span class="mbr-date">' + date(r) + '</span></div>';
    h += r.text ? '<p class="mbr-card__x">' + esc(r.text) + '</p>' : (p.length ? '' : '<p class="mbr-card__x is-empty">Оцінка без коментаря</p>');
    h += '<div class="mbr-who"><span>' + esc(r.name || 'Покупець') + '</span>' + (r.verified ? TICK : '') + '</div>';
    if (!pid && r.productName && r.productUrl) {
      h += '<a class="mbr-prod" href="' + esc(r.productUrl) + '"><span>' + esc(r.productName) + '</span><span aria-hidden="true">→</span></a>';
    }
    return h + '</div></article>';
  }

  function colCount() { return classic() ? 1 : !pid && window.innerWidth >= 1000 ? 3 : 2; }

  function addCards(from, to) {
    view.slice(from, to).forEach(function (r) {
      var low = cols[0];
      cols.forEach(function (c) { if (c.offsetHeight < low.offsetHeight) low = c; });
      low.insertAdjacentHTML('beforeend', card(r));
    });
  }

  function paintMore() {
    var rest = view.length - shown;
    $('mbr-more').innerHTML = rest > 0 ? '<button type="button" id="mbr-more-btn">Показати ще (' + rest + ') <span aria-hidden="true">↓</span></button>' : '';
  }

  function paintList() {
    var grid = $('mbr-grid');
    if (!view.length) {
      cols = [];
      grid.innerHTML = '<div class="mbr-empty">Таких відгуків поки немає.<button type="button" data-reset="1">Показати всі</button></div>';
      $('mbr-more').innerHTML = '';
      return;
    }
    grid.innerHTML = new Array(colCount() + 1).join('<div class="mbr-col"></div>');
    cols = [].slice.call(grid.children);
    shown = Math.min(step(), view.length);
    addCards(0, shown);
    paintMore();
  }

  function apply() {
    var q = query.toLowerCase();
    view = all.filter(function (r) {
      return match(r, filter) && (!q || ((r.productName || '') + ' ' + (r.text || '') + ' ' + (r.name || '')).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) {
      if (sort === 'high' && (b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      if (sort === 'photo' && !photos(a).length !== !photos(b).length) return photos(a).length ? -1 : 1;
      return time(b) - time(a);
    });
    paintChips();
    paintList();
  }

  function setFilter(f) { filter = f; apply(); }

  /* Review window */
  var box, cur = -1, pic = 0, token = 0, pushed = false, back = null;
  var warm = {};
  function preload(u) { if (!u || warm[u]) return; warm[u] = 1; new Image().src = full(u); }

  function build() {
    box = document.createElement('div');
    box.id = 'mbr-m';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Відгук покупця');
    box.innerHTML = '<div class="mbr-m__box"><button type="button" class="mbr-m__x" aria-label="Закрити">' + ARROW('M6 6l12 12M18 6L6 18') + '</button>' +
      '<div class="mbr-m__stage"><div class="mbr-m__bg"></div><div class="mbr-m__view"><img alt="Фото покупця">' +
      '<button type="button" class="mbr-m__nav mbr-m__prev" aria-label="Попереднє фото">' + ARROW('M15 6l-6 6 6 6') + '</button>' +
      '<button type="button" class="mbr-m__nav mbr-m__next" aria-label="Наступне фото">' + ARROW('M9 6l6 6-6 6') + '</button></div>' +
      '<span class="mbr-m__cnt" role="img"></span><div class="mbr-m__thumbs"></div></div>' +
      '<div class="mbr-m__info"><div class="mbr-m__sc"></div><div class="mbr-m__foot"></div></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.mbr-m__x')) return close();
      if (e.target.closest('.mbr-m__prev')) return move(-1);
      if (e.target.closest('.mbr-m__next')) return move(1);
      var t = e.target.closest('[data-pic]');
      if (t) { pic = +t.dataset.pic; paintPhoto(); return; }
      var p = e.target.closest('[data-go]');
      if (p) go(+p.dataset.go);
    });
    /* A swipe only goes through the photos of the open review. Reviews change with the buttons. */
    function swipe(el, fn) {
      var sx = 0, sy = 0;
      el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) fn(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    swipe(box.querySelector('.mbr-m__stage'), move);
  }

  function play(name) {
    var inner = box.querySelector('.mbr-m__box');
    inner.classList.remove('go-next', 'go-prev', 'pic-next', 'pic-prev', 'end-next', 'end-prev');
    void inner.offsetWidth;
    inner.classList.add(name);
  }

  function paintPhoto() {
    var r = view[cur], p = photos(r), u = p[pic], img = box.querySelector('.mbr-m__view img'), mine = ++token;
    box.querySelector('.mbr-m__bg').style.backgroundImage = 'url("' + tiny(u) + '")';
    [].forEach.call(box.querySelectorAll('[data-pic]'), function (b) { b.classList.toggle('is-on', +b.dataset.pic === pic); });
    var big = new Image();
    big.src = full(u);
    if (big.complete) { img.src = big.src; img.style.opacity = 1; }
    else {
      img.style.opacity = 0;
      big.onload = function () { if (mine === token) { img.src = big.src; img.style.opacity = 1; } };
      big.onerror = function () { if (mine === token) { img.src = thumb(u); img.style.opacity = 1; } };
    }
    var cnt = box.querySelector('.mbr-m__cnt');
    cnt.innerHTML = p.length > 1 ? p.map(function (u, i) { return '<i' + (i === pic ? ' class="is-on"' : '') + '></i>'; }).join('') : '';
    cnt.setAttribute('aria-label', 'Фото ' + (pic + 1) + ' з ' + p.length);
    var navs = box.querySelectorAll('.mbr-m__nav');
    navs[0].style.display = pic > 0 ? '' : 'none';
    navs[1].style.display = pic < p.length - 1 ? '' : 'none';
    preload(p[pic + 1]);
    if (view[cur + 1]) preload(photos(view[cur + 1])[0]);
  }

  function paint() {
    var r = view[cur], p = photos(r), inner = box.querySelector('.mbr-m__box');
    inner.classList.toggle('no-photo', !p.length);
    box.querySelector('.mbr-m__thumbs').innerHTML = p.length > 1 ? p.map(function (u, i) {
      return '<button type="button" data-pic="' + i + '" aria-label="Фото ' + (i + 1) + '"><img src="' + esc(tiny(u)) + '" alt=""></button>';
    }).join('') : '';
    box.querySelector('.mbr-m__sc').innerHTML = '<div class="mbr-m__name">' + esc(r.name || 'Покупець') + (r.verified ? TICK : '') + '</div>' +
      '<div class="mbr-m__meta">' + stars(r.rating) + '<span class="mbr-date">' + date(r) + '</span></div>' +
      (r.verified ? '<div class="mbr-m__ver">Підтверджена покупка</div>' : '') +
      (r.text ? '<p class="mbr-m__text">' + esc(r.text) + '</p>' : '') +
      (r.reply ? '<div class="mbr-m__reply"><b>Відповідь mBlok</b>' + esc(r.reply) + '</div>' : '');
    box.querySelector('.mbr-m__sc').scrollTop = 0;
    box.querySelector('.mbr-m__foot').innerHTML =
      (!pid && r.productName && r.productUrl ? '<span class="mbr-m__prod">' + esc(r.productName) + '</span>' : '') +
      (!pid && r.productUrl ? '<a class="mbr-m__go" href="' + esc(r.productUrl) + '"><span class="mbr-m__gl">Перейти до товару</span><span class="mbr-m__gs">До товару</span><span aria-hidden="true">→</span></a>' : '') +
      '<button type="button" class="mbr-m__pv" data-go="-1" aria-label="Попередній відгук"' + (cur ? '' : ' disabled') + '><span aria-hidden="true">←</span><span class="mbr-m__gl"> Попередній</span></button>' +
      '<span class="mbr-m__pos">Відгук ' + (cur + 1) + ' з ' + view.length + '</span>' +
      '<button type="button" class="mbr-m__nx" data-go="1" aria-label="Наступний відгук"' + (cur < view.length - 1 ? '' : ' disabled') + '><span class="mbr-m__gl">Наступний </span><span aria-hidden="true">→</span></button>';
    if (p.length) paintPhoto();
    history.replaceState(history.state, '', '#review-' + r.id);
  }

  function go(d) {
    var n = cur + d;
    if (n < 0 || n >= view.length) return;
    cur = n; pic = 0; paint(); play(d > 0 ? 'go-next' : 'go-prev');
  }
  /* Stays inside the open review: at the last photo it stops. */
  function move(d) {
    var n = photos(view[cur]).length;
    if (pic + d < 0 || pic + d >= n) { play(d > 0 ? 'end-next' : 'end-prev'); return; }
    pic += d;
    paintPhoto();
    play(d > 0 ? 'pic-next' : 'pic-prev');
  }

  function open(id, startPic) {
    if (!box) build();
    var i = -1;
    view.forEach(function (r, n) { if (r.id === id) i = n; });
    if (i < 0) {
      filter = 'all'; query = ''; if ($('mbr-q')) $('mbr-q').value = ''; apply();
      view.forEach(function (r, n) { if (r.id === id) i = n; });
      if (i < 0) return;
    }
    back = document.activeElement;
    cur = i; pic = Math.min(startPic || 0, Math.max(photos(view[i]).length - 1, 0));
    if (!box.classList.contains('is-open')) { history.pushState({ mbr: 1 }, ''); pushed = true; }
    box.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    paint();
    box.querySelector('.mbr-m__x').focus();
  }
  function hide() {
    if (!box || !box.classList.contains('is-open')) return;
    box.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (back && back.focus) back.focus({ preventScroll: true });
  }
  function close() {
    if (pushed) { pushed = false; history.back(); }
    else { hide(); history.replaceState(history.state, '', location.pathname + location.search); }
  }
  window.addEventListener('popstate', function () { pushed = false; hide(); });
  document.addEventListener('keydown', function (e) {
    if (!box || !box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'Tab') {
      var f = [].filter.call(box.querySelectorAll('a[href],button:not([disabled])'), function (x) { return x.offsetParent; });
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* Product page: the existing form, moved into a window. Its sending logic stays as it was. */
  var sheet, sheetPushed = false;
  function openForm() {
    var old = document.querySelector('.rw-widget');
    if (!old || !old.querySelector('#rw-msg')) return;
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'mbr-f';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'Написати відгук');
      sheet.innerHTML = '<div class="mbr-f__box"><button type="button" class="mbr-m__x" aria-label="Закрити">' + ARROW('M6 6l12 12M18 6L6 18') + '</button>' +
        '<button type="button" class="mbr-f__share" aria-label="Поділитися посиланням на відгук">' + ARROW('M12 15V4M8 7.5L12 3.5l4 4M7 11H5v10h14V11h-2') + '<span role="status"></span></button></div>';
      document.body.appendChild(sheet);
      sheet.querySelector('.mbr-f__box').appendChild(old);
      sheet.querySelector('.mbr-f__box').insertAdjacentHTML('beforeend', '<div class="mbr-f__done" role="status"><span class="mbr-f__tick" aria-hidden="true">' +
        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
        '<h3>Дякуємо за відгук!</h3><p>Ми перевіримо його і незабаром опублікуємо на сторінці товару.</p><button type="button" class="mbr-p__write mbr-f__ok">Добре</button></div>');
      /* The old form reports success in its message line: show the thank-you window instead. */
      new MutationObserver(function () {
        var msg = sheet.querySelector('#rw-msg');
        if (msg && /Дякуємо/.test(msg.textContent) && !sheet.classList.contains('is-done')) doneForm();
      }).observe(old, { childList: true, characterData: true, subtree: true });
      var head = sheet.querySelector('.rw-form-title'), title = document.querySelector('.js-store-prod-name, .t-store__prod-popup__name, h1.t-catalog__prod-popup__name, h1[itemprop="name"], h1');
      if (head && title) head.insertAdjacentHTML('afterend', '<div class="mbr-f__prod">' + esc(title.textContent.trim()) + '</div>');
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet || e.target.closest('.mbr-m__x') || e.target.closest('.mbr-f__ok')) closeForm();
        if (e.target.closest('.mbr-f__share')) shareForm();
      });
    }
    sheet.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    history.pushState({ mbr: 2 }, '');
    sheetPushed = true;
  }
  /* A link with ?review=1 opens the form at once, for asking a buyer to leave a review. */
  function formFromLink(n) {
    if (!pid || !/[?&]review=1(&|$)/.test(location.search)) return;
    if (!document.querySelector('.rw-widget #rw-msg')) {
      if (n < 50) setTimeout(function () { formFromLink(n + 1); }, 100);
      return;
    }
    history.replaceState(history.state, '', location.href.replace(/([?&])review=1(&|$)/, function (m, a, b) { return b ? a : ''; }));
    openForm();
  }

  /* A link that opens this form: the share sheet on phones, copied on computers. */
  function shareForm() {
    var url = location.origin + location.pathname + '?review=1';
    var note = sheet.querySelector('.mbr-f__share span');
    function copied() {
      note.textContent = 'Скопійовано';
      setTimeout(function () { note.textContent = ''; }, 1800);
    }
    /* Computers copy the link: their share menus are less handy than pasting it into a chat. */
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      navigator.share({ title: 'Залиште відгук про товар', url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(copied, function () { window.prompt('Посилання на відгук', url); });
    } else {
      window.prompt('Посилання на відгук', url);
    }
  }

  function doneForm() {
    sheet.classList.add('is-done');
    sheet.querySelector('.mbr-f__ok').focus();
  }
  function hideForm() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (!sheet.classList.contains('is-done')) return;
    /* Ready for another review. */
    sheet.classList.remove('is-done');
    var send = sheet.querySelector('#rw-submit'), msg = sheet.querySelector('#rw-msg');
    if (send) { send.disabled = false; send.textContent = 'Надіслати відгук'; }
    if (msg) msg.innerHTML = '';
  }
  function closeForm() {
    if (sheetPushed) { sheetPushed = false; history.back(); } else hideForm();
  }
  window.addEventListener('popstate', function () { sheetPushed = false; hideForm(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheet && sheet.classList.contains('is-open')) closeForm();
  });

  /* Start fetching the big photo as soon as a visitor aims at a review. */
  var aim;
  function aimAt(e) {
    var c = e.target.closest && e.target.closest('[data-id]');
    if (!c) return;
    clearTimeout(aim);
    aim = setTimeout(function () {
      all.some(function (r) { if (r.id === c.dataset.id) { preload(photos(r)[0]); return true; } });
    }, e.type === 'touchstart' ? 0 : 90);
  }
  root.addEventListener('mouseover', aimAt);
  root.addEventListener('touchstart', aimAt, { passive: true });

  root.addEventListener('click', function (e) {
    if (e.target.closest('.mbr-prod')) return;
    if (e.target.closest('#mbr-write')) { openForm(); return; }
    var f = e.target.closest('[data-f]');
    if (f) {
      var bar = f.classList.contains('mbr-bar');
      setFilter(bar && filter === f.dataset.f ? 'all' : f.dataset.f);
      if (bar && !pid) $('mbr-tools').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (e.target.closest('[data-reset]')) { filter = 'all'; query = ''; if ($('mbr-q')) $('mbr-q').value = ''; apply(); return; }
    if (e.target.closest('#mbr-more-btn')) {
      var from = shown;
      shown = Math.min(shown + step(), view.length);
      addCards(from, shown);
      paintMore();
      return;
    }
    var c = e.target.closest('[data-id]');
    if (c) open(c.dataset.id, +c.getAttribute('data-pic') || 0);
  });
  root.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && (e.target.classList.contains('mbr-card') || e.target.classList.contains('mbr-row-c'))) { e.preventDefault(); open(e.target.dataset.id); }
  });
  var qt;
  if ($('mbr-q')) $('mbr-q').addEventListener('input', function () {
    var v = this.value.trim();
    clearTimeout(qt);
    qt = setTimeout(function () { query = v; apply(); }, 160);
  });
  if ($('mbr-sort')) $('mbr-sort').addEventListener('change', function () { sort = this.value; apply(); });

  var wide = colCount(), rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (colCount() !== wide && all.length) { wide = colCount(); paintList(); } }, 200);
  });

  function show(rows) {
    all = rows.sort(function (a, b) { return time(b) - time(a); });
    root.classList.toggle('is-empty', !all.length);
    formFromLink(0);
    if (!all.length) {
      if (pid) {
        $('mbr-score').innerHTML = '<p class="mbr-p__none">Ще немає відгуків про цей товар. Будьте першим!</p>';
        $('mbr-grid').innerHTML = '';
      } else {
        $('mbr-grid').innerHTML = '<div class="mbr-empty">Відгуків поки немає. Ваш може стати першим: залиште його на сторінці товару.</div>';
      }
      return;
    }
    paintScore();
    if ($('mbr-wall')) paintWall();
    if ($('mbr-strip')) paintStrip();
    apply();
    var m = /^#review-(.+)$/.exec(location.hash);
    if (m && !(box && box.classList.contains('is-open'))) open(m[1]);
  }
  function fail() { $('mbr-grid').innerHTML = '<div class="mbr-empty">Не вдалося завантажити відгуки. Оновіть сторінку.</div>'; }
  function fromFile() {
    fetch(FILE).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (rows) {
      show(pid ? rows.filter(function (r) { return String(r.productId) === pid; }) : rows);
    }).catch(fail);
  }

  /* The site's reviews layer answers these calls and adds reviews approved a moment ago. */
  var tries = 0;
  (function wait() {
    var fb = window.firebase;
    if (fb && fb.firestore) {
      if (!fb.apps.length) fb.initializeApp(FIREBASE);
      var q = fb.firestore().collection('reviews');
      if (pid) q = q.where('productId', '==', pid);
      q.where('status', '==', 'approved').orderBy('createdAt', 'desc').get().then(function (snap) {
        var rows = [];
        snap.forEach(function (d) { rows.push(Object.assign({ id: d.id }, d.data())); });
        show(rows);
      }).catch(fromFile);
      return;
    }
    if (++tries > 15) return fromFile();
    setTimeout(wait, 200);
  })();
})();
