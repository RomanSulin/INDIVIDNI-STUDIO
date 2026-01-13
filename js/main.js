/* ============================================================================================================================
  SERIAL v6 — TOON CREW / STREET MOTION 
  - Desktop: GSAP pinned scenes, cinematic transitions, controlled decor motion, characters react per scene
  - Mobile: snap panels, own controls, lazy-load showreel
  - Works: placeholder frames + timeline scrub (desktop) + media pool (mobile)
  ============================================================================================================================ */

/* global gsap, ScrollTrigger */

(() => {
  const root = document.documentElement;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

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
  // Cursor light
  // ------------------------------------------------------------------------------------------------
  window.addEventListener('pointermove', (e) => {
    root.style.setProperty('--mx', `${e.clientX}px`);
    root.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });

  // ------------------------------------------------------------------------------------------------
  // Menu overlay
  // ------------------------------------------------------------------------------------------------
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menuBtn');
  const menuClose = document.getElementById('menuClose');

  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('isOpen'));
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('isOpen');
    setTimeout(() => { menu.hidden = true; }, 120);
  }
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menu) menu.addEventListener('click', (e) => {
    if (e.target === menu) closeMenu();
  });

  // Menu link jumps
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-goto');
      closeMenu();
      gotoScene(key);
    });
  });

  // ------------------------------------------------------------------------------------------------
  // Detect mode
  // ------------------------------------------------------------------------------------------------
  const isMobile = matchMedia('(max-width: 980px)').matches;

  // ------------------------------------------------------------------------------------------------
  // Desktop: scenes + pin
  // ------------------------------------------------------------------------------------------------
  const topTC = document.getElementById('topTC');

  const pin = document.getElementById('pin');
  const stage = document.getElementById('stage');

  const scenes = {
    intro: document.querySelector('.scene.s0'),
    reel: document.querySelector('.scene.s1'),
    services: document.querySelector('.scene.s2'),
    works: document.querySelector('.scene.s3'),
    price: document.querySelector('.scene.s4'),
    contact: document.querySelector('.scene.s5')
  };

  const sceneOrder = ['intro', 'reel', 'services', 'works', 'price', 'contact'];

  let currentScene = 'intro';

  function setActiveScene(key) {
    currentScene = key;
    sceneOrder.forEach((k) => {
      const el = scenes[k];
      if (!el) return;
      el.classList.toggle('is-active', k === key);
    });
  }

  function gotoScene(key) {
    // Desktop = scroll inside pin timeline. Mobile = snap panel scroll.
    if (!key) return;
    if (isMobile) {
      const snap = document.getElementById('mSnap');
      const target = snap?.querySelector(`.mPanel[data-m="${key}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!pin) return;
    const idx = Math.max(0, sceneOrder.indexOf(key));
    const pinTop = pin.getBoundingClientRect().top + window.scrollY;
    const pinHeight = pin.offsetHeight;
    const progress = idx / (sceneOrder.length - 1);
    const y = pinTop + progress * (pinHeight - window.innerHeight);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // ------------------------------------------------------------------------------------------------
  // Showreel (desktop + mobile)
  // ------------------------------------------------------------------------------------------------
  const showreel = document.getElementById('showreel');
  const reelPlay = document.getElementById('reelPlay');
  const reelSound = document.getElementById('reelSound');
  const reelTC = document.getElementById('reelTC');
  const viewerTC = document.getElementById('viewerTC');

  let reelAudio = false;
  let reelLoaded = false;

  function loadVideo(v) {
    if (!v) return;
    const sources = Array.from(v.querySelectorAll('source[data-src]'));
    if (!sources.length) return;
    sources.forEach((s) => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
    v.load();
  }

  function ensureReelLoaded() {
    if (!showreel || reelLoaded) return;
    loadVideo(showreel);
    reelLoaded = true;
  }

  function setReelAudio(on) {
    reelAudio = !!on;
    if (!showreel) return;
    showreel.muted = !reelAudio;
    if (reelSound) reelSound.textContent = reelAudio ? 'Sound: ON' : 'Sound: OFF';
  }

  function updateReelTC() {
    if (!showreel) return;
    const tc = formatTC(showreel.currentTime || 0);
    if (reelTC) reelTC.textContent = tc;
    if (viewerTC) viewerTC.textContent = tc;
  }

  if (showreel) {
    showreel.addEventListener('timeupdate', updateReelTC);
  }
  if (reelPlay && showreel) {
    reelPlay.addEventListener('click', async () => {
      ensureReelLoaded();
      try {
        if (showreel.paused) await showreel.play();
        else showreel.pause();
      } catch (_) {}
    });
  }
  if (reelSound && showreel) {
    reelSound.addEventListener('click', async () => {
      ensureReelLoaded();
      setReelAudio(!reelAudio);
      if (reelAudio && showreel.paused) {
        try { await showreel.play(); } catch (_) {}
      }
    });
  }
  setReelAudio(false);

  // Mobile showreel
  const mShowreel = document.getElementById('mShowreel');
  const mPlay = document.getElementById('mPlay');
  const mSound = document.getElementById('mSound');
  let mAudio = false, mLoaded = false;

  function ensureMReelLoaded() {
    if (!mShowreel || mLoaded) return;
    loadVideo(mShowreel);
    mLoaded = true;
  }

  function setMAudio(on) {
    mAudio = !!on;
    if (!mShowreel) return;
    mShowreel.muted = !mAudio;
    if (mSound) mSound.textContent = mAudio ? 'Sound: ON' : 'Sound: OFF';
  }

  if (mPlay && mShowreel) {
    mPlay.addEventListener('click', async () => {
      ensureMReelLoaded();
      try {
        if (mShowreel.paused) await mShowreel.play();
        else mShowreel.pause();
      } catch (_) {}
    });
  }

  if (mSound && mShowreel) {
    mSound.addEventListener('click', async () => {
      ensureMReelLoaded();
      setMAudio(!mAudio);
      if (mAudio && mShowreel.paused) {
        try { await mShowreel.play(); } catch (_) {}
      }
    });
  }
  setMAudio(false);

  // Pause reel when leaving reel scene (desktop)
  function pauseReelIfNeeded() {
    if (!showreel) return;
    if (currentScene !== 'reel') {
      try { showreel.pause(); } catch (_) {}
    }
  }

  // ------------------------------------------------------------------------------------------------
  // Services (desktop wall + mobile carousel)
  // ------------------------------------------------------------------------------------------------
  const svcWall = document.getElementById('svcWall');
  const svcTitle = document.getElementById('svcTitle');
  const svcDesc = document.getElementById('svcDesc');

  const services = [
    { k:'Продюсирование', d:'Идея → команда → контроль → мастер.' },
    { k:'Съёмка мероприятий', d:'Репортаж, backstage, хайлайты 24–72h.' },
    { k:'Трансляции', d:'Multicam эфир + графика + backup.' },
    { k:'Курсы', d:'Сезоны, структура, единый стиль.' },
    { k:'Подкасты / интервью', d:'Чистый звук + 2–4 камеры + shorts.' },
    { k:'Клипы', d:'Свет, стиль, монтаж в бит, цвет.' },
    { k:'Реклама', d:'Сценарий, сториборд, мастера 16:9 + 9:16.' },
    { k:'Пост-прод', d:'Монтаж, цвет, звук, субтитры.' },
    { k:'AI + 3D', d:'Motion, VFX-штрихи, апскейл.' },
  ];

  function setService(i) {
    const s = services[i];
    if (!s) return;
    if (svcTitle) svcTitle.textContent = s.k;
    if (svcDesc) svcDesc.textContent = s.d;

    document.querySelectorAll('.svcSticker').forEach((el) => {
      el.classList.toggle('isActive', Number(el.dataset.idx) === i);
    });
  }

  if (svcWall) {
    svcWall.innerHTML = '';
    services.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'svcSticker';
      b.dataset.idx = String(i);
      b.innerHTML = `<div class="sk">${s.k}</div><div class="sd">${s.d}</div>`;
      b.addEventListener('mouseenter', () => setService(i));
      b.addEventListener('focus', () => setService(i));
      b.addEventListener('click', () => setService(i));
      svcWall.appendChild(b);
    });
    setService(0);
  }

  // Mobile services carousel
  const mSvc = document.getElementById('mSvc');
  if (mSvc) {
    mSvc.innerHTML = '';
    services.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'mCard';
      card.innerHTML = `<div class="mk">MODULE</div><div class="mt">${s.k}</div><div class="md">${s.d}</div>`;
      mSvc.appendChild(card);
    });
  }

  // ------------------------------------------------------------------------------------------------
  // Works placeholders + timeline (desktop) + mobile pool
  // ------------------------------------------------------------------------------------------------
  const workImg = document.getElementById('workImg');
  const workName = document.getElementById('workName');
  const workTime = document.getElementById('workTime');

  const ruler = document.getElementById('ruler');
  const tracksEl = document.getElementById('tracks');
  const playhead = document.getElementById('playhead');
  const binGrid = document.getElementById('binGrid');

  const mWorkImg = document.getElementById('mWorkImg');
  const mWorkGrid = document.getElementById('mWorkGrid');

  function makePlaceholder(label, hue = 210) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="hsl(${hue} 80% 55%)" stop-opacity="0.24"/>
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
        <text x="90" y="140" fill="rgba(255,255,255,0.90)" font-family="ui-monospace, monospace" font-size="34" letter-spacing="6">${label}</text>
        <text x="90" y="186" fill="rgba(255,255,255,0.52)" font-family="ui-monospace, monospace" font-size="18" letter-spacing="3">REPLACE WITH YOUR 16:9 SCREENSHOT</text>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const shots = [
    { name:'EVENT_01',   len:6.4, img: makePlaceholder('EVENT_01', 195) },
    { name:'LIVE_02',    len:5.2, img: makePlaceholder('LIVE_02', 165) },
    { name:'COURSE_03',  len:7.1, img: makePlaceholder('COURSE_03', 245) },
    { name:'PODCAST_04', len:4.8, img: makePlaceholder('PODCAST_04', 285) },
    { name:'AD_05',      len:6.0, img: makePlaceholder('AD_05', 35)  },
    { name:'MV_06',      len:8.0, img: makePlaceholder('MV_06', 310) },
  ];
  const totalLen = shots.reduce((a, s) => a + s.len, 0);
  let playT = 0;

  function setWorkByT(t) {
    t = clamp(t, 0, 1);
    playT = t;

    const seconds = t * totalLen;
    const tc = formatTC(seconds);

    if (workTime) workTime.textContent = tc;
    if (playhead) playhead.style.left = `${(t * 100).toFixed(3)}%`;

    let acc = 0;
    let pick = shots[0];
    for (const s of shots) {
      if (seconds >= acc && seconds < acc + s.len) { pick = s; break; }
      acc += s.len;
    }

    if (workImg) workImg.src = pick.img;
    if (workName) workName.textContent = pick.name;

    if (mWorkImg) mWorkImg.src = pick.img;
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
      track.innerHTML = `<span class="trackLabel">${label}</span><div class="clipRow"></div>`;
      const row = track.querySelector('.clipRow');

      let x = 0;
      clips.forEach((c) => {
        const w = (c.len / totalLen) * 100;

        const clip = document.createElement('div');
        clip.className = `clip ${c.dim ? 'dim' : ''}`;
        clip.style.left = `${x}%`;
        clip.style.width = `${w}%`;
        clip.innerHTML = `<span class="clipName">${c.name}</span><span class="clipLen">${c.len.toFixed(1)}s</span>`;
        clip.addEventListener('click', () => setWorkByT(c.start / totalLen));

        row.appendChild(clip);
        x += w + 1.2;
      });

      tracksEl.appendChild(track);
    };

    let start = 0;
    const primary = shots.map((s) => {
      const o = { ...s, start, dim:false };
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

    // audio layer
    const a = document.createElement('div');
    a.className = 'track';
    a.style.top = `${2 * 44}px`;
    a.innerHTML = `<span class="trackLabel">A1</span><div class="clipRow"></div>`;
    const row = a.querySelector('.clipRow');

    const audio = document.createElement('div');
    audio.className = 'clip dim';
    audio.style.left = '0%';
    audio.style.width = '98%';
    audio.innerHTML = `<span class="clipName">MIXDOWN</span><span class="clipLen">${totalLen.toFixed(1)}s</span>`;
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
        setWorkByT(start / totalLen);
      });
      binGrid.appendChild(t);
    });
  }

  function buildMobileWorks() {
    if (!mWorkGrid) return;
    mWorkGrid.innerHTML = '';
    shots.forEach((s, i) => {
      const t = document.createElement('div');
      t.className = 'mThumb';
      t.innerHTML = `<img alt="${s.name}" src="${s.img}"><div class="cap">${s.name}</div>`;
      t.addEventListener('click', () => {
        const start = shots.slice(0, i).reduce((a, x) => a + x.len, 0);
        setWorkByT(start / totalLen);
      });
      mWorkGrid.appendChild(t);
    });
    if (mWorkImg) mWorkImg.src = shots[0].img;
  }

  buildRuler();
  buildTracks();
  buildBin();
  buildMobileWorks();
  setWorkByT(0.12);

  // timeline interactions
  if (tracksEl && playhead) {
    let dragging = false;

    const pxToT = (clientX) => {
      const r = tracksEl.getBoundingClientRect();
      return clamp((clientX - r.left) / r.width, 0, 1);
    };

    tracksEl.addEventListener('pointerdown', (e) => {
      const tl = document.getElementById('timeline');
      if (tl && getComputedStyle(tl).display === 'none') return; // mobile hidden
      dragging = true;
      tracksEl.setPointerCapture?.(e.pointerId);
      setWorkByT(pxToT(e.clientX));
    });

    tracksEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setWorkByT(pxToT(e.clientX));
    });

    window.addEventListener('pointerup', () => { dragging = false; }, { passive:true });

    tracksEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = (e.deltaY || e.deltaX) * 0.00035;
      setWorkByT(playT + delta);
    }, { passive:false });
  }

  // ------------------------------------------------------------------------------------------------
  // Mobile navigation helpers (buttons in index)
  // ------------------------------------------------------------------------------------------------
  document.querySelectorAll('[data-mgoto]').forEach((b) => {
    b.addEventListener('click', () => {
      const key = b.getAttribute('data-mgoto');
      const snap = document.getElementById('mSnap');
      const target = snap?.querySelector(`.mPanel[data-m="${key}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ------------------------------------------------------------------------------------------------
  // Desktop GSAP scroll serial (pinned)
  // ------------------------------------------------------------------------------------------------
  function sceneIndexFromProgress(p) {
    const idx = Math.round(p * (sceneOrder.length - 1));
    return clamp(idx, 0, sceneOrder.length - 1);
  }

  function applySceneVisual(idx, progress) {
    // Change background vibe + characters pose + decor intensity (controlled)
    // idx: 0..5
    const accents = ['--a2','--a1','--a3','--a4','--a5','--a2'];
    const acc = getComputedStyle(root).getPropertyValue(accents[idx]).trim();
    if (acc) root.style.setProperty('--accent', acc);

    // timecode
    if (topTC) topTC.textContent = formatTC(progress * 120);

    // activate scene blocks
    const key = sceneOrder[idx];
    setActiveScene(key);

    // pause reel if leaving
    pauseReelIfNeeded();

    // character “directing” — simple transforms
    const crew = document.getElementById('crew');
    if (crew) {
      const cam = crew.querySelector('.guy.cam');
      const mic = crew.querySelector('.guy.mic');
      const clap = crew.querySelector('.guy.clap');

      // base wiggle based on progress (not chaotic)
      const wob = Math.sin(progress * Math.PI * 2) * 6;

      if (cam) cam.style.transform = `translate(-50%,-50%) rotate(${(-8 + wob*0.4)}deg)`;
      if (mic) mic.style.transform = `translate(-50%,-50%) rotate(${(2 - wob*0.3)}deg)`;
      if (clap) clap.style.transform = `translate(-50%,-50%) rotate(${(8 + wob*0.2)}deg)`;

      // positions by scene (bigger moves)
      const pos = [
        { cam:[22,66], mic:[52,78], clap:[80,62] }, // intro
        { cam:[18,72], mic:[44,84], clap:[78,70] }, // reel
        { cam:[24,76], mic:[54,80], clap:[82,58] }, // services
        { cam:[16,62], mic:[50,74], clap:[84,66] }, // works
        { cam:[22,72], mic:[58,80], clap:[86,60] }, // price
        { cam:[18,78], mic:[52,82], clap:[84,72] }, // contact
      ][idx];

      if (cam) { cam.style.left = pos.cam[0] + '%'; cam.style.top = pos.cam[1] + '%'; }
      if (mic) { mic.style.left = pos.mic[0] + '%'; mic.style.top = pos.mic[1] + '%'; }
      if (clap){ clap.style.left= pos.clap[0]+ '%'; clap.style.top= pos.clap[1]+ '%'; }
    }

    // decor spray subtle breathing
    document.querySelectorAll('.spr').forEach((s, i) => {
      const amp = 10 + i * 2;
      const x = Math.sin(progress * 6 + i) * amp;
      const y = Math.cos(progress * 5 + i * 1.3) * (amp * 0.7);
      s.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
  }

  if (!isMobile && window.gsap && window.ScrollTrigger && pin && stage) {
    gsap.registerPlugin(ScrollTrigger);

    // Init
    setActiveScene('intro');

    // Pin timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;
          const idx = sceneIndexFromProgress(p);
          applySceneVisual(idx, p);

          // Lazy load reel when approaching reel scene
          if (p > 0.12 && !reelLoaded) ensureReelLoaded();
        }
      }
    });

    // Make scenes crossfade/slide (simple but cinematic, more comes from decor & characters)
    sceneOrder.forEach((key, i) => {
      const sc = scenes[key];
      if (!sc) return;

      const a = i / (sceneOrder.length - 1);
      const b = (i + 1) / (sceneOrder.length - 1);

      tl.fromTo(sc, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 20 }, {
        opacity: 1,
        y: 0,
        duration: 0.12
      }, a);

      if (i < sceneOrder.length - 1) {
        tl.to(sc, { opacity: 0, y: -16, duration: 0.12 }, b - 0.06);
      }
    });

  } else {
    // Mobile: pause desktop reel if exists
    pauseReelIfNeeded();
  }

})();
