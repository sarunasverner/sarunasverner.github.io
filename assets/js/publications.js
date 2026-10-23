(function () {
  'use strict';
  var root = document.querySelector('[data-pubs]');
  if (!root) return;
  var items = Array.prototype.slice.call(root.querySelectorAll('.pub'));
  var years = Array.prototype.slice.call(root.querySelectorAll('.pub-year'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-theme-filter]'));
  var search = document.getElementById('pub-search');
  var solo = document.getElementById('pub-solo');
  var count = document.getElementById('pub-count');
  var reset = document.getElementById('pub-reset');
  var params = new URLSearchParams(location.search);
  var theme = params.get('area') || 'all';
  if (!chips.some(function (c) { return c.dataset.themeFilter === theme; })) theme = 'all';
  if (params.get('q')) search.value = params.get('q');
  if (params.get('single') === '1') solo.checked = true;

  function apply() {
    var term = search.value.trim().toLowerCase();
    var n = 0;
    items.forEach(function (li) {
      var ok = (theme === 'all' || (' ' + li.dataset.areas + ' ').indexOf(' ' + theme + ' ') > -1) &&
        (!solo.checked || li.dataset.single === '1') &&
        (!term || li.dataset.text.indexOf(term) > -1);
      li.hidden = !ok;
      if (ok) n++;
    });
    years.forEach(function (s) { s.hidden = !s.querySelector('.pub:not([hidden])'); });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.themeFilter === theme)); });
    var filtered = n !== items.length;
    count.textContent = n === 0
      ? 'No papers match these filters. Clear the search or choose another area.'
      : (filtered ? 'Showing ' + n + ' of ' + items.length + ' papers' : 'Showing all ' + n + ' papers');
    reset.hidden = !filtered && !term;
    var p = new URLSearchParams();
    if (theme !== 'all') p.set('area', theme);
    if (term) p.set('q', search.value.trim());
    if (solo.checked) p.set('single', '1');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { theme = c.dataset.themeFilter; apply(); });
  });
  search.addEventListener('input', apply);
  solo.addEventListener('change', apply);
  reset.addEventListener('click', function () {
    theme = 'all'; search.value = ''; solo.checked = false; apply(); search.focus();
  });
  document.querySelector('[data-pub-controls]').hidden = false;
  apply();
})();
