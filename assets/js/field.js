/*
 * Live inflation for the home page.
 *
 * Seen in physical coordinates, inflation is an endless zoom: the Hubble radius
 * stays fixed while space expands by a factor e every e-fold. Fluctuations are
 * drawn as bands of modes, one per octave in wavelength. Each band follows the
 * massless de Sitter mode function: with x = k/(aH),
 *     delta phi_k  ~  (1 + i x) e^{-i x}
 * so it oscillates while inside the Hubble radius (x >> 1) and freezes once
 * expansion carries it outside (x << 1). Frozen bands have equal amplitude: the
 * near scale invariance of the primordial spectrum. Sub-horizon modes are still
 * quantum vacuum, so they are drawn faintly.
 *
 * Contours show the curvature perturbation. "End inflation" fast-forwards to
 * the end of slow roll on a Starobinsky-type plateau; the inflaton then
 * oscillates and decays (reheating), and a new patch begins.
 *
 * The expansion looks the same around every point, so the centre of the zoom
 * (and its Hubble ring) follows the pointer. Each band is shifted to
 * compensate, so the pattern itself never jumps.
 */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas[data-field]');
  if (!canvas) return;
  var hero = canvas.closest('.hero');
  var toggle = hero.querySelector('[data-field-toggle]');
  var endBtn = hero.querySelector('[data-field-end]');
  var readout = hero.querySelector('[data-field-readout]');
  var dot = hero.querySelector('[data-field-dot]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fallback() {
    hero.classList.add('is-fallback');
    if (toggle) toggle.hidden = true;
    if (endBtn) endBtn.hidden = true;
  }

  var gl = null;
  try {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl) { fallback(); return; }

  var NOCT = 9;
  var VS = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform vec2 res; uniform float dpr; uniform vec2 center;\n' +
    'uniform float sig, levels, heat, shift, fade, ringA, ringR;\n' +
    'uniform vec4 oA[' + NOCT + ']; uniform vec4 oB[' + NOCT + ']; uniform float oC[' + NOCT + '];\n' +
    'uniform vec3 bg, chalk, cyan, violet, rose, amber, pale;\n' +
    'out vec4 o;\n' +
    'vec2 gr(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33);\n' +
    '  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0; }\n' +
    'float gn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);\n' +
    '  float a = dot(gr(i), f), b = dot(gr(i+vec2(1,0)), f-vec2(1,0)), c = dot(gr(i+vec2(0,1)), f-vec2(0,1)), d = dot(gr(i+vec2(1,1)), f-vec2(1,1));\n' +
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }\n' +
    'vec3 diverge(float t){ float a = clamp(-t, 0.0, 1.0), b = clamp(t, 0.0, 1.0);\n' +
    '  vec3 cold = a < 0.5 ? mix(chalk, cyan, a / 0.5) : mix(cyan, violet, (a - 0.5) / 0.5);\n' +
    '  vec3 hot = b < 0.5 ? mix(chalk, rose, b / 0.5) : mix(rose, amber, (b - 0.5) / 0.5);\n' +
    '  return t < 0.0 ? cold : hot; }\n' +
    'vec3 heatmap(float t){ float x = (t + 1.0) * 0.5;\n' +
    '  if (x < 0.38) return mix(violet * 0.55, rose, x / 0.38);\n' +
    '  if (x < 0.7) return mix(rose, amber, (x - 0.38) / 0.32);\n' +
    '  return mix(amber, pale, (x - 0.7) / 0.3); }\n' +
    'void main(){\n' +
    '  vec2 x = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) - center;\n' +
    '  float f = 0.0;\n' +
    '  for (int i = 0; i < ' + NOCT + '; i++) {\n' +
    '    vec4 A = oA[i];\n' +
    '    if (A.z == 0.0) continue;\n' +
    '    vec2 p = vec2(A.x * x.x - A.y * x.y, A.y * x.x + A.x * x.y) * A.z;\n' +
    '    f += A.w * gn(p + oB[i].xy) + oC[i] * gn(p + oB[i].zw);\n' +
    '  }\n' +
    '  f = f / sig + shift;\n' +
    '  float g = length(vec2(dFdx(f), dFdy(f))) * dpr + 1e-5;\n' +
    '  float dens = clamp(1.0 - (g / levels - 0.1) / 0.3, 0.0, 1.0);\n' +
    '  float d = abs(fract(f / levels + 0.5) - 0.5) * levels / g;\n' +
    '  float line = clamp(1.0 - d / 1.05, 0.0, 1.0) * dens;\n' +
    '  float L4 = levels * 4.0;\n' +
    '  float di = abs(fract(f / L4 + 0.5) - 0.5) * L4 / g;\n' +
    '  float idx = clamp(1.0 - di / 1.25, 0.0, 1.0) * dens;\n' +
    '  float t = clamp(f / 1.5, -1.0, 1.0);\n' +
    '  vec3 col = diverge(t);\n' +
    '  vec3 img = bg + (col - bg) * 0.22 * abs(t);\n' +
    '  float k = 1.0 - 0.6 * heat;\n' +
    '  img = mix(img, mix(chalk, col, 0.88), 0.66 * line * k);\n' +
    '  img = mix(img, mix(chalk, col, 0.7), 0.5 * idx * k);\n' +
    '  img += vec3(1.0, 0.9, 0.75) * smoothstep(1.8, 3.0, f) * 0.75 * (1.0 - heat);\n' +
    '  img = mix(img, heatmap(clamp(f / 1.1, -1.0, 1.0)) * (1.0 - 0.25 * line * heat), 0.92 * heat);\n' +
    '  float r = length(x) / dpr;\n' +
    '  float ring = clamp(1.0 - abs(r - ringR) / 0.9, 0.0, 1.0) * ringA;\n' +
    '  img = mix(img, chalk, ring * 0.5);\n' +
    '  o = vec4(bg + (img - bg) * fade, 1.0);\n' +
    '}';

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog, U = {};
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { if (window.console) console.warn(e); fallback(); return; }
  var nU = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (var q = 0; q < nU; q++) {
    var info = gl.getActiveUniform(prog, q);
    U[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog, info.name);
  }

  var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  var vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  gl.useProgram(prog);
  gl.uniform3fv(U.bg, hex('#161B42')); gl.uniform3fv(U.chalk, hex('#EEECF6'));
  gl.uniform3fv(U.cyan, hex('#63C9DD')); gl.uniform3fv(U.violet, hex('#8C78F0'));
  gl.uniform3fv(U.rose, hex('#E0628F')); gl.uniform3fv(U.amber, hex('#F0A54E'));
  gl.uniform3fv(U.pale, [1.0, 0.95, 0.86]);

  // ------------------------------------------------------------- parameters
  var M = 8, SH = 2.2;          // octaves kept on screen; age (in octaves) at horizon exit
  var LN2 = Math.log(2);
  var EFOLDS_PER_SECOND = 0.15; // pace of inflation; the zoom (expansion by e per e-fold) follows it exactly
  var STEADY = EFOLDS_PER_SECOND / LN2;   // in octaves per second
  var N_START = 60;             // e-folds of inflation remaining when a patch begins
  var SIG = 0.466 * 1.12, LEVELS = 0.44;
  // Horizon exit is k = aH: a band freezes when its wavelength is 2 pi Hubble radii. The bands' dominant
  // wavelength at exit is 1.5 noise cells (measured from their power spectrum), so the Hubble radius is
  // 1.5 / (2 pi) = 0.24 cells.
  var RING = 0.24;

  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // ------------------------------------------------------------------- state
  var cssW = 1, cssH = 1, dpr = 1, cellH = 110;
  var cx = 0, cy = 0, tx = 0, ty = 0, moved = false;   // zoom centre (css px) and its target
  var bands = {};                                       // octave id -> {c, s, o[4], nExit}
  var z = 0, N = N_START, phase = 'inflate', tPhase = 0, nAtEnd = 0;

  function rnd() { return (Math.random() - 0.5) * 800; }
  function newPatch() {
    bands = {}; z = 0; N = N_START; phase = 'inflate'; tPhase = 0;
    if (endBtn) { endBtn.disabled = false; endBtn.textContent = 'End inflation'; }
  }
  function band(k) {
    var b = bands[k];
    if (!b) {
      var r = Math.random() * 6.2831853;
      b = bands[k] = { c: Math.cos(r), s: Math.sin(r), o: [rnd(), rnd(), rnd(), rnd()], nExit: -1 };
    }
    return b;
  }
  function freq(s) { return Math.pow(2, SH - s) / (cellH * dpr); }   // per device px

  var quality = 1;   // lowered automatically on slow devices
  function measure() {
    var r = hero.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    var s = Math.min(window.devicePixelRatio || 1, 2) * quality;
    var maxPx = cssW < 700 ? 1.8e6 : 3.2e6;
    if (cssW * cssH * s * s > maxPx) s = Math.sqrt(maxPx / (cssW * cssH));
    dpr = s;
    canvas.width = Math.round(cssW * s); canvas.height = Math.round(cssH * s);
    cellH = cssW < 700 ? 82 : 110;
    if (!moved) {
      tx = cx = (cssW < 700 ? 0.74 : 0.72) * cssW;
      ty = cy = (cssW < 700 ? 0.17 : 0.38) * cssH;
    }
  }

  // Move the zoom centre without moving the pattern: shift every band's offsets.
  function moveCenter(nx, ny) {
    var dx = (nx - cx) * dpr, dy = (ny - cy) * dpr;
    if (dx === 0 && dy === 0) return;
    for (var key in bands) {
      var b = bands[key], fr = freq(z - key);
      var px = (b.c * dx - b.s * dy) * fr, py = (b.s * dx + b.c * dy) * fr;
      b.o[0] += px; b.o[1] += py; b.o[2] += px; b.o[3] += py;
    }
    cx = nx; cy = ny;
  }

  hero.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var r = hero.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; moved = true;
  });
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button')) return;
    var r = hero.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; moved = true;
  });

  // ------------------------------------------------------------- the story
  var T_END = 2.6, T_HEAT = 6.4;
  function advance(dt) {
    tPhase += dt;
    var rate = 0;
    if (phase === 'inflate') {
      rate = STEADY + 3.4 * Math.exp(-tPhase / 1.4);   // a brisk start, then steady expansion
      N -= rate * dt * LN2;
      if (N <= 0.5) startEnd();
    } else if (phase === 'end') {
      var u = Math.min(1, tPhase / T_END);
      rate = STEADY * (1 - u) + 2.4 * Math.sin(Math.PI * u);
      N = nAtEnd * (1 - u * u * (3 - 2 * u));
      if (u >= 1) { phase = 'reheat'; tPhase = 0; N = 0; }
    } else if (phase === 'reheat') {
      if (tPhase >= T_HEAT) newPatch();
    }
    z += rate * dt;
  }
  function startEnd() {
    if (phase !== 'inflate') return;
    phase = 'end'; tPhase = 0; nAtEnd = N;
    if (endBtn) { endBtn.disabled = true; endBtn.textContent = 'Reheating'; }
  }

  // Starobinsky-type plateau, phi in Planck units: V = (1 - e^{-sqrt(2/3) phi})^2
  var PHI_E = 0.94, EPE = Math.exp(Math.sqrt(2 / 3) * PHI_E);
  function inflatonPhi() {
    if (phase === 'reheat') return PHI_E * Math.exp(-tPhase / 1.5) * Math.cos(6.2831853 * 1.1 * tPhase);
    return Math.sqrt(1.5) * Math.log(4 * Math.max(0, N) / 3 + EPE);
  }
  function V(phi) { var e = 1 - Math.exp(-Math.sqrt(2 / 3) * phi); return e * e; }
  var lastText = '';
  function updateInset() {
    if (dot) {
      var phi = inflatonPhi();
      var px = 4 + (phi + 1.2) / 7.0 * 124, py = 44 - Math.min(1.2, V(phi)) / 1.2 * 38;
      dot.setAttribute('cx', px.toFixed(1)); dot.setAttribute('cy', py.toFixed(1));
    }
    if (readout) {
      var txt = phase === 'reheat' ? 'Inflation has ended: reheating' : N.toFixed(1) + ' e-folds of inflation left';
      if (txt !== lastText) { readout.textContent = txt; lastText = txt; }
    }
  }

  // ------------------------------------------------------------------ render
  var bufA = new Float32Array(NOCT * 4), bufB = new Float32Array(NOCT * 4), bufC = new Float32Array(NOCT);
  function draw() {
    bufA.fill(0); bufB.fill(0); bufC.fill(0);
    var slot = 0, kmin = Math.max(0, Math.ceil(z - M)), kmax = Math.floor(z);
    for (var old in bands) if (+old < kmin) delete bands[old];
    for (var key = kmin; key <= kmax && slot < NOCT; key++) {
      var s = z - key; if (s <= 0) continue;
      var b = band(key);
      if (s >= SH && b.nExit < 0) b.nExit = N;                         // amplitude fixed at horizon exit
      var nAmp = b.nExit >= 0 ? b.nExit : N;
      var amp = 0.45 + 0.55 * Math.min(1, Math.max(0, nAmp / N_START));   // later modes are weaker: zeta grows with N on a plateau
      var x = Math.pow(2, SH - s), n = Math.sqrt(1 + x * x);
      var W = (0.18 + 0.82 * sstep(0.8, SH + 1.0, s)) * sstep(0, 0.8, s) * (1 - sstep(M - 1.8, M, s)) * amp;
      bufA[slot * 4] = b.c; bufA[slot * 4 + 1] = b.s; bufA[slot * 4 + 2] = freq(s);
      bufA[slot * 4 + 3] = W * (Math.cos(x) + x * Math.sin(x)) / n;     // Re[(1 + i x) e^{-i x}] / |.|
      bufC[slot] = W * (Math.sin(x) - x * Math.cos(x)) / n;             // the conjugate quadrature
      bufB.set(b.o, slot * 4);
      slot++;
    }
    var heat = 0, shift = 0, fade = 1, ringA = 1;
    if (phase === 'inflate') ringA = sstep(0.2, 1.4, tPhase);
    if (phase === 'end') ringA = 1 - sstep(0.5, 1, tPhase / T_END);
    if (phase === 'reheat') {
      var t = tPhase;
      shift = 1.4 * Math.exp(-t / 1.5) * Math.sin(6.2831853 * 1.1 * t);   // the oscillating inflaton
      heat = sstep(0.25, 1.6, t) * (1 - sstep(3.4, 5.2, t));
      fade = 1 - sstep(5.3, 6.3, t);
      ringA = 0;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.dpr, dpr);
    gl.uniform2f(U.center, cx * dpr, cy * dpr);
    gl.uniform1f(U.sig, SIG); gl.uniform1f(U.levels, LEVELS);
    gl.uniform1f(U.heat, heat); gl.uniform1f(U.shift, shift); gl.uniform1f(U.fade, fade);
    gl.uniform1f(U.ringA, ringA); gl.uniform1f(U.ringR, cellH * RING);
    gl.uniform4fv(U.oA, bufA); gl.uniform4fv(U.oB, bufB); gl.uniform1fv(U.oC, bufC);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    updateInset();
    if (!hero.classList.contains('is-live')) hero.classList.add('is-live');
  }

  // -------------------------------------------------------------------- loop
  var running = false, visible = true, userPaused = reduceMotion, raf = 0, last = 0;
  var slow = 0, frames = 0;
  function frame(now) {
    raf = 0; if (!running) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    if (++frames > 20 && quality > 0.5) {          // keep it smooth: drop resolution if frames are slow
      slow = slow * 0.9 + (dt > 1 / 40 ? 0.1 : 0);
      if (slow > 0.6) { quality *= 0.8; slow = 0; frames = 0; var ox = cx, oy = cy, m = moved; moved = true; measure(); moved = m; cx = ox; cy = oy; }
    }
    advance(dt);
    var k = 1 - Math.exp(-dt * 4);
    moveCenter(cx + (tx - cx) * k, cy + (ty - cy) * k);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    var should = visible && !userPaused && !document.hidden;
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (toggle) toggle.textContent = userPaused ? 'Play animation' : 'Pause animation';
  }

  measure();
  newPatch();
  if (reduceMotion) { z = 6.6; N = N_START - z * LN2; tPhase = 10; draw(); }   // a still, well-developed patch
  sync();

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { var ox = cx, oy = cy; measure(); if (moved) { cx = ox; cy = oy; } draw(); }, 120);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }, { threshold: 0.02 }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  if (toggle) { toggle.hidden = false; toggle.addEventListener('click', function () { userPaused = !userPaused; sync(); }); }
  if (endBtn) {
    endBtn.hidden = false;
    endBtn.addEventListener('click', function () { userPaused = false; startEnd(); sync(); });
  }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; fallback(); });
})();
