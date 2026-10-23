/*
 * Home page hero.
 *
 * Background: the frozen pattern of primordial fluctuations, rendered once and held still.
 * It is a sum of bands of modes, one per octave in wavelength, each in its super-horizon
 * (frozen) state of the massless de Sitter mode function, with equal amplitude per octave
 * (near scale invariance). Contours show the curvature perturbation.
 *
 * Animation: only the small instrument moves. The inflaton rolls down a Starobinsky-type
 * plateau, V = (1 - e^{-sqrt(2/3) phi})^2, while the e-folds count down from 60. Each e-fold
 * stretches space by a factor e, so the readout shows a / a_initial = e^N. At the end the inflaton oscillates about the minimum
 * (reheating) and the story starts again. "End inflation" fast-forwards; "Pause" stops it.
 */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;
  var canvas = hero.querySelector('canvas[data-field]');
  var toggle = hero.querySelector('[data-field-toggle]');
  var endBtn = hero.querySelector('[data-field-end]');
  var nOut = hero.querySelector('[data-field-n]');
  var stretchOut = hero.querySelector('[data-field-stretch]');
  var statusOut = hero.querySelector('[data-field-status]');
  var dot = hero.querySelector('[data-field-dot]');
  var trail = hero.querySelector('[data-field-trail]');
  var more = hero.querySelector('[data-field-more]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ still field
  function drawField() {
    var gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
    if (!gl) { hero.classList.add('is-fallback'); return; }
    var NB = 8;
    var VS = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var FS = '#version 300 es\n' +
      'precision highp float;\n' +
      'uniform vec2 res; uniform float dpr, levels, relief;\n' +
      'uniform vec4 bA[' + NB + ']; uniform vec2 bO[' + NB + '];\n' +
      'uniform vec3 bg, chalk, cyan, violet, rose, amber;\n' +
      'out vec4 o;\n' +
      'vec2 gr(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33);\n' +
      '  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0; }\n' +
      'float gn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);\n' +
      '  float a = dot(gr(i), f), b = dot(gr(i+vec2(1,0)), f-vec2(1,0)), c = dot(gr(i+vec2(0,1)), f-vec2(0,1)), d = dot(gr(i+vec2(1,1)), f-vec2(1,1));\n' +
      '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }\n' +
      // one frozen band per octave: amplitude in .w, frequency in .z, rotation in .xy
      'float field(vec2 x){ float f = 0.0;\n' +
      '  for (int i = 0; i < ' + NB + '; i++) { vec4 A = bA[i]; if (A.z == 0.0) continue;\n' +
      '    f += A.w * gn(vec2(A.x * x.x - A.y * x.y, A.y * x.x + A.x * x.y) * A.z + bO[i]); }\n' +
      '  return f; }\n' +
      'vec3 ramp(float t){\n' +
      '  if (t < -0.5) return mix(violet, cyan, (t + 1.0) / 0.5);\n' +
      '  if (t < 0.0) return mix(cyan, chalk, (t + 0.5) / 0.5);\n' +
      '  if (t < 0.5) return mix(chalk, rose, t / 0.5);\n' +
      '  return mix(rose, amber, (t - 0.5) / 0.5); }\n' +
      'void main(){\n' +
      '  vec2 x = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr;\n' +   // css px, y down
      '  float f = field(x);\n' +
      '  vec2 g2 = vec2(field(x + vec2(0.5, 0.0)) - f, field(x + vec2(0.0, 0.5)) - f) * 2.0;\n' +   // gradient per css px
      '  float g = length(g2) + 1e-6;\n' +
      '  float t = clamp(f / 1.7, -1.0, 1.0);\n' +
      '  vec3 col = ramp(t);\n' +
      '  vec3 img = bg + (col - bg) * 0.34 * abs(t);\n' +
      // soft relief: light from the upper left
      '  vec3 n = normalize(vec3(-g2 * relief, 1.0)); vec3 L = normalize(vec3(-0.5, -0.65, 0.57));\n' +
      '  img *= 1.0 + 0.55 * (dot(n, L) - L.z);\n' +
      // fine contours, every fifth one a little brighter
      '  float dens = clamp(1.0 - (g / levels - 0.12) / 0.35, 0.0, 1.0);\n' +
      '  float d = abs(fract(f / levels + 0.5) - 0.5) * levels / g;\n' +
      '  float line = clamp(1.0 - d / 0.85, 0.0, 1.0) * dens;\n' +
      '  img = mix(img, mix(chalk, col, 0.88), 0.6 * line);\n' +
      '  float L5 = levels * 5.0;\n' +
      '  float di = abs(fract(f / L5 + 0.5) - 0.5) * L5 / g;\n' +
      '  float idx = clamp(1.0 - di / 1.15, 0.0, 1.0) * dens;\n' +
      '  img = mix(img, mix(chalk, col, 0.7), 0.55 * idx);\n' +
      // the highest peaks and deepest troughs glow faintly
      '  float pk = smoothstep(1.6, 2.9, f), tr = smoothstep(1.6, 2.9, -f);\n' +
      '  img += vec3(1.0, 0.88, 0.7) * pk * pk * 0.7 + cyan * tr * tr * 0.25;\n' +
      '  o = vec4(img, 1.0);\n' +
      '}';
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { if (window.console) console.warn(e); hero.classList.add('is-fallback'); return; }
    var U = {}, nU = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var q = 0; q < nU; q++) { var info = gl.getActiveUniform(prog, q); U[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog, info.name); }
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }

    // Only modes already outside the horizon: the frozen imprint, equal variance per octave.
    var M = 8, SH = 2.2, SMIN = SH + 0.6, Z = 7.6;
    function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    var bands = [], w2 = 0;
    for (var k = 0; k < 12; k++) {
      var s = Z - k; if (s < SMIN || s > M) continue;
      var W = sstep(SMIN, SMIN + 0.8, s) * (1 - sstep(M - 1.6, M, s)), r = Math.random() * 6.2831853;
      bands.push({ s: s, c: Math.cos(r), sn: Math.sin(r), W: W, o: [(Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800] });
      w2 += W * W;
    }
    var norm = 1 / (0.215 * Math.sqrt(w2));
    function render() {
      var rect = hero.getBoundingClientRect();
      var cssW = Math.max(1, rect.width), cssH = Math.max(1, rect.height);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cssW * cssH * dpr * dpr > 6e6) dpr = Math.sqrt(6e6 / (cssW * cssH));
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      var cell = cssW < 700 ? 100 : 128;
      var A = new Float32Array(NB * 4), O = new Float32Array(NB * 2);
      bands.slice(0, NB).forEach(function (b, i) {
        A.set([b.c, b.sn, Math.pow(2, SH - b.s) / cell, b.W * norm], i * 4); O.set(b.o, i * 2);
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.uniform2f(U.res, canvas.width, canvas.height); gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.levels, 0.2); gl.uniform1f(U.relief, 85);
      gl.uniform4fv(U.bA, A); gl.uniform2fv(U.bO, O);
      gl.uniform3fv(U.bg, hex('#161B42')); gl.uniform3fv(U.chalk, hex('#EEECF6'));
      gl.uniform3fv(U.cyan, hex('#63C9DD')); gl.uniform3fv(U.violet, hex('#8C78F0'));
      gl.uniform3fv(U.rose, hex('#E0628F')); gl.uniform3fv(U.amber, hex('#F0A54E'));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      hero.classList.add('is-live');
    }
    render();
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 150); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); hero.classList.add('is-fallback'); });
  }
  if (canvas) drawField();

  // ------------------------------------------------------- the instrument
  if (!dot) return;
  var N_START = 60, RATE = 2;                    // e-folds per second
  var PHI_E = 0.94, EPE = Math.exp(Math.sqrt(2 / 3) * PHI_E);
  var X0 = -1.2, X1 = 6.0, PX0 = 6, PX1 = 234, PY0 = 76, PY1 = 10, VMAX = 1.2;
  function V(phi) { var e = 1 - Math.exp(-Math.sqrt(2 / 3) * phi); return e * e; }
  function phiOfN(N) { return Math.sqrt(1.5) * Math.log(4 * Math.max(0, N) / 3 + EPE); }   // slow roll, leading order
  function px(phi) { return PX0 + (phi - X0) / (X1 - X0) * (PX1 - PX0); }
  function py(v) { return PY0 + Math.min(VMAX, v) / VMAX * (PY1 - PY0); }
  var PHI_START = phiOfN(N_START);

  var phase = 'inflate', N = N_START, t = 0, nFF = 0, raf = 0, last = 0, running = false, visible = true;
  var userPaused = reduceMotion, lastN = '', lastS = '', lastStatus = '', trailMin = PHI_START;

  function stretchText(elapsed) {          // the scale factor itself: a / a_initial = e^N
    return '<i>e</i><sup>' + elapsed.toFixed(1) + '</sup>';
  }
  function trailPath(from) {
    var d = '', steps = 48;
    for (var i = 0; i <= steps; i++) {
      var phi = from + (PHI_START - from) * i / steps;
      d += (i ? ' L' : 'M') + px(phi).toFixed(1) + ',' + py(V(phi)).toFixed(1);
    }
    return d;
  }
  function render() {
    var phi;
    if (phase === 'reheat') phi = PHI_E * Math.exp(-t / 1.4) * Math.cos(6.2831853 * 0.9 * t);
    else if (phase === 'rest') phi = 0;
    else phi = phiOfN(N);
    dot.setAttribute('cx', px(phi).toFixed(1));
    dot.setAttribute('cy', py(V(phi)).toFixed(1));
    trailMin = Math.min(trailMin, phi);
    if (trail) trail.setAttribute('d', trailPath(trailMin));
    var nTxt = phase === 'inflate' || phase === 'ff' ? N.toFixed(1) : '0.0';
    if (nTxt !== lastN) { nOut.textContent = nTxt; lastN = nTxt; }
    var sTxt = stretchText(N_START - (phase === 'inflate' || phase === 'ff' ? N : 0));
    if (sTxt !== lastS) { stretchOut.innerHTML = sTxt; lastS = sTxt; }
    var st = phase === 'reheat' || phase === 'rest' ? 'Inflation has ended: reheating' : 'e-folds of inflation left';
    if (statusOut && st !== lastStatus) { statusOut.textContent = st; lastStatus = st; hero.classList.toggle('is-reheating', phase === 'reheat' || phase === 'rest'); }
  }
  function advance(dt) {
    t += dt;
    if (phase === 'inflate') {
      N -= RATE * dt;
      if (N <= 0) { N = 0; phase = 'reheat'; t = 0; if (more) more.hidden = false; }
    } else if (phase === 'ff') {
      var u = Math.min(1, t / 1.2);
      N = nFF * (1 - u * u * (3 - 2 * u));
      if (u >= 1) { N = 0; phase = 'reheat'; t = 0; if (more) more.hidden = false; }
    } else if (phase === 'reheat') {
      if (t >= 5) { phase = 'rest'; t = 0; }
    } else if (phase === 'rest') {
      if (t >= 1.8) { phase = 'inflate'; t = 0; N = N_START; trailMin = PHI_START; }
    }
    if (endBtn) endBtn.disabled = phase !== 'inflate';
  }
  function frame(now) {
    raf = 0; if (!running) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    advance(dt); render();
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    var should = visible && !userPaused && !document.hidden;
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (toggle) toggle.textContent = userPaused ? 'Play animation' : 'Pause animation';
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }, { threshold: 0.02 }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  if (toggle) { toggle.hidden = false; toggle.addEventListener('click', function () { userPaused = !userPaused; sync(); }); }
  if (endBtn) {
    endBtn.hidden = false;
    endBtn.addEventListener('click', function () {
      if (phase !== 'inflate') return;
      phase = 'ff'; t = 0; nFF = N; userPaused = false; sync();
    });
  }
  render();
  sync();
})();
