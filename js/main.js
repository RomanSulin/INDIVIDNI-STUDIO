/* ============================================================================================================================
   SERIAL v5 — scroll as montage (no libraries)
   - One sticky stage with layered episodes
   - Controlled background motion (not chaotic)
   - Ribbon transforms across episodes
   - Showreel lazy-load + pause offstage + audio only on click
   - Services sticker deck (hover on desktop, tap on mobile)
   - Works timeline scrub (desktop) + media pool (mobile)
   ============================================================================================================================ */

(() => {
  const root = document.documentElement;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

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
  // Cursor light vars
  // ------------------------------------------------------------------------------------------------
  window.addEventListener('pointermove', (e) => {
    root.style.setProperty('--mx', `${e.clientX}px`);
    root.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });

  // ------------------------------------------------------------------------------------------------
  // Serial elements
  // ------------------------------------------------------------------------------------------------
  const serial = document.getElementById('serial');
  const stage = document.getElementById('stage');
  const layers = Array.from(document.querySelectorAll('.layer.ep'));
  const hudTC = document.getElementById('hudTC');
  const hudScene = document.getElementById('hudScene');
  const hudLabel = document.getElementById('hudLabel');
  const railDots = Array.from(document.querySelectorAll('.rail-dot'));

  // Episode ranges (0..1 progress inside the serial scroll)
  const EP = [
    { key: 'EP0', label: 'COLD OPEN', a: 0.00, b: 0.22, accent: '--vio' },
    { key: 'EP1', label: 'SHOWREEL',  a: 0.18, b: 0.42, accent: '--cyn' },
    { key: 'EP2', label: 'SERVICES',  a: 0.38, b: 0.62, accent: '--amb' },
    { key: 'EP3', label: 'WORKS',     a: 0.58, b: 0.86, accent: '--lim' },
    { key: 'EP4', label: 'PRICE',     a: 0.82, b: 0.94, accent: '--vio' },
    { key: 'EP5', label: 'CONTACT',   a: 0.90, b: 1.00, accent: '--cyn' },
  ];

  // Ribbon keyframes along the serial
  const KF = [
    { p: 0.00, x: 58, y: 60, r: -14, s: 1.10 },
    { p: 0.28, x: 50, y: 52, r:   0, s: 1.05 },
    { p: 0.54, x: 40, y: 54, r:   8, s: 0.90 },
    { p: 0.78, x: 56, y: 40, r:  -3, s: 0.80 },
    { p: 1.00, x: 62, y: 48, r:  10, s: 0.62 },
  ];

  function interpKF(p) {
    p = clamp(p, 0, 1);
    let i = 0;
    for (; i < KF.length - 1; i++) {
      if (p >= KF[i].p && p <= KF[i + 1].p) break;
    }
    const a = KF[i], b = KF[i + 1];
    const t = remap(p, a.p, b.p);
    const tt = smoothstep(t);
    return {
      x: lerp(a.x, b.x, tt),
      y: lerp(a.y, b.y, tt),
      r: lerp(a.r, b.r, tt),
      s: lerp(a.s, b.s, tt),
    };
  }

  function getSerialProgress() {
    if (!serial) return 0;
    const r = serial.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    if (scrollable <= 1) return 0;
    const scrolled = -r.top;
    return clamp(scrolled / scrollable, 0, 1);
  }

  // ------------------------------------------------------------------------------------------------
  // Controlled floatfield motion (8 elements, not random)
  // ------------------------------------------------------------------------------------------------
  const FF = [
    { k: 0, ax: 42, ay: -26, ar: 18 },
    { k: 1, ax: -36, ay:  18, ar: -14 },
    { k: 2, ax:  24, ay:  28, ar: 12 },
    { k: 3, ax: -22, ay: -18, ar: -10 },
    { k: 4, ax:  18, ay:  20, ar: 8 },
    { k: 5, ax: -26, ay:  30, ar: -12 },
    { k: 6, ax:  30, ay: -14, ar: 10 },
    { k: 7, ax: -18, ay: -24, ar: -8 },
  ];

  function setFF(p) {
    const t = p * Math.PI * 2;
    FF.forEach((f) => {
      const sx = Math.sin(t + f.k * 0.9);
      const cy = Math.cos(t * 0.85 + f.k * 1.2);
      const x = (sx * f.ax) + (p - 0.5) * (f.ax * 0.9);
      const y = (cy * f.ay) + (0.5 - p) * (f.ay * 0.9);
      const r = (sx * f.ar) + (p - 0.5) * (f.ar * 0.6);
      root.style.setProperty(`--ff${f.k}x`, `${x.toFixed(2)}px`);
      root.style.setProperty(`--ff${f.k}y`, `${y.toFixed(2)}px`);
      root.style.setProperty(`--ff${f.k}r`, `${r.toFixed(2)}deg`);
    });
  }

  // ------------------------------------------------------------------------------------------------
  // Episodes visibility, HUD, accents, rail active dot
  // ------------------------------------------------------------------------------------------------
  function setEpisodes(p) {
    layers.forEach((layer) => {
      const ep = Number(layer.dataset.ep);
      const seg = EP[ep];
      if (!seg) return;

      // Soft overlap around edges
      const inT = remap(p, seg.a - 0.06, seg.b);
      const outT = remap(p, seg.b - 0.06, seg.b + 0.06);
      const vis = clamp(inT * (1 - outT), 0, 1);

      const y = (1 - vis) * 14; // subtle drift
      layer.style.opacity = String(vis);
      layer.style.transform = `translateY(${y.toFixed(2)}px)`;
      layer.style.pointerEvents = vis > 0.25 ? 'auto' : 'none';
    });

    // Current episode index
    let current = 0;
    for (let i = 0; i < EP.length; i++) {
      if (p >= EP[i].a) current = i;
    }
    const seg = EP[current];

    // Accent
    const accVar = getComputedStyle(root).getPropertyValue(seg.accent).trim();
    if (accVar) root.style.setProperty('--accent', accVar);

    // HUD
    if (hudScene) hudScene.textContent = seg.key;
    if (hudLabel) hudLabel.textContent = seg.label;

    // Rail
    railDots.forEach((d, i) => d.classList.toggle('is-active', i === current));
    root.style.setProperty('--railP', String(p));
  }

  // ------------------------------------------------------------------------------------------------
  // Showreel
  // ------------------------------------------------------------------------------------------------
  const frameImg  = document.getElementById('frameImg');
  const frameTC   = document.getElementById('frameTC');
  const frameMode = document.getElementById('frameMode');
  const frameTag  = document.getElementById('frameTag');
  const frameNote = document.getElementById('frameNote');

  const video    = document.getElementById('reelVideo');
  const btnPlay  = document.getElementById('btnPlay');
  const btnSound = document.getElementById('btnSound');
  const reelMode = document.getElementById('reelMode');

  let audioEnabled = false;
  let srcLoaded = false;

  function loadVideoSources() {
    if (!video || srcLoaded) return;
    const sources = Array.from(video.querySelectorAll('source[data-src]'));
    sources.forEach((s) => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
    video.load();
    srcLoaded = true;
  }

  function setAudio(on) {
    audioEnabled = !!on;
    if (!video) return;
    video.muted = !audioEnabled;
    if (btnSound) btnSound.textContent = audioEnabled ? 'Sound: ON' : 'Sound: OFF';
    if (reelMode && !video.paused) reelMode.textContent = audioEnabled ? 'playing (audio)' : 'playing';
  }

  function updateVideoMode() {
    if (!video || !reelMode) return;
    if (video.paused) reelMode.textContent = 'paused';
    else reelMode.textContent = audioEnabled ? 'playing (audio)' : 'playing';
  }

  if (btnPlay && video) {
    btnPlay.addEventListener('click', async () => {
      loadVideoSources();
      try {
        if (video.paused) await video.play();
        else video.pause();
      } catch (_) {}
      updateVideoMode();
    });
  }

  if (btnSound && video) {
    btnSound.addEventListener('click', async () => {
      loadVideoSources();
      setAudio(!audioEnabled);
      if (audioEnabled && video.paused) {
        try { await video.play(); } catch (_) {}
      }
      updateVideoMode();
    });
  }

  setAudio(false);

  function setReelActive(isActive) {
    if (stage) stage.classList.toggle('is-reel', isActive);
    if (!video) return;

    if (!isActive) {
      try { video.pause(); } catch (_) {}
      updateVideoMode();
    } else {
      loadVideoSources();
      if (reelMode && video.paused) reelMode.textContent = 'armed';
    }
  }

  // ------------------------------------------------------------------------------------------------
  // Services — sticker deck
  // ------------------------------------------------------------------------------------------------
  const svcDeck = document.getElementById('svcDeck');
  const svcName = document.getElementById('svcName');
  const svcDesc = document.getElementById('svcDesc');
  const canHover = window.matchMedia('(hover: hover)').matches;

  const services = [
    { k:'Продюсирование', d:'Идея → команда → контроль → мастер.' },
    { k:'Мероприятия',    d:'Репортаж / backstage / хайлайты 24–72h.' },
    { k:'Трансляции',     d:'Multicam эфир + графика + backup.' },
    { k:'Курсы',          d:'Сезоны, структура, единый стиль.' },
    { k:'Подкасты',       d:'Чистый звук + 2–4 камеры + shorts.' },
    { k:'Клипы',          d:'Свет, стиль, монтаж в бит, цвет.' },
    { k:'Реклама',        d:'Сценарий, сториборд, masters 16:9 + 9:16.' },
    { k:'Пост-прод',      d:'Монтаж, цвет, звук, субтитры.' },
    { k:'AI + 3D',        d:'Motion, HUD, VFX-штрихи, апскейл.' },
  ];

  function setSvc(i) {
    const s = services[i];
    if (!s) return;
    if (svcName) svcName.textContent = s.k;
    if (svcDesc) svcDesc.textContent = s.d;

    const items = Array.from(document.querySelectorAll('.svc-sticker'));
    items.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.idx) === i));
  }

  if (svcDeck) {
    svcDeck.innerHTML = '';
    services.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'svc-sticker';
      b.dataset.idx = String(i);
      b.innerHTML = `<div class="sk">${s.k}</div><div class="sd">${s.d}</div>`;

      if (canHover) {
        b.addEventListener('mouseenter', () => setSvc(i));
        b.addEventListener('focus', () => setSvc(i));
      }
      b.addEventListener('click', () => setSvc(i));

      svcDeck.appendChild(b);
    });
    setSvc(0);
  }

  // ------------------------------------------------------------------------------------------------
  // Works — placeholders + timeline + media pool
  // ------------------------------------------------------------------------------------------------
  const ruler = document.getElementById('ruler');
  const tracksEl = document.getElementById('tracks');
  const playhead = document.getElementById('playhead');
  const binGrid = document.getElementById('binGrid');

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
    { name: 'EVENT_01',   len: 6.4, img: makePlaceholder('EVENT_01', 195) },
    { name: 'LIVE_02',    len: 5.2, img: makePlaceholder('LIVE_02', 165) },
    { name: 'COURSE_03',  len: 7.1, img: makePlaceholder('COURSE_03', 245) },
    { name: 'PODCAST_04', len: 4.8, img: makePlaceholder('PODCAST_04', 285) },
    { name: 'AD_05',      len: 6.0, img: makePlaceholder('AD_05', 35) },
    { name: 'MV_06',      len: 8.0, img: makePlaceholder('MV_06', 310) },
  ];

  const totalLen = shots.reduce((a, s) => a + s.len, 0);
  let playheadT = 0;

  function setFrameByT(t) {
    t = clamp(t, 0, 1);
    playheadT = t;

    const seconds = t * totalLen;
    if (frameTC) frameTC.textContent = formatTC(seconds);

    // choose shot based on time
    let acc = 0;
    let pick = shots[0];
    for (const s of shots) {
      if (seconds >= acc && seconds < acc + s.len) { pick = s; break; }
      acc += s.len;
    }

    if (frameImg && frameImg.src !== pick.img) frameImg.src = pick.img;
    if (frameTag) frameTag.textContent = pick.name;
    if (playhead) playhead.style.left = `${(t * 100).toFixed(3)}%`;
  }

  function buildRuler() {
    if (!ruler) return;
    ruler.innerHTML = '';
    const ticks = 10;
    for (let i = 0; i <= ticks; i++) {
      const el = document.createElement('div');
      el.className = 'tick';
      el.style.left = `${(i / ticks) * 100}%`;
      const sec = (totalLen / ticks) * i;
      el.textContent = formatTC(sec).slice(3, 11); // mm:ss:ff
      ruler.appendChild(el);
    }
  }

  function buildTracks() {
    if (!tracksEl) return;
    Array.from(tracksEl.querySelectorAll('.track')).forEach((t) => t.remove());

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

        clip.innerHTML = `<span class="clip-name">${c.name}</span><span class="clip-len">${c.len.toFixed(1)}s</span>`;
        clip.addEventListener('click', () => setFrameByT(c.start / totalLen));

        row.appendChild(clip);
        x += w + 1.2; // tiny gap
      });

      tracksEl.appendChild(track);
    };

    let start = 0;
    const primary = shots.map((s) => {
      const o = { ...s, start, dim: false };
      start += s.len;
      return o;
    });

    mkTrack('V1', primary, 0);

    const broll = [primary[1], primary[3], primary[5]].map((s) => ({
      ...s,
      name: s.name.replace('_', '_B'),
      dim: true
    }));
    mkTrack('V2', broll, 1);

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
      t.addEventListener('click', () => {
        const start = shots.slice(0, i).reduce((a, x) => a + x.len, 0);
        setFrameByT(start / totalLen);
      });
      binGrid.appendChild(t);
    });
  }

  // initial placeholder
  if (frameImg && !frameImg.src) {
    frameImg.src = shots[0].img;
    if (frameTag) frameTag.textContent = shots[0].name;
    if (frameNote) frameNote.textContent = 'replace with your 16:9 screenshot';
  }

  buildRuler();
  buildTracks();
  buildBin();
  setFrameByT(0.18);

  // timeline interactions (desktop)
  if (tracksEl && playhead) {
    let dragging = false;

    const pxToT = (clientX) => {
      const r = tracksEl.getBoundingClientRect();
      return clamp((clientX - r.left) / r.width, 0, 1);
    };

    tracksEl.addEventListener('pointerdown', (e) => {
      const tl = document.getElementById('timeline');
      if (tl && getComputedStyle(tl).display === 'none') return; // mobile
      dragging = true;
      tracksEl.setPointerCapture?.(e.pointerId);
      setFrameByT(pxToT(e.clientX));
    });

    tracksEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setFrameByT(pxToT(e.clientX));
    });

    window.addEventListener('pointerup', () => { dragging = false; }, { passive:true });

    tracksEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = (e.deltaY || e.deltaX) * 0.00035;
      setFrameByT(playheadT + delta);
    }, { passive:false });
  }

  // ------------------------------------------------------------------------------------------------
  // Navigation (rail + buttons)
  // ------------------------------------------------------------------------------------------------
  const chapterToP = [0.02, 0.28, 0.50, 0.72, 0.90, 0.98];

  function scrollToSerialP(p) {
    if (!serial) return;
    const rect = serial.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const maxScroll = rect.height - window.innerHeight;
    const y = top + maxScroll * clamp(p, 0, 1);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  railDots.forEach((d) => {
    d.addEventListener('click', () => {
      const ch = Number(d.dataset.ch || '0');
      scrollToSerialP(chapterToP[ch] ?? 0);
    });
  });

  document.querySelectorAll('[data-ch]').forEach((el) => {
    el.addEventListener('click', () => {
      const ch = Number(el.getAttribute('data-ch'));
      scrollToSerialP(chapterToP[ch] ?? 0);
    });
  });

  document.querySelectorAll('[data-scrollto]').forEach((el) => {
    el.addEventListener('click', () => {
      const sel = el.getAttribute('data-scrollto');
      const target = document.querySelector(sel);
      if (!target) return;
      const y = window.scrollY + target.getBoundingClientRect().top - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // ------------------------------------------------------------------------------------------------
  // Render loop
  // ------------------------------------------------------------------------------------------------
  let raf = 0;

  function render() {
    raf = 0;

    const p = getSerialProgress();
    root.style.setProperty('--serialP', String(p));
    root.style.setProperty('--railP', String(p));

    // timecode across serial (~100 sec)
    if (hudTC) hudTC.textContent = formatTC(p * 100);

    // ribbon interpolation
    const k = interpKF(p);
    root.style.setProperty('--rbx', `${k.x.toFixed(2)}vw`);
    root.style.setProperty('--rby', `${k.y.toFixed(2)}vh`);
    root.style.setProperty('--rrot', `${k.r.toFixed(2)}deg`);
    root.style.setProperty('--rsc', `${k.s.toFixed(3)}`);

    // episode visibility + accents
    setEpisodes(p);

    // reel active segment
    const isReel = (p >= 0.18 && p <= 0.42);
    setReelActive(isReel);

    // frame mode label
    if (frameMode) {
      frameMode.textContent = isReel ? 'SHOWREEL' : (p >= 0.58 ? 'WORKS' : 'STANDBY');
    }

    // background controlled drift
    setFF(p);

    // if video is playing, sync TC
    if (isReel && video && !video.paused) {
      if (frameTC) frameTC.textContent = formatTC(video.currentTime || 0);
    }
  }

  function requestRender() {
    if (raf) return;
    raf = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });

  if (video) {
    video.addEventListener('timeupdate', () => {
      if (stage && stage.classList.contains('is-reel')) {
        if (frameTC) frameTC.textContent = formatTC(video.currentTime || 0);
      }
    });
    video.addEventListener('play', updateVideoMode);
    video.addEventListener('pause', updateVideoMode);
  }

  // sheet TC mirrors HUD TC
  const sheetTC = document.getElementById('sheetTC');
  if (sheetTC) {
    const sync = () => { sheetTC.textContent = hudTC ? hudTC.textContent : formatTC(0); };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  // first render
  render();
})();
