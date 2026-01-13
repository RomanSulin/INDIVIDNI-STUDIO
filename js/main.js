/* ============================================================================================================================
   INDIVIDNI — ART THEATRE v4
   - Scene navigation with cursor-wipe
   - Canvas "flying frames" (inspired by kinetic, airy motion; NOT paper)
   - Showreel lazy-load + pause offscreen + audio on click
   - Services node-map (hover on PC / tap on mobile)
   - Works NLE scrub (desktop) + Media Pool (mobile)
   ============================================================================================================================ */

(() => {
  const root = document.documentElement;
  const body = document.body;

  // ------------------------------------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function formatTC(seconds, fps = 25) {
    const totalFrames = Math.floor(seconds * fps);
    const fr = totalFrames % fps;
    const totalSec = Math.floor(totalFrames / fps);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(fr)}`;
  }

  // ------------------------------------------------------------------------------------------------
  // Cursor light (CSS vars)
  // ------------------------------------------------------------------------------------------------
  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.5;
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    root.style.setProperty('--lx', `${mouseX}px`);
    root.style.setProperty('--ly', `${mouseY}px`);
    root.style.setProperty('--wipeX', `${mouseX}px`);
    root.style.setProperty('--wipeY', `${mouseY}px`);
  }, { passive: true });

  // ------------------------------------------------------------------------------------------------
  // Scenes (theatre navigation)
  // ------------------------------------------------------------------------------------------------
  const stack = document.getElementById('stack');
  const scenes = Array.from(document.querySelectorAll('.scene'));
  scenes.forEach((s, i) => s.style.setProperty('--i', String(i)));

  const hudLinks = Array.from(document.querySelectorAll('[data-go]'));
  const hudTC = document.getElementById('hudTC');

  const accents = {
    violet: getComputedStyle(root).getPropertyValue('--violet').trim(),
    cyan: getComputedStyle(root).getPropertyValue('--cyan').trim(),
    amber: getComputedStyle(root).getPropertyValue('--amber').trim(),
    lime: getComputedStyle(root).getPropertyValue('--lime').trim(),
  };

  let index = 0;
  let isAnimating = false;

  function setAccentFromScene(i) {
    const s = scenes[i];
    const key = (s && s.dataset.accent) || 'violet';
    const c = accents[key] || accents.violet;
    root.style.setProperty('--accent', c);
  }

  function setActiveButtons(i) {
    hudLinks.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.go) === i));
    const dockBtns = Array.from(document.querySelectorAll('.dock-btn'));
    dockBtns.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.go) === i));
  }

  function setActiveScene(i) {
    scenes.forEach((s, k) => s.classList.toggle('is-active', k === i));
    root.style.setProperty('--cam', String(i));
    setAccentFromScene(i);
    setActiveButtons(i);
  }

  function wipeTo(i) {
    if (isAnimating) return;
    if (i < 0 || i >= scenes.length) return;
    if (i === index) return;

    isAnimating = true;
    body.classList.add('is-wiping');

    // after wipe covers, switch scene
    window.setTimeout(() => {
      index = i;
      setActiveScene(index);
      // update TC as "chapter time"
      if (hudTC) hudTC.textContent = formatTC(index * 18.2);
    }, 260);

    // remove wipe after transition
    window.setTimeout(() => {
      body.classList.remove('is-wiping');
      isAnimating = false;
    }, 640);
  }

  // buttons
  hudLinks.forEach((b) => {
    b.addEventListener('click', () => wipeTo(Number(b.dataset.go)));
  });

  // start accent
  setActiveScene(index);
  if (hudTC) hudTC.textContent = formatTC(0);

  // wheel navigation (desktop)
  let wheelLock = 0;
  window.addEventListener('wheel', (e) => {
    // allow normal wheel inside form inputs
    const t = e.target;
    const isField = t && (t.closest('input,textarea,select,details') || t.closest('.bin-grid'));
    if (isField) return;

    e.preventDefault();
    const now = performance.now();
    if (now - wheelLock < 520) return;
    wheelLock = now;

    const dir = Math.sign(e.deltaY);
    if (dir > 0) wipeTo(index + 1);
    else if (dir < 0) wipeTo(index - 1);
  }, { passive: false });

  // key navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); wipeTo(index + 1); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); wipeTo(index - 1); }
    if (e.key === 'Home') { e.preventDefault(); wipeTo(0); }
    if (e.key === 'End') { e.preventDefault(); wipeTo(scenes.length - 1); }
  });

  // mobile swipe navigation (only when not interacting inside controls)
  let touchStartY = 0;
  let touchStartX = 0;
  let touchId = null;
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touchId = e.pointerId;
    touchStartY = e.clientY;
    touchStartX = e.clientX;
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    if (touchId !== e.pointerId) return;

    const dy = e.clientY - touchStartY;
    const dx = e.clientX - touchStartX;

    // ignore horizontal drags (e.g. timeline bins)
    if (Math.abs(dx) > Math.abs(dy)) return;

    // ignore tiny swipes
    if (Math.abs(dy) < 60) return;

    // ignore when interacting in form
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.closest('input,textarea,select,.bin-grid,.map,.chip')) return;

    if (dy < 0) wipeTo(index + 1);
    else wipeTo(index - 1);
  }, { passive: true });

  // ------------------------------------------------------------------------------------------------
  // Showreel: lazy-load + pause offscreen + audio toggle
  // ------------------------------------------------------------------------------------------------
  const video = document.getElementById('showreelVideo');
  const playBtn = document.getElementById('reelPlay');
  const soundBtn = document.getElementById('reelSound');
  const reelMode = document.getElementById('reelMode');
  const reelTC = document.getElementById('reelTC');

  let audioEnabled = false;
  let srcLoaded = false;

  function loadVideoSources() {
    if (!video || srcLoaded) return;
    const sources = Array.from(video.querySelectorAll('source[data-src]'));
    sources.forEach((s) => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
    video.load();
    srcLoaded = true;
  }

  function updateReelTC() {
    if (!video || !reelTC) return;
    reelTC.textContent = formatTC(video.currentTime || 0);
  }

  if (video) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          loadVideoSources();
          if (reelMode) reelMode.textContent = 'armed';
        } else {
          // pause when offscreen (or offscene)
          try { video.pause(); } catch(_){}
          if (reelMode) reelMode.textContent = 'standby';
        }
      });
    }, { threshold: 0.25 });
    io.observe(video);

    video.addEventListener('timeupdate', updateReelTC);
    video.addEventListener('pause', () => { if (reelMode) reelMode.textContent = 'paused'; });
    video.addEventListener('play', () => { if (reelMode) reelMode.textContent = audioEnabled ? 'playing (audio)' : 'playing'; });
  }

  if (playBtn && video) {
    playBtn.addEventListener('click', async () => {
      loadVideoSources();
      try {
        if (video.paused) await video.play();
        else video.pause();
      } catch (_) {}
    });
  }

  function setAudio(on) {
    audioEnabled = !!on;
    if (!video) return;
    video.muted = !audioEnabled;
    if (soundBtn) soundBtn.textContent = audioEnabled ? 'Sound: ON' : 'Sound: OFF';
    if (reelMode && !video.paused) reelMode.textContent = audioEnabled ? 'playing (audio)' : 'playing';
  }
  if (soundBtn && video) {
    soundBtn.addEventListener('click', async () => {
      loadVideoSources();
      setAudio(!audioEnabled);
      if (!video.paused) return;
      try { await video.play(); } catch(_) {}
    });
  }
  setAudio(false);

  // ------------------------------------------------------------------------------------------------
  // Services map (hover PC / tap mobile)
  // ------------------------------------------------------------------------------------------------
  const svcName = document.getElementById('svcName');
  const svcDesc = document.getElementById('svcDesc');
  const svcMap = document.getElementById('svcMap');

  const canHover = window.matchMedia('(hover: hover)').matches;

  const svc = [
    { t:'Продюсирование', d:'Концепт → команда → контроль → мастер.', a: 330 },
    { t:'Мероприятия', d:'Репортаж, backstage, хайлайты 24–72h.', a: 20 },
    { t:'Трансляции', d:'Multicam эфир + графика + backup.', a: 70 },
    { t:'Курсы', d:'Съёмка сезонами. Система, не разовые уроки.', a: 120 },
    { t:'Подкасты', d:'Чистый звук + 2–4 камеры + shorts.', a: 170 },
    { t:'Клипы', d:'Свет, стиль, монтаж в бит, цвет.', a: 220 },
    { t:'Реклама', d:'Сценарий, сториборд, мастера 16:9 + 9:16.', a: 260 },
    { t:'Пост‑прод', d:'Монтаж, цвет, звук, субтитры.', a: 300 },
    { t:'AI + 3D', d:'Motion, HUD, VFX‑штрихи, апскейл.', a: 40 },
  ];

  function polarToXY(angleDeg, radius, cx, cy) {
    const a = (angleDeg * Math.PI) / 180;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  }

  function setSvc(i) {
    const s = svc[i];
    if (!s) return;
    if (svcName) svcName.textContent = s.t;
    if (svcDesc) svcDesc.textContent = s.d;
    const nodes = Array.from(document.querySelectorAll('.node'));
    nodes.forEach((n) => n.classList.toggle('is-active', Number(n.dataset.idx) === i));
  }

  if (svcMap) {
    const rect = () => svcMap.getBoundingClientRect();
    const build = () => {
      // remove old nodes
      Array.from(svcMap.querySelectorAll('.node')).forEach((n) => n.remove());
      const r = rect();
      const cx = r.width/2, cy = r.height/2;

      svc.forEach((s, i) => {
        const ring = i % 3; // spread across rings
        const rr = r.width * (ring === 0 ? 0.33 : ring === 1 ? 0.25 : 0.18);
        const p = polarToXY(s.a, rr, cx, cy);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'node';
        btn.dataset.idx = String(i);
        btn.style.left = `${(p.x / r.width) * 100}%`;
        btn.style.top  = `${(p.y / r.height) * 100}%`;
        btn.innerHTML = `<span class="node-dot" aria-hidden="true"></span><span class="node-t">${s.t}</span>`;

        if (canHover) {
          btn.addEventListener('mouseenter', () => setSvc(i));
          btn.addEventListener('focus', () => setSvc(i));
        }
        btn.addEventListener('click', () => setSvc(i));

        svcMap.appendChild(btn);
      });
    };

    build();
    window.addEventListener('resize', () => build(), { passive: true });
    setSvc(0);
  }

  // ------------------------------------------------------------------------------------------------
  // Works: NLE — placeholders, timeline, scrub
  // ------------------------------------------------------------------------------------------------
  const nle = document.getElementById('nle');
  const nleFrame = document.getElementById('nleFrame');
  const nleTC = document.getElementById('nleTC');
  const ruler = document.getElementById('ruler');
  const tracksEl = document.getElementById('tracks');
  const playhead = document.getElementById('playhead');
  const binGrid = document.getElementById('binGrid');

  // simple SVG placeholders (no external assets)
  function makePlaceholder(label, hue = 210) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="hsl(${hue} 80% 55%)" stop-opacity="0.22"/>
            <stop offset="1" stop-color="hsl(${(hue+50)%360} 80% 55%)" stop-opacity="0.14"/>
          </linearGradient>
          <filter id="n">
            <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/>
            <feColorMatrix type="matrix" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 .20 0"/>
          </filter>
        </defs>
        <rect width="1280" height="720" fill="#070a10"/>
        <rect width="1280" height="720" fill="url(#g)"/>
        <rect width="1280" height="720" filter="url(#n)" opacity=".30"/>
        <g fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2">
          <rect x="70" y="70" width="1140" height="580" rx="26"/>
        </g>
        <text x="90" y="140" fill="rgba(255,255,255,0.86)" font-family="ui-monospace, monospace" font-size="34" letter-spacing="6">${label}</text>
        <text x="90" y="186" fill="rgba(255,255,255,0.52)" font-family="ui-monospace, monospace" font-size="18" letter-spacing="3">REPLACE WITH YOUR 16:9 SCREENSHOT</text>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const shots = [
    { name: 'EVENT_01', len: 6.4, img: makePlaceholder('EVENT_01', 195) },
    { name: 'LIVE_02',  len: 5.2, img: makePlaceholder('LIVE_02', 165) },
    { name: 'COURSE_03',len: 7.1, img: makePlaceholder('COURSE_03', 245) },
    { name: 'PODCAST_04',len: 4.8, img: makePlaceholder('PODCAST_04', 285) },
    { name: 'AD_05',    len: 6.0, img: makePlaceholder('AD_05', 35) },
    { name: 'MV_06',    len: 8.0, img: makePlaceholder('MV_06', 310) },
  ];

  let totalLen = shots.reduce((a, s) => a + s.len, 0);
  let playheadT = 0; // 0..1

  function setFrameByT(t) {
    t = clamp(t, 0, 1);
    playheadT = t;

    const seconds = t * totalLen;
    if (nleTC) nleTC.textContent = formatTC(seconds);

    // choose shot
    let acc = 0;
    let pick = shots[0];
    for (const s of shots) {
      if (seconds >= acc && seconds < acc + s.len) { pick = s; break; }
      acc += s.len;
    }
    if (nleFrame && nleFrame.src !== pick.img) nleFrame.src = pick.img;

    if (playhead && tracksEl) {
      const x = `${(t * 100).toFixed(3)}%`;
      playhead.style.left = x;
    }
  }

  function buildRuler() {
    if (!ruler) return;
    ruler.innerHTML = '';
    const ticks = 10;
    for (let i=0;i<=ticks;i++){
      const el = document.createElement('div');
      el.className = 'tick';
      el.style.left = `${(i/ticks)*100}%`;
      const sec = (totalLen/ticks)*i;
      el.textContent = formatTC(sec).slice(3, 11); // mm:ss:ff
      ruler.appendChild(el);
    }
  }

  function buildTracks() {
    if (!tracksEl) return;
    // clear all tracks except playhead
    Array.from(tracksEl.querySelectorAll('.track')).forEach((t)=>t.remove());

    const mkTrack = (label, clips, topIndex) => {
      const track = document.createElement('div');
      track.className = 'track';
      track.style.top = `${topIndex * 44}px`;
      track.innerHTML = `<span class="track-label">${label}</span><div class="cliprow"></div>`;
      const row = track.querySelector('.cliprow');

      let x = 0;
      clips.forEach((c) => {
        const w = (c.len / totalLen) * 100;
        const clip = document.createElement('div');
        clip.className = `clip ${c.dim ? 'dim' : ''}`;
        clip.style.left = `${x}%`;
        clip.style.width = `${w}%`;
        clip.dataset.t = String((c.start / totalLen));
        clip.innerHTML = `<span class="clip-name">${c.name}</span><span class="clip-len">${c.len.toFixed(1)}s</span>`;
        clip.addEventListener('click', () => setFrameByT(c.start / totalLen));
        row.appendChild(clip);
        x += w + 1.2; // small gap
      });

      tracksEl.appendChild(track);
    };

    // build clip schedule
    let start = 0;
    const primary = shots.map((s) => {
      const o = { ...s, start, dim:false };
      start += s.len;
      return o;
    });

    mkTrack('V1', primary, 0);

    // secondary track with fewer "b-roll" clips (dim)
    const broll = [primary[1], primary[3], primary[5]].map((s) => ({ ...s, name: s.name.replace('_', '_B'), dim:true }));
    mkTrack('V2', broll, 1);

    // audio track as long clip
    const a = document.createElement('div');
    a.className = 'track';
    a.style.top = `${2 * 44}px`;
    a.innerHTML = `<span class="track-label">A1</span><div class="cliprow"></div>`;
    const row = a.querySelector('.cliprow');
    const audio = document.createElement('div');
    audio.className = 'clip dim';
    audio.style.left = '0%';
    audio.style.width = '98%';
    audio.innerHTML = `<span class="clip-name">MIXDOWN</span><span class="clip-len">${totalLen.toFixed(1)}s</span>`;
    row.appendChild(audio);
    tracksEl.appendChild(a);
  }

  function buildBin() {
    if (!binGrid) return;
    binGrid.innerHTML = '';
    shots.forEach((s, i) => {
      const t = document.createElement('div');
      t.className = 'bin-thumb';
      t.innerHTML = `<img alt="${s.name}" src="${s.img}"><div class="bin-cap">${s.name}</div>`;
      t.addEventListener('click', () => setFrameByT((shots.slice(0,i).reduce((a,x)=>a+x.len,0)) / totalLen));
      binGrid.appendChild(t);
    });
  }

  if (nleFrame && !nleFrame.src) nleFrame.src = shots[0].img;
  buildRuler();
  buildTracks();
  buildBin();
  setFrameByT(0.18);

  // timeline interactions (desktop)
  if (tracksEl && playhead) {
    // horizontal wheel feel by dragging the playhead
    let dragging = false;

    const pxToT = (clientX) => {
      const r = tracksEl.getBoundingClientRect();
      return clamp((clientX - r.left) / r.width, 0, 1);
    };

    tracksEl.addEventListener('pointerdown', (e) => {
      // avoid on mobile where timeline hidden
      if (getComputedStyle(document.querySelector('.timeline') || tracksEl).display === 'none') return;
      dragging = true;
      tracksEl.setPointerCapture?.(e.pointerId);
      setFrameByT(pxToT(e.clientX));
    });

    tracksEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setFrameByT(pxToT(e.clientX));
    });

    window.addEventListener('pointerup', () => { dragging = false; }, { passive:true });

    // wheel to scrub time (horizontal feel)
    tracksEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = (e.deltaY || e.deltaX) * 0.00035;
      setFrameByT(playheadT + delta);
    }, { passive:false });
  }

  // ------------------------------------------------------------------------------------------------
  // Canvas FX: "flying frames" (kinetic / airy)
  // ------------------------------------------------------------------------------------------------
  const canvas = document.getElementById('fx');
  const ctx = canvas?.getContext('2d', { alpha: true });

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || !ctx || prefersReduce) return;

  const DPR = () => Math.min(2, window.devicePixelRatio || 1);
  function resize() {
    const dpr = DPR();
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive:true });

  // small deterministic "noise" without libs
  function n2(t, seed) {
    return Math.sin(t * 0.7 + seed) * 0.6 + Math.sin(t * 1.31 + seed * 1.7) * 0.4;
  }

  function hexToRgb(hex){
    const m = hex.replace('#','').trim();
    const full = m.length===3 ? m.split('').map(x=>x+x).join('') : m;
    const n = parseInt(full, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }

  const max = window.innerWidth < 980 ? 18 : 28;
  const frames = Array.from({ length: max }, (_, i) => {
    const d = 0.25 + Math.random() * 0.9; // depth
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.004,
      w: (60 + Math.random() * 140) * d,
      h: (34 + Math.random() * 90) * d,
      r: (10 + Math.random() * 22) * d,
      d,
      s: i * 13.37,
    };
  });

  let t0 = performance.now();

  function drawRoundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function tick(now) {
    const dt = Math.min(32, now - t0);
    t0 = now;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // fade background very lightly (no heavy trails)
    ctx.clearRect(0,0,w,h);

    // accent colors
    const acc = getComputedStyle(root).getPropertyValue('--accent').trim() || '#a58cff';
    const { r, g, b } = hexToRgb(acc);

    // subtle vignette
    const vg = ctx.createRadialGradient(w*0.5, h*0.5, 100, w*0.5, h*0.5, Math.max(w,h)*0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,w,h);

    // frames
    const time = now * 0.001;
    frames.forEach((f) => {
      // drift (noise-like)
      const driftX = n2(time, f.s) * 0.12;
      const driftY = n2(time + 2.4, f.s) * 0.12;

      f.vx += driftX;
      f.vy += driftY;

      // mouse repulsion (like air)
      const dx = (f.x - mouseX);
      const dy = (f.y - mouseY);
      const dist = Math.hypot(dx, dy);
      const reach = 240 * f.d;
      if (dist < reach) {
        const p = (1 - dist / reach);
        const force = 0.55 * p;
        f.vx += (dx / (dist + 0.001)) * force;
        f.vy += (dy / (dist + 0.001)) * force;
        f.va += ((dx * 0.000002) - (dy * 0.000002)) * p;
      }

      // damping
      f.vx *= 0.985;
      f.vy *= 0.985;
      f.va *= 0.992;

      // integrate
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.a += f.va * dt;

      // wrap
      const pad = 180;
      if (f.x < -pad) f.x = w + pad;
      if (f.x > w + pad) f.x = -pad;
      if (f.y < -pad) f.y = h + pad;
      if (f.y > h + pad) f.y = -pad;

      // draw
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);

      const alpha = 0.11 + (1 - f.d) * 0.06;
      const fill = `rgba(${r},${g},${b},${alpha})`;
      const edge = `rgba(255,255,255,${0.12 + (1 - f.d) * 0.08})`;

      // gradient fill
      const grad = ctx.createLinearGradient(-f.w/2, -f.h/2, f.w/2, f.h/2);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(1, `rgba(${Math.min(255,r+60)},${Math.min(255,g+60)},${Math.min(255,b+60)},${alpha*0.65})`);

      ctx.fillStyle = grad;
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;

      drawRoundedRect(-f.w/2, -f.h/2, f.w, f.h, f.r);
      ctx.fill();
      ctx.stroke();

      // inner "frame"
      ctx.strokeStyle = `rgba(0,0,0,0.35)`;
      ctx.lineWidth = 1;
      drawRoundedRect(-f.w/2 + 10*f.d, -f.h/2 + 10*f.d, f.w - 20*f.d, f.h - 20*f.d, Math.max(6*f.d, f.r*0.6));
      ctx.stroke();

      ctx.restore();
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
