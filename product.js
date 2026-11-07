/* Product page reviews: shows the new block in place of the old widget, which keeps only its form. */
(function () {
  'use strict';
  var BASE = 'https://ecom82812-debug.github.io/mblok-reviews/';
  var V = '11';
  var tries = 0;
  function mount(old) {
    var pid = old.id.replace('rw-widget-', '');
    if (!/^\d+$/.test(pid) || document.querySelector('.mbr')) return;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = BASE + 'vidgyk.css?v=' + V;
    document.head.appendChild(css);
    var box = document.createElement('section');
    box.className = 'mbr mbr--p';
    box.setAttribute('data-product', pid);
    box.setAttribute('aria-labelledby', 'mbr-title');
    box.innerHTML = '<div class="mbr-p__side"><h2 class="mbr-p__h" id="mbr-title">Відгуки про товар</h2>' +
      '<div class="mbr-score" id="mbr-score"></div>' +
      '<button type="button" class="mbr-p__write" id="mbr-write">Написати відгук <span aria-hidden="true">→</span></button></div>' +
      '<div class="mbr-p__body"><div class="mbr-strip" id="mbr-strip"></div>' +
      '<div class="mbr-grid" id="mbr-grid"><div class="mbr-load" aria-label="Завантаження відгуків"></div></div>' +
      '<div class="mbr-more" id="mbr-more"></div></div>';
    old.parentNode.insertBefore(box, old);
    old.style.display = 'none';
    /* The rating line under the title scrolls to the old widget: send it to the new block. */
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.rw-inline[id^="rw-header"]')) return;
      e.stopPropagation();
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);
    var s = document.createElement('script');
    s.src = BASE + 'vidgyk.js?v=' + V;
    document.body.appendChild(s);
  }
  (function wait() {
    var old = document.querySelector('.rw-widget[id^="rw-widget-"]');
    if (old) return mount(old);
    if (++tries < 60) setTimeout(wait, 200);
  })();
})();
