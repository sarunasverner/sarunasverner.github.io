/* Interactive n_s–r figure: move the alpha segment along the model band and report where it sits
   relative to the Planck, P-ACT-LB and CMB-SPA constraints (precomputed from the contours). */
(function () {
  'use strict';
  var root = document.querySelector('[data-attractors]');
  if (!root || !window.ATTRACTORS) return;
  var D = window.ATTRACTORS, M = D.map;
  function sx(x) { return M.L + (x - M.X0) / (M.X1 - M.X0) * (M.W - M.L - M.R); }
  function sy(y) { return M.T + (1 - (y - M.Y0) / (M.Y1 - M.Y0)) * (M.H - M.T - M.B); }

  var controls = root.querySelector('[data-attractor-controls]');
  var range = root.querySelector('#nsr-range');
  var out = root.querySelector('#nsr-alpha');
  var values = root.querySelector('.nsr-values');
  var dd = { planck: root.querySelector('[data-v="planck"]'), act: root.querySelector('[data-v="act"]'), spa: root.querySelector('[data-v="spa"]') };
  var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-model-btn]'));
  var groups = {};
  Array.prototype.forEach.call(root.querySelectorAll('g.model'), function (g) { groups[g.getAttribute('data-model')] = g; });
  var NAMES = { E: 'E-model', T: 'T-model' };
  var LEVELS = {
    planck: ['Outside the 95% region', 'Inside the 95% region', 'Inside the 68% region'],
    act: ['Outside the 95% region', 'Inside the 95% region', 'Inside the 68% region'],
    spa: ['Outside 2\u03c3', 'Within 2\u03c3', 'Within 1\u03c3']
  };
  var model = 'E';

  function alphaAt(m, i) { return Math.pow(10, m.grid[0] + i * m.grid[1]); }
  function fmtAlpha(a) {
    if (a < 0.1) return a.toFixed(3);
    if (a < 1) return a.toFixed(2);
    if (a < 10) return a.toFixed(1);
    return a.toFixed(0);
  }
  function fmtR(r) {
    if (r >= 0.001) return r.toFixed(4);
    var e = Math.floor(Math.log10(r)), m = r / Math.pow(10, e);
    return m.toFixed(1) + '\u00d710<sup>\u2212' + Math.abs(e) + '</sup>';
  }
  function setLine(el, a, b) {
    el.setAttribute('x1', sx(a[0]).toFixed(1)); el.setAttribute('y1', sy(a[1]).toFixed(1));
    el.setAttribute('x2', sx(b[0]).toFixed(1)); el.setAttribute('y2', sy(b[1]).toFixed(1));
  }
  function update() {
    var m = D.models[model], i = +range.value, s = m.seg[i];
    var bbn = [s[0], s[1]], ew = [s[2], s[3]], hi = [s[4], s[5]], inst = [s[6], s[7]];
    var a = alphaAt(m, i), g = groups[model];
    setLine(g.querySelector('.seg-ext'), bbn, inst);
    setLine(g.querySelector('.seg-core'), ew, hi);
    var dots = g.querySelectorAll('.seg-dot');
    [ew, hi].forEach(function (p, k) { dots[k].setAttribute('cx', sx(p[0]).toFixed(1)); dots[k].setAttribute('cy', sy(p[1]).toFixed(1)); });
    var lab = g.querySelector('.seg-label');
    lab.setAttribute('x', (sx(ew[0]) - 10).toFixed(1)); lab.setAttribute('y', (sy(ew[1]) - 12).toFixed(1));
    lab.textContent = '\u03b1 = ' + fmtAlpha(a);
    out.textContent = fmtAlpha(a);
    range.setAttribute('aria-valuetext', 'alpha ' + fmtAlpha(a));
    var ns = [ew[0], hi[0]].sort(function (x, y) { return x - y; }), rs = [ew[1], hi[1]].sort(function (x, y) { return x - y; });
    values.innerHTML = 'At \u03b1 = ' + fmtAlpha(a) + ', the ' + NAMES[model] + ' predicts n<sub>s</sub> between ' +
      ns[0].toFixed(4) + ' and ' + ns[1].toFixed(4) + ' and r between ' + fmtR(rs[0]) + ' and ' + fmtR(rs[1]) + '.';
    var v = m.verdict[i];
    dd.planck.textContent = LEVELS.planck[v[0]];
    dd.act.textContent = LEVELS.act[v[1]];
    dd.spa.textContent = LEVELS.spa[v[2]];
    Object.keys(dd).forEach(function (k, j) { dd[k].setAttribute('data-level', v[j]); });
  }
  function setModel(k) {
    if (k === model) return;
    var a = alphaAt(D.models[model], +range.value), m = D.models[k];
    model = k;
    var i = Math.round((Math.log10(a) - m.grid[0]) / m.grid[1]);
    range.max = m.seg.length - 1;
    range.value = Math.max(0, Math.min(m.seg.length - 1, i));
    Object.keys(groups).forEach(function (g) { groups[g].classList.toggle('is-hidden', g !== k); });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-model-btn') === k)); });
    update();
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { setModel(b.getAttribute('data-model-btn')); }); });
  range.addEventListener('input', update);
  controls.hidden = false;
  update();
})();
