/* Product page order (loaded by shim.js on product pages with html.mb-pp):
   photos + price + buy + description (as Tilda has it)  ->  "Вигідніше разом"  ->  video review  ->  reviews.
   Only the video moves: out of the right column to under the bundle. */
(function () {
  var css = document.createElement('style');
  css.textContent =
    '.mbp-video{max-width:1080px;margin:28px auto 8px;padding:0 20px;box-sizing:border-box}' +
    '.mbp-video .mbVideo{margin:0 auto!important;max-width:760px}' +
    '@media (max-width:640px){.mbp-video{padding:0 16px;margin-top:20px}}';
  document.head.appendChild(css);

  var box = null, start = Date.now();
  function place() {
    var video = document.querySelector('.t-catalog__product-snippet .mbVideo');
    var bundle = document.querySelector('.t-catalog__product-snippet .mbx');
    var anchor = bundle || document.querySelector('.t-catalog__product-snippet .js-catalog-tabs');
    /* Wait a little for the bundle: another script draws it */
    if (!video || !anchor || (!bundle && Date.now() - start < 4000)) return;
    if (!box) {
      box = document.createElement('section');
      box.className = 'mbp-video';
    }
    if (box.previousSibling !== anchor) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    if (video.parentNode !== box) box.appendChild(video);
  }
  (function loop() {
    place();
    /* The video and bundle scripts may run late: keep checking for 10 s */
    if (Date.now() - start < 10000) setTimeout(loop, 300);
  })();
})();
