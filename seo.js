(function () {
  var r = document.querySelector('.msq');
  if (!r || r.__ready) return;
  r.__ready = true;
  var m = r.querySelector('.msq__m'), b = r.querySelector('.msq__b'), t = b.querySelector('span');
  r.classList.add('js');
  b.addEventListener('click', function () {
    var open = !r.classList.contains('open');
    m.style.maxHeight = m.scrollHeight + 'px';
    if (open) r.classList.add('open');
    else { m.offsetHeight; r.classList.remove('open'); m.style.maxHeight = ''; }
    b.setAttribute('aria-expanded', open);
    t.textContent = open ? 'Згорнути' : 'Показати більше';
  });
  m.addEventListener('transitionend', function () { if (r.classList.contains('open')) m.style.maxHeight = 'none'; });
  if (!('IntersectionObserver' in window)) { r.classList.add('go'); return; }
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    r.classList.add('go');
  }, { threshold: .2 });
  io.observe(r);
})();
