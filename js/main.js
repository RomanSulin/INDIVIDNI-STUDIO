(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Menu (black, like screenshot) ---------------- */
  const menu = qs('#menu');
  const btnMenu = qs('#btnMenu');
  const menuText = qs('#menuText');

  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('isOpen', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (menuText) menuText.textContent = open ? 'CLOSE' : 'MENU';
  }

  btnMenu?.addEventListener('click', () => setMenu(!menu?.classList.contains('isOpen')));
  menu?.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------------- Cursor glow ---------------- */
  const glow = qs('.cursorGlow');
  let gx = -9999, gy = -9999;
  let tx = gx, ty = gy;

  window.addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true }
  );

  function tickGlow() {
    gx += (tx - gx) * 0.12;
    gy += (ty - gy) * 0.12;
    if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    requestAnimationFrame(tickGlow);
  }
  tickGlow();

  /* ---------------- Wave distortion (SVG filter) ---------------- */
  const waveTurb = qs('#waveTurb');
  const waveDisp = qs('#waveDisp');
  let waveHoverCount = 0;
  let lastMX = 0,
    lastMY = 0;
  let waveScale = 0;

  function setWaveFromPointer(e, el) {
    if (!waveTurb || !waveDisp || !el) return;

    const r = el.getBoundingClientRect();
    const nx = clamp((e.clientX - r.left) / r.width, 0, 1);
    const ny = clamp((e.clientY - r.top) / r.height, 0, 1);

    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    lastMX = e.clientX;
    lastMY = e.clientY;

    const speed = Math.sqrt(dx * dx + dy * dy);
    // build scale from speed (subtle)
    waveScale = clamp(waveScale + speed * 0.06, 0, 22);

    const bfX = 0.010 + nx * 0.010;
    const bfY = 0.010 + ny * 0.010;
    waveTurb.setAttribute('baseFrequency', `${bfX.toFixed(4)} ${bfY.toFixed(4)}`);
  }

  function tickWave() {
    if (!waveDisp) return requestAnimationFrame(tickWave);

    const active = waveHoverCount > 0;
    waveScale *= active ? 0.88 : 0.82;
    const s = active ? waveScale : 0;
    waveDisp.setAttribute('scale', String(s.toFixed(2)));

    requestAnimationFrame(tickWave);
  }
  tickWave();

  qsa('.waveTarget').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      waveHoverCount += 1;
      el.classList.add('waveOn');
    });
    el.addEventListener('pointerleave', () => {
      waveHoverCount = Math.max(0, waveHoverCount - 1);
      el.classList.remove('waveOn');
    });
    el.addEventListener('pointermove', (e) => setWaveFromPointer(e, el), { passive: true });
  });

  /* ---------------- Parallax (cursor tilt) ---------------- */
  function attachParallax(el) {
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;

      const rotY = (x * 6).toFixed(2);
      const rotX = (-y * 6).toFixed(2);
      const trX = (x * 10).toFixed(1);
      const trY = (y * 10).toFixed(1);

      el.style.setProperty('--pRx', `${rotY}deg`);
      el.style.setProperty('--pRy', `${rotX}deg`);
      el.style.setProperty('--pTx', `${trX}px`);
      el.style.setProperty('--pTy', `${trY}px`);
    };

    const onLeave = () => {
      el.style.setProperty('--pRx', '0deg');
      el.style.setProperty('--pRy', '0deg');
      el.style.setProperty('--pTx', '0px');
      el.style.setProperty('--pTy', '0px');
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
  }

  qsa('[data-parallax]').forEach(attachParallax);

  /* ---------------- HERO "3D-ish" canvas (no libs) ---------------- */
  const heroCanvas = qs('#hero3d');
  let ctx;
  let w = 0,
    h = 0,
    dpr = 1;
  const pts = [];
  let mouseX = 0,
    mouseY = 0;

  function resizeHero() {
    if (!heroCanvas) return;
    const r = heroCanvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, Math.floor(r.width * dpr));
    h = Math.max(1, Math.floor(r.height * dpr));
    heroCanvas.width = w;
    heroCanvas.height = h;
    ctx = heroCanvas.getContext('2d');
  }

  function seedPts() {
    pts.length = 0;
    const n = 240;
    for (let i = 0; i < n; i++) {
      pts.push({
        x: (Math.random() * 2 - 1) * 1.2,
        y: (Math.random() * 2 - 1) * 0.9,
        z: Math.random() * 1.8,
        r: 0.004 + Math.random() * 0.014,
        hue: Math.random() < 0.22 ? 220 : 0,
      });
    }
  }

  heroCanvas?.addEventListener(
    'pointermove',
    (e) => {
      const r = heroCanvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width - 0.5;
      mouseY = (e.clientY - r.top) / r.height - 0.5;
    },
    { passive: true }
  );

  function roundRect(c, x, y, ww, hh, rr) {
    const r = Math.min(rr, Math.min(ww, hh) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + ww, y, x + ww, y + hh, r);
    c.arcTo(x + ww, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r);
    c.arcTo(x, y, x + ww, y, r);
    c.closePath();
  }

  function drawHero() {
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // vignette
    const grad = ctx.createRadialGradient(w * 0.52, h * 0.45, 20, w * 0.52, h * 0.45, Math.max(w, h) * 0.85);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // rotate based on mouse
    const ax = mouseY * 0.9;
    const ay = mouseX * 1.2;
    const cy = Math.cos(ay),
      sy = Math.sin(ay);
    const cx = Math.cos(ax),
      sx = Math.sin(ax);

    const proj = pts
      .map((p) => {
        let x = p.x,
          y = p.y,
          z = p.z;

        // y rotation
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        // x rotation
        const y2 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;

        const persp = 1 / (0.8 + z2);
        return {
          px: x1 * persp,
          py: y2 * persp,
          z: z2,
          r: p.r,
          hue: p.hue,
        };
      })
      .sort((a, b) => b.z - a.z);

    for (const p of proj) {
      const X = (p.px * 0.55 + 0.5) * w;
      const Y = (p.py * 0.55 + 0.5) * h;
      const s = p.r * (1.0 + (1.2 - p.z) * 0.7) * Math.min(w, h);

      const len = s * 3.2;
      const thick = s * 1.05;

      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(p.px * 0.6 + p.py * 0.4);

      ctx.fillStyle = p.hue === 220 ? 'rgba(43,73,255,0.95)' : 'rgba(245,245,255,0.88)';
      roundRect(ctx, -len * 0.5, -thick * 0.5, len, thick, thick * 0.5);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      roundRect(ctx, -len * 0.44, -thick * 0.32, len * 0.88, thick * 0.16, thick * 0.25);
      ctx.fill();

      ctx.restore();
    }
  }

  function tickHero() {
    if (heroCanvas && !ctx) {
      resizeHero();
      seedPts();
    }

    if (ctx) {
      for (const p of pts) {
        p.z -= 0.0025;
        if (p.z < 0.05) p.z = 1.85;
      }
      drawHero();
    }

    requestAnimationFrame(tickHero);
  }

  window.addEventListener(
    'resize',
    () => {
      resizeHero();
    },
    { passive: true }
  );

  tickHero();

  /* ---------------- Red stroke (draw on scroll) ---------------- */
  const flow = qs('#flow');
  const flowPath = qs('#flowPath');
  const flowLen = 100;

  if (flowPath) {
    flowPath.style.strokeDasharray = String(flowLen);
    flowPath.style.strokeDashoffset = String(flowLen);
  }

  function updateFlowStroke() {
    if (!flow || !flowPath) return;

    const r = flow.getBoundingClientRect();
    const vh = window.innerHeight;

    const start = vh * 0.75;
    const end = -r.height * 0.2;

    const t = (start - r.top) / (start - end);
    const p = clamp(t, 0, 1);

    flowPath.style.strokeDashoffset = String((1 - p) * flowLen);
  }

  /* ---------------- Showreel morph + play ---------------- */
  const reelPin = qs('#reelPin');
  const reelFrame = qs('#reelFrame');
  const reelVideo = qs('#reelVideo');
  const reelOverlay = qs('#reelOverlay');
  const reelBtn = qs('#reelBtn');

  let reelPlayed = false;

  function playReel() {
    if (!reelVideo || !reelFrame || reelPlayed) return;
    reelPlayed = true;
    reelFrame.classList.add('isPlaying');
    reelVideo.muted = true;

    const p = reelVideo.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  reelOverlay?.addEventListener('click', playReel);
  reelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    playReel();
  });

  function makeClip(clip) {
    // rectangle -> "flag" polygon (approx like your screenshot 6)
    const rect = [
      [0, 0],
      [100, 0],
      [100, 0],
      [100, 100],
      [100, 100],
      [0, 100],
    ];
    const tgt = [
      [0, 8],
      [78, 0],
      [100, 14],
      [100, 86],
      [78, 100],
      [0, 92],
    ];

    const pts = rect.map((p, i) => [lerp(p[0], tgt[i][0], clip), lerp(p[1], tgt[i][1], clip)]);
    return `polygon(${pts.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(',')})`;
  }

  function updateReelMorph() {
    if (!reelPin || !reelFrame) return;

    const top = reelPin.offsetTop;
    const hh = reelPin.offsetHeight;
    const vh = window.innerHeight;

    const p = clamp((window.scrollY - top) / (hh - vh), 0, 1);

    // ease like lusion: approach then reveal
    const e = 1 - Math.pow(1 - clamp(p / 0.65, 0, 1), 3);

    const s = 0.90 + 0.10 * e;
    const y = 22 * (1 - e);
    const r = 34 - 10 * e;

    reelFrame.style.setProperty('--reelS', s.toFixed(3));
    reelFrame.style.setProperty('--reelY', `${y.toFixed(1)}px`);
    reelFrame.style.setProperty('--reelR', `${r.toFixed(1)}px`);

    // clip + tint progression (blue -> normal)
    const clip = clamp((p - 0.28) / 0.52, 0, 1);
    reelFrame.style.clipPath = makeClip(clip);

    const tint = 0.68 * (1 - clamp((p - 0.45) / 0.45, 0, 1));
    reelFrame.style.setProperty('--tint', tint.toFixed(3));

    // overlay fade
    const ov = 1 - clamp((p - 0.72) / 0.18, 0, 1);
    reelFrame.style.setProperty('--ov', ov.toFixed(3));

    // autoplay near full reveal
    if (!reelPlayed && p > 0.78) playReel();
  }

  /* ---------------- Scroll loop ---------------- */
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      ticking = false;
      updateFlowStroke();
      updateReelMorph();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------- Work cards: quick "focus" flash on hover ---------------- */
  qsa('.workCard').forEach((card) => {
    let t;
    card.addEventListener('pointerenter', () => {
      card.classList.add('isFlash');
      clearTimeout(t);
      t = setTimeout(() => card.classList.remove('isFlash'), 120);
    });
    card.addEventListener('pointerleave', () => {
      clearTimeout(t);
      card.classList.remove('isFlash');
    });
  });
})();
