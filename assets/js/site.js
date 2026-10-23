(function () {
  'use strict';
  // Mobile menu
  var btn = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      document.documentElement.classList.toggle('menu-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        btn.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('menu-open');
        btn.focus();
      }
    });
  }
  // Opened straight from disk (file://): folder links need an explicit index.html.
  if (location.protocol === 'file:') {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href');
      if (/^(https?:|mailto:|#)/.test(h)) continue;
      var parts = h.split(/([?#].*)/);
      if (parts[0] === '' || /\/$/.test(parts[0])) links[i].setAttribute('href', (parts[0] || './') + 'index.html' + (parts[1] || ''));
    }
  }
})();
