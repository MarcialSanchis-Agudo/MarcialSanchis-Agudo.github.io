/* Mama's Brain: mobile nav, reveal on scroll, the MCP session typing, and the horizon lines. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav
  var burger = document.querySelector('.burger'), nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });
  }

  // Reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      items.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
    }, 2500);
  } else items.forEach(function (el) { el.classList.add('in'); });

  // MCP session: type each call, then show its result
  var ops = Array.prototype.slice.call(document.querySelectorAll('.op'));
  function showAll() {
    ops.forEach(function (op) { op.querySelector('.call').textContent = op.dataset.call; op.classList.add('in', 'done'); });
  }
  function play() {
    var i = 0;
    function next() {
      if (i >= ops.length) return;
      var op = ops[i++], call = op.querySelector('.call'), text = op.dataset.call, n = 0;
      op.classList.add('in');
      var caret = document.createElement('span'); caret.className = 'caret';
      call.appendChild(caret);
      (function type() {
        if (n <= text.length) {
          call.textContent = text.slice(0, n++); call.appendChild(caret);
          setTimeout(type, 38);
        } else {
          caret.remove();
          setTimeout(function () { op.classList.add('done'); setTimeout(next, 420); }, 260);
        }
      })();
    }
    next();
  }
  if (ops.length) {
    if (reduce || !('IntersectionObserver' in window)) showAll();
    else {
      var so = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { so.disconnect(); setTimeout(play, 350); }
      }, { threshold: 0.2 });
      so.observe(document.getElementById('session'));
    }
  }

  // Horizon: thin flowing lines converging on a bright band, coloured by the brand gradient
  var c = document.getElementById('horizon');
  if (!c || !c.getContext) return;
  var ctx = c.getContext('2d'), W, H, dpr, t = 0, running = true, last = 0;
  var stops = [[166, 60, 224], [236, 47, 134], [255, 138, 94]];
  function col(x) {            // x in 0..1 across the gradient
    var s = x < .52 ? 0 : 1, f = s === 0 ? x / .52 : (x - .52) / .48, a = stops[s], b = stops[s + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function size() {
    var r = c.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var band = window.innerWidth < 860 ? 120 : 140, lines = 26;
    for (var k = 0; k < lines; k++) {
      var off = (k - lines / 2) / (lines / 2);         // -1..1
      var spread = 14 + Math.abs(off) * 120;
      var rgb = col(k / (lines - 1));
      ctx.beginPath();
      for (var x = -10; x <= W + 10; x += 12) {
        var u = x / W;
        var env = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ;   // pinch at the edges
        var y = band + off * spread * (0.35 + 0.65 * env)
              + Math.sin(u * 7 + t * 0.35 + k * 0.45) * (4 + Math.abs(off) * 10)
              + Math.sin(u * 17 - t * 0.22 + k) * 2;
        if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ',' + (0.07 + (1 - Math.abs(off)) * 0.22) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function frame(ts) {
    if (!running) return;
    t += last ? Math.min((ts - last) / 1000, .05) : .016; last = ts;
    draw(); requestAnimationFrame(frame);
  }
  size();
  if (reduce) { draw(); }
  else {
    requestAnimationFrame(frame);
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
      else running = false;
    }).observe(c);
  }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); draw(); }, 150); });
})();
