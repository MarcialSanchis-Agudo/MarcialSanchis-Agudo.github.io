/* Shared behaviour: mobile nav, reveal-on-scroll, and the home-page flow field. */
(function () {
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Reveal on scroll
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      items.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
    }, 2500);
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Flow field: tracer particles advected by drifting Lamb-Oseen vortices in a weak free stream.
  var canvas = document.getElementById('flowfield');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, particles = [], vortices = [], running = true, visible = true;
  var U = 26;                 // free-stream speed, px/s
  var CORE = 46;              // vortex core radius, px
  var pointer = { x: -1e4, y: -1e4, on: false };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var nv = Math.max(5, Math.round(W * H / 90000));
    vortices = [];
    for (var i = 0; i < nv; i++) {
      vortices.push({ x: rand(0, W), y: rand(0, H), g: (Math.random() < .5 ? -1 : 1) * rand(26000, 62000), ph: rand(0, 6.28) });
    }
    var np = Math.min(1500, Math.round(W * H / 750));
    particles = [];
    for (var j = 0; j < np; j++) particles.push(spawn({}, true));
  }

  function spawn(p, anywhere) {
    p.x = anywhere ? rand(0, W) : rand(-20, W * 0.15);
    p.y = rand(0, H);
    p.life = rand(3, 9);
    p.bright = Math.random() < 0.08;
    return p;
  }

  function velocity(x, y) {
    var u = U, v = 0;
    for (var i = 0; i < vortices.length; i++) {
      var k = vortices[i], dx = x - k.x, dy = y - k.y;
      var s = k.g / (6.2832 * (dx * dx + dy * dy + CORE * CORE));
      u -= s * dy; v += s * dx;
    }
    if (pointer.on) {
      var px = x - pointer.x, py = y - pointer.y;
      var sp = 52000 / (6.2832 * (px * px + py * py + 1600));
      u -= sp * py; v += sp * px;
    }
    return [u, v];
  }

  var last = 0, t = 0;
  function step(dt, fade) {
    t += dt;
    for (var i = 0; i < vortices.length; i++) {
      var k = vortices[i];
      k.x += (U * 0.55) * dt; k.y += Math.sin(t * 0.25 + k.ph) * 6 * dt;
      if (k.x > W + 120) { k.x = -120; k.y = rand(0, H); }
    }
    if (fade) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.055)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.lineWidth = 1;
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j], vel = velocity(p.x, p.y);
      var nx = p.x + vel[0] * dt, ny = p.y + vel[1] * dt;
      var sp = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);
      var a = Math.min(0.55, 0.08 + sp / 260);
      ctx.strokeStyle = p.bright ? 'rgba(245,245,244,' + a + ')' : 'rgba(143,214,234,' + a * 0.8 + ')';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; p.life -= dt;
      if (p.life < 0 || p.x > W + 10 || p.x < -30 || p.y < -10 || p.y > H + 10) spawn(p, p.life < 0);
    }
  }

  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;
    step(dt, true);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  resize();
  if (reduce) {
    running = false;
    for (var s = 0; s < 90; s++) step(0.03, false);   // a still image of streaks
  } else {
    requestAnimationFrame(frame);
    var hero = canvas.parentElement;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (visible) start();
    });
    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = true;
    });
    hero.addEventListener('pointerleave', function () { pointer.on = false; });
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { ctx.clearRect(0, 0, W, H); resize(); if (reduce) for (var s = 0; s < 90; s++) step(0.03, false); }, 200);
  });
})();
