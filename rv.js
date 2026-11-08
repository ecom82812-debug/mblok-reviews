/* "Ви переглядали" helpers, product pages only (loaded by shim.js).
   1. The footer script saves the product before Tilda shows its prices, so the old price is lost
      and the price is raw ("1999,00"). Once the prices are on the page, save them properly.
   2. With html.mb-rv: tidy prices in the strip and add rating stars from summary.json. */
(function () {
  var KEY = 'recent_viewed_products_v2';
  var BASE = 'https://ecom82812-debug.github.io/mblok-reviews/';

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function clean(u) { return String(u || '').split('#')[0].split('?')[0]; }
  function uid(u) { var m = /\/tproduct\/(\d+)/.exec(u || ''); return m ? m[1] : ''; }
  function num(v) {
    var s = String(v || '').replace(/грн\.?|₴/gi, '').replace(/\s| /g, '').replace(/,00$/, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function money(n) { return n ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн.' : ''; }
  function shown(el) { return el && el.offsetParent !== null && el.textContent.trim(); }

  /* 1. Save this product's real prices */
  var here = clean(location.href), tries = 0, again = [800, 2000, 4000];
  (function save() {
    var p = document.querySelector('.js-catalog-prod-price-val, .js-store-prod-price-val, .t-store__prod-popup__price-value');
    if (!shown(p)) { if (++tries < 40) setTimeout(save, 250); return; }
    var o = document.querySelector('.js-catalog-prod-price-old-val, .js-store-prod-price-old-val');
    var price = num(p.textContent), old = shown(o) ? num(o.textContent) : 0;
    var items = read(), hit = null;
    items = items.filter(function (it) {
      if (!it || clean(it.url) !== here) return true;
      if (!hit) hit = it;
      return false;
    });
    if (!hit) { if (++tries < 40) setTimeout(save, 250); return; }
    hit.url = here;
    hit.price = price ? String(price) : hit.price;
    hit.oldPrice = old > price ? String(old) : '';
    items.unshift(hit);
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    /* Tilda fills the old price a moment after the price: read again a few times. */
    if (again.length) setTimeout(save, again.shift());
  })();

  /* 2. Strip look: prices and stars */
  if (!document.documentElement.classList.contains('mb-rv')) return;

  var STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z';
  function stars(r) {
    var out = '', i, f;
    for (i = 1; i <= 5; i++) {
      f = r >= i - 0.25 ? '#111' : r >= i - 0.75 ? 'url(#rv-half)' : 'none';
      out += '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '" fill="' + f + '" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    }
    return out;
  }
  function defs() {
    if (document.getElementById('rv-half-defs')) return;
    var d = document.createElement('div');
    d.id = 'rv-half-defs';
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg width="0" height="0"><defs><linearGradient id="rv-half"><stop offset="50%" stop-color="#111"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs></svg>';
    document.body.appendChild(d);
  }

  var rates = null;
  fetch(BASE + 'summary.json').then(function (r) { return r.json(); }).then(function (s) { rates = s.p || {}; paint(); }).catch(function () {});

  function paint() {
    var cards = document.querySelectorAll('#rv-section .rv-card');
    if (!cards.length) return;
    var byUrl = {};
    read().forEach(function (it) { if (it && it.url) byUrl[clean(it.url)] = it; });
    [].forEach.call(cards, function (c) {
      /* The product open right now is not "viewed before" (the footer script misses it when the link has ?utm=...) */
      if (clean(c.getAttribute('href')) === here) { c.style.display = 'none'; return; }
      var it = byUrl[clean(c.getAttribute('href'))] || {};
      var box = c.querySelector('.rv-card__prices');
      if (box && !box.getAttribute('data-mb')) {
        var p = num(it.price), o = num(it.oldPrice);
        if (p) {
          box.setAttribute('data-mb', '1');
          box.innerHTML = '<div class="rv-card__price">' + money(p) + '</div>' +
            (o > p ? '<div class="rv-card__oldprice">' + money(o) + '</div>' : '');
        }
      }
      var r = rates && rates[uid(c.getAttribute('href'))];
      if (r && r[1] && !c.querySelector('.mb-rate')) {
        defs();
        var el = document.createElement('div');
        el.className = 'mb-rate';
        el.style.display = 'flex';
        el.innerHTML = '<span class="mb-rate-stars">' + stars(r[0]) + '</span><strong>' + r[0].toFixed(1) + '</strong><span class="mb-rate-cnt">(' + r[1] + ')</span>';
        var t = c.querySelector('.rv-card__title');
        t.parentNode.insertBefore(el, t.nextSibling);
      }
    });
  }
  (function wait(n) {
    if (document.querySelector('#rv-section .rv-card')) return paint();
    if (n < 40) setTimeout(function () { wait(n + 1); }, 250);
  })(0);
})();
