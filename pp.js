/* Product page order (loaded by shim.js on product pages with html.mb-pp):
   photos + price + buy  ->  "Вигідніше разом"  ->  description and video side by side  ->  reviews.
   Description and video are moved out of the narrow right column into their own section under the bundle. */
(function () {
  var css = document.createElement('style');
  css.textContent =
    '.mbp-more{max-width:1080px;margin:28px auto 8px;padding:0 20px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);gap:28px;font-family:Montserrat,Arial,sans-serif}' +
    '.mbp-more .js-catalog-prod-text{margin:0!important;padding:0!important;max-width:none!important;width:auto!important}' +
    '.mbp-more .mbVideo{margin:0!important}' +
    '.mbp-more .js-catalog-prod-all-text>br:first-child{display:none}' +
    '.mbp-more__h{font-size:16px;font-weight:600;color:#000;margin:0 0 10px}' +
    '@media (min-width:961px){.mbp-more.has-video{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:48px;align-items:start}' +
    '.mbp-more.has-video .mbVideo{position:sticky;top:90px}}' +
    '@media (max-width:640px){.mbp-more{padding:0 16px;margin-top:20px;gap:22px}}';
  document.head.appendChild(css);

  var box = null, start = Date.now();
  function place() {
    var text = document.querySelector('.t-catalog__product-snippet .js-catalog-prod-text');
    var video = document.querySelector('.mbVideo');
    var bundle = document.querySelector('.t-catalog__product-snippet .mbx');
    var anchor = bundle || document.querySelector('.t-catalog__product-snippet .js-catalog-tabs');
    /* Wait a little for the bundle: it is drawn by another script */
    if (!text || (!bundle && Date.now() - start < 4000)) return false;
    if (!box) {
      box = document.createElement('section');
      box.className = 'mbp-more';
      var col = document.createElement('div');
      col.className = 'mbp-more__text';
      col.innerHTML = '<div class="mbp-more__h">Опис</div>';
      box.appendChild(col);
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
    }
    var col2 = box.querySelector('.mbp-more__text');
    if (text.parentNode !== col2) col2.appendChild(text);
    if (video && video.parentNode !== box) { box.appendChild(video); box.classList.add('has-video'); }
    if (bundle && box.previousSibling !== bundle) bundle.parentNode.insertBefore(box, bundle.nextSibling);
    return true;
  }
  (function loop() {
    place();
    /* The video and bundle scripts may run late: keep checking for 10 s */
    if (Date.now() - start < 10000) setTimeout(loop, 300);
  })();
})();
