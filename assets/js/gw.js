/* Gravitational-wave landscape: pick a curve or a legend entry to read what it measures and how deep it reaches. */
(function () {
  'use strict';
  var root = document.querySelector('[data-gw]');
  if (!root || !window.GWDATA) return;
  var D = window.GWDATA;
  var svg = root.querySelector('.gw-plot');
  var readout = root.querySelector('#gw-readout');
  var hint = '<p class="gw-hint">Select a curve or a mission to see what it measures and how deep it reaches. ' +
    'Solid lines are current data, dashed lines are planned or proposed.</p>';
  var buttons = Array.prototype.slice.call(root.querySelectorAll('.gw-item'));
  var pinned = null;

  function els(id) { return svg.querySelectorAll('[data-id="' + id + '"]:not(.hit)'); }

  function focus(ids) {
    svg.querySelectorAll('.is-focus').forEach(function (el) { el.classList.remove('is-focus'); });
    svg.classList.toggle('has-focus', ids.length > 0);
    ids.forEach(function (id) { els(id).forEach(function (el) { el.classList.add('is-focus'); }); });
  }
  function show(id) {
    if (!id) { readout.innerHTML = hint; readout.style.removeProperty('--m'); return; }
    var m = D.missions[id];
    var color = { cmb: '--amber', pta: '--violet', space: '--cyan', atom: '--lime', ground: '--rose', neff: '--muted' }[m.family];
    readout.style.setProperty('--m', 'var(' + color + ')');
    readout.innerHTML = '<h3>' + m.name + '</h3>' +
      '<p class="status"><span class="key' + (m.current ? ' is-current' : '') + '" aria-hidden="true"></span>' +
      (m.current ? 'Current data' : 'Planned or proposed') + '</p>' +
      '<p>' + m.desc + '</p><p class="reach">' + m.reach + '</p>';
  }
  function preview(id) { focus(id ? [id] : (pinned ? [pinned] : [])); show(id || pinned); }
  function pin(id) {
    pinned = pinned === id ? null : id;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === pinned)); });
    preview(null);
  }

  // ---------------------------------------------------------------- events
  svg.querySelectorAll('.hit').forEach(function (h) {
    var id = h.getAttribute('data-id');
    h.addEventListener('pointerenter', function () { preview(id); });
    h.addEventListener('pointerleave', function () { preview(null); });
    h.addEventListener('click', function () { pin(id); });
  });
  buttons.forEach(function (b) {
    var id = b.getAttribute('data-id');
    b.addEventListener('pointerenter', function () { preview(id); });
    b.addEventListener('pointerleave', function () { preview(null); });
    b.addEventListener('focus', function () { preview(id); });
    b.addEventListener('blur', function () { preview(null); });
    b.addEventListener('click', function () { pin(id); });
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && pinned) pin(pinned); });
  readout.innerHTML = hint;
  root.classList.add('is-live');
})();
