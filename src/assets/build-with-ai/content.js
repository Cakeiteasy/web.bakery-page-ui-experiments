/* Scroll entrance */
(function () {
  var els = document.querySelectorAll(
    '.lp-hero,.lp-trust,.lp-stats-bar,.lp-props,.lp-how,.lp-showcase,.lp-proof,.lp-guarantee,.lp-faq,.lp-cta-final,.lp-products-list'
  );
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.07 });
  els.forEach(function (el) { io.observe(el); });
})();

/* Counter animation */
(function () {
  var stats = document.querySelectorAll('.lp-stat__num[data-counter]');
  if (!stats.length || !('IntersectionObserver' in window)) { return; }
  var done = false;

  function run(el) {
    var raw = el.getAttribute('data-counter');
    var target = parseFloat(raw);
    var dec = target % 1 !== 0;
    var dur = 1500;
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = e * target;
      if (target >= 1000) el.textContent = Math.round(v).toLocaleString('en') + '+';
      else if (dec) el.textContent = v.toFixed(1);
      else el.textContent = Math.round(v) + '+';
      if (p < 1) { requestAnimationFrame(step); }
      else {
        if (target >= 200000) el.textContent = '200,000+';
        else if (target >= 1000) el.textContent = Math.round(target).toLocaleString('en') + '+';
        else if (dec) el.textContent = target.toFixed(1);
        else el.textContent = target + '+';
      }
    }
    requestAnimationFrame(step);
  }

  var sio = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !done) {
      done = true;
      stats.forEach(run);
      sio.disconnect();
    }
  }, { threshold: 0.4 });

  var section = document.querySelector('.lp-stats-bar');
  if (section) sio.observe(section);
})();

/* FAQ smooth toggle */
(function () {
  document.querySelectorAll('.lp-faq__item').forEach(function (details) {
    var summary = details.querySelector('summary');
    var p = details.querySelector('p');
    if (!summary || !p) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var open = details.hasAttribute('open');
      if (open) {
        p.style.maxHeight = p.scrollHeight + 'px';
        p.style.overflow = 'hidden';
        requestAnimationFrame(function () {
          p.style.transition = 'max-height .26s ease, opacity .2s ease';
          p.style.maxHeight = '0';
          p.style.opacity = '0';
          setTimeout(function () { details.removeAttribute('open'); p.style.cssText = ''; }, 280);
        });
      } else {
        details.setAttribute('open', '');
        p.style.maxHeight = '0'; p.style.opacity = '0'; p.style.overflow = 'hidden';
        requestAnimationFrame(function () {
          p.style.transition = 'max-height .3s ease, opacity .24s ease';
          p.style.maxHeight = p.scrollHeight + 'px';
          p.style.opacity = '1';
          setTimeout(function () { p.style.cssText = ''; }, 320);
        });
      }
    });
  });
})();

/* Smooth anchor scroll */
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
})();
