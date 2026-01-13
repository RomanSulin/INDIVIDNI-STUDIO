/* ==========================================================================================================================
   INDIVIDNI STUDIO — THEATRE v2
   - Desktop: theatre navigation (wheel / keys / hud)
   - Mobile: falls back to natural scroll; dock scroll-to-scene
   - Cursor spotlight stays "light"
   - Showreel: lazy-load + pause offscreen + sound toggle
   - Services: hover only when canHover, else tap
   - Works: NLE timeline interaction
========================================================================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const stage = $('#stage');
  const scenes = $$('.scene', stage);
  if (!stage || !scenes.length) return;

  // Accent helpers
  const ACCENTS = {
    amber: '#f3c66b',
    cyan: '#77e6ff',
    lime: '#c8ff6a',
    magenta: '#ff59d6'
  };

  const canHover = window.matchMedia('(hover:hover)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Spotlight cursor
  const spotlight = $('#spotlight');
  let lastPointer = { x: window.innerWidth * .5, y: window.innerHeight * .35 };
  const setSpot = (x, y) => {
    lastPointer.x = x; lastPointer.y = y;
    document.documentElement.style.setProperty('--mx', `${x}px`);
    document.documentElement.style.setProperty('--my', `${y}px`);
  };

  if (spotlight && canHover) {
    window.addEventListener('mousemove', (e) => setSpot(e.clientX, e.clientY), { passive: true });
    setSpot(lastPointer.x, lastPointer.y);
  } else if (spotlight) {
    // on touch / small — keep centered
    setSpot(window.innerWidth * .5, window.innerHeight * .35);
  }

  // HUD
  const hudSceneName = $('#hudSceneName');
  const hudTimecode = $('#hudTimecode');
  const hudLinks = $$('.hud-link');
  const dockBtns = $$('.dock-btn');

  const setAccent = (name) => {
    const c = ACCENTS[name] || ACCENTS.amber;
    document.documentElement.style.setProperty('--accent', c);
  };

  const formatTC = (sec) => {
    const fps = 25;
    const totalFrames = Math.max(0, Math.floor(sec * fps));
    const s = Math.floor(totalFrames / fps);
    const f = totalFrames % fps;
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const ff = String(f).padStart(2, '0');
    return `00:${mm}:${ss}:${ff}`;
  };

  let active = 0;
  let animLock = false;

  const setActiveUI = () => {
    hudLinks.forEach((b, i) => b.classList.toggle('is-active', i === active));
    dockBtns.forEach((b, i) => b.classList.toggle('is-active', Number(b.dataset.go) === active));
  };

  const setSceneHUD = () => {
    const name = scenes[active]?.dataset.scene || '';
    if (hudSceneName) hudSceneName.textContent = name;
    if (hudTimecode) hudTimecode.textContent = formatTC(active * 12.0);
    const accentName = scenes[active]?.dataset.accent || 'amber';
    setAccent(accentName);
  };

  const goTo = async (idx, dir = 1) => {
    idx = Math.max(0, Math.min(scenes.length - 1, idx));
    if (idx === active) return;

    if (animLock) return;
    animLock = true;

    const from = scenes[active];
    const to = scenes[idx];

    // Prepare target
    to.classList.add('is-active');
    to.style.opacity = '0';
    to.style.transform = `translateY(${dir > 0 ? 22 : -22}px) scale(.99)`;

    // Try clip-path wipe (best effort)
    const x = lastPointer.x;
    const y = lastPointer.y;
    const supportsClip = CSS.supports('clip-path', 'circle(20% at 50% 50%)');

    const outAnim = prefersReduced ? null : from.animate([
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      { opacity: 0, transform: `translateY(${dir > 0 ? -16 : 16}px) scale(1.01)`, filter: 'blur(6px)' }
    ], { duration: 380, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });

    if (!prefersReduced && supportsClip) {
      to.style.clipPath = `circle(0% at ${x}px ${y}px)`;
      to.animate([
        { clipPath: `circle(0% at ${x}px ${y}px)`, opacity: 0, transform: `translateY(${dir > 0 ? 22 : -22}px) scale(.99)` },
        { clipPath: `circle(160% at ${x}px ${y}px)`, opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
    } else {
      to.animate([
        { opacity: 0, transform: `translateY(${dir > 0 ? 22 : -22}px) scale(.99)` },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
    }

    await new Promise((res) => setTimeout(res, prefersReduced ? 0 : 420));

    // Cleanup
    from.classList.remove('is-active');
    from.style.opacity = '';
    from.style.transform = '';
    from.style.filter = '';
    if (supportsClip) to.style.clipPath = '';

    active = idx;
    setActiveUI();
    setSceneHUD();
    animLock = false;
  };

  // Navigation handlers
  const bindGoButtons = (root) => {
    $$('[data-go]', root).forEach((el) => {
      el.addEventListener('click', (e) => {
        // Prevent hash-jump in theatre mode
        if (el.tagName === 'A') e.preventDefault();
        const v = Number(el.dataset.go);
        if (Number.isFinite(v)) goTo(v, v > active ? 1 : -1);
      });
    });
  };
  bindGoButtons(document);

  hudLinks.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go), Number(b.dataset.go) > active ? 1 : -1)));
  dockBtns.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go), Number(b.dataset.go) > active ? 1 : -1)));

  // Wheel / keys only on theatre mode
  const wheelHandler = (e) => {
    if (window.matchMedia('(max-width: 980px)').matches) return;
    e.preventDefault();
    if (animLock) return;
    const d = e.deltaY;
    if (Math.abs(d) < 10) return;
    goTo(active + (d > 0 ? 1 : -1), d > 0 ? 1 : -1);
  };

  window.addEventListener('wheel', wheelHandler, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (window.matchMedia('(max-width: 980px)').matches) return;
    if (animLock) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(active + 1, 1); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(active - 1, -1); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0, -1); }
    if (e.key === 'End') { e.preventDefault(); goTo(scenes.length - 1, 1); }
  });

  // Touch swipe for theatre (works on mobile too, but respects inner scroll)
  let touchStartY = 0;
  let touchStartX = 0;

  window.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    setSpot(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const t = e.touches?.[0];
    if (t) setSpot(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (animLock) return;
    const t = e.changedTouches?.[0];
    if (!t) return;

    const dy = t.clientY - touchStartY;
    const dx = t.clientX - touchStartX;

    // If user is scrolling inside the current scene, don't steal the gesture
    const cur = scenes[active];
    const canScroll = cur && cur.scrollHeight > cur.clientHeight + 2;
    const atTop = !cur || cur.scrollTop <= 2;
    const atBottom = !cur || (cur.scrollTop + cur.clientHeight >= cur.scrollHeight - 2);

    // Only trigger scene switch when gesture is clearly vertical
    if (Math.abs(dy) > 52 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      // swipe up = next (only if at bottom, or no scroll)
      if (dy < 0 && (!canScroll || atBottom)) goTo(active + 1, 1);
      // swipe down = prev (only if at top, or no scroll)
      if (dy > 0 && (!canScroll || atTop)) goTo(active - 1, -1);
    }
  }, { passive: true });

    }
  }, { passive: true });

  // Init HUD state
  setSceneHUD();
  setActiveUI();

  // ================================================================================================================
  // Showreel: lazy load + pause offscreen + sound
  // ================================================================================================================
  const video = $('#showreelVideo');
  const srPlay = $('#srPlay');
  const srToggle = $('#srToggle');
  const srBack = $('#srBack');
  const srFwd = $('#srFwd');
  const srSoundBtn = $('#srSoundBtn');
  const hudSound = $('#hudSound');
  const srTC = $('#srTC');
  const srFill = $('#srMeterFill');

  let soundOn = false;

  const ensureVideoLoaded = () => {
    if (!video) return;
    const source = video.querySelector('source[data-src]');
    if (source && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
  };

  const setSoundUI = () => {
    const label = soundOn ? 'SOUND: ON' : 'SOUND: OFF';
    if (srSoundBtn) srSoundBtn.textContent = label;
    if (hudSound) hudSound.classList.toggle('is-on', soundOn);
  };

  const setSound = async (on) => {
    soundOn = !!on;
    if (!video) { setSoundUI(); return; }

    ensureVideoLoaded();

    // Autoplay policies: keep muted until user click
    if (soundOn) {
      video.muted = false;
      try { await video.play(); } catch (_) {}
    } else {
      video.muted = true;
    }
    setSoundUI();
  };

  const togglePlay = async () => {
    if (!video) return;
    ensureVideoLoaded();
    if (video.paused) {
      try { await video.play(); } catch (_) {}
      if (srToggle) srToggle.textContent = '▌▌';
    } else {
      video.pause();
      if (srToggle) srToggle.textContent = '▶';
    }
  };

  if (srPlay) {
    srPlay.addEventListener('click', async () => {
      // one click theatre: enable sound and play
      await setSound(true);
      await togglePlay();
    });
  }
  if (srToggle) srToggle.addEventListener('click', togglePlay);

  if (srBack) srBack.addEventListener('click', () => { if (video) video.currentTime = Math.max(0, video.currentTime - 3); });
  if (srFwd) srFwd.addEventListener('click', () => { if (video && Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, video.currentTime + 3); });

  const soundClick = async () => { await setSound(!soundOn); };
  if (srSoundBtn) srSoundBtn.addEventListener('click', soundClick);
  if (hudSound) hudSound.addEventListener('click', soundClick);

  // progress meter + TC
  if (video) {
    video.addEventListener('timeupdate', () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      const p = (video.currentTime / video.duration) * 100;
      if (srFill) srFill.style.width = `${p.toFixed(2)}%`;
      if (srTC) {
        const s = Math.floor(video.currentTime);
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        srTC.textContent = `${mm}:${ss}`;
      }
    });
  }

  // Lazy load via IntersectionObserver + pause offscreen
  if (video && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          ensureVideoLoaded();
        } else {
          // pause when offscreen
          if (!video.paused) video.pause();
        }
      });
    }, { threshold: 0.18 });
    io.observe(video);
  }

  // ================================================================================================================
  // Services interaction: hover only on hover devices
  // ================================================================================================================
  const svcBoard = $('[data-svc-board]');
  if (svcBoard) {
    const svcItems = $$('.svc-item', svcBoard);
    const title = $('#svcTitle');
    const lead = $('#svcLead');
    const points = $('#svcPoints');

    const setSvc = (idx, fromHover = false) => {
      if (!svcItems[idx]) return;
      svcItems.forEach((b, i) => b.classList.toggle('is-active', i === idx));
      const d = svcItems[idx].dataset;
      if (title) title.textContent = d.title || '';
      if (lead) lead.textContent = d.lead || '';
      if (points) {
        const arr = String(d.points || '').split('|').map(s => s.trim()).filter(Boolean);
        points.innerHTML = '';
        arr.forEach((t) => {
          const li = document.createElement('li');
          li.textContent = t;
          points.appendChild(li);
        });
      }
    };

    svcItems.forEach((b, i) => {
      b.addEventListener('click', () => setSvc(i, false));
      if (canHover) {
        b.addEventListener('mouseenter', () => setSvc(i, true));
        b.addEventListener('focus', () => setSvc(i, true));
      }
    });
    setSvc(0);
  }

  // ================================================================================================================
  // Works: NLE timeline (desktop) + media pool (mobile)
  // ================================================================================================================
  const timeline = $('#timeline');
  const tracks = $('#tracks');
  const ruler = $('#ruler');
  const playhead = $('#playhead');
  const nleScreen = $('#nleScreen');
  const nleTitle = $('#nleTitle');
  const nleTC = $('#nleTC');
  const bin = $('#bin');

  const clips = [
    { name: 'Event / Highlight', start: 0, dur: 10, img: 'https://picsum.photos/seed/indiv-1/1280/720' },
    { name: 'Course / Episode', start: 10.5, dur: 12, img: 'https://picsum.photos/seed/indiv-2/1280/720' },
    { name: 'Podcast / Talk', start: 23.2, dur: 9, img: 'https://picsum.photos/seed/indiv-3/1280/720' },
    { name: 'Brand / Promo', start: 33.0, dur: 11, img: 'https://picsum.photos/seed/indiv-4/1280/720' },
    { name: 'Music / Clip', start: 45.0, dur: 12, img: 'https://picsum.photos/seed/indiv-5/1280/720' }
  ];

  const pxPerSec = 48; // timeline scale

  const buildRuler = () => {
    if (!ruler) return;
    ruler.innerHTML = '';
    const total = Math.ceil((clips[clips.length - 1].start + clips[clips.length - 1].dur) + 2);
    for (let s = 0; s <= total; s += 5) {
      const x = s * pxPerSec;
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${x}px`;
      ruler.appendChild(tick);

      const label = document.createElement('div');
      label.className = 'label';
      label.style.left = `${x}px`;
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      label.textContent = `${mm}:${ss}`;
      ruler.appendChild(label);
    }
  };

  const buildTracks = () => {
    if (!tracks) return;
    tracks.innerHTML = '';
    const track = document.createElement('div');
    track.className = 'track';
    track.style.width = `${Math.max(900, (clips[clips.length - 1].start + clips[clips.length - 1].dur + 2) * pxPerSec)}px`;

    clips.forEach((c, idx) => {
      const el = document.createElement('div');
      el.className = 'clip' + (idx === 0 ? ' is-active' : '');
      el.style.left = `${c.start * pxPerSec}px`;
      el.style.width = `${c.dur * pxPerSec}px`;
      el.textContent = c.name.toUpperCase();
      el.dataset.idx = String(idx);
      el.addEventListener('click', () => selectClip(idx, c.start));
      track.appendChild(el);
    });

    tracks.appendChild(track);

    // Wheel horizontal scroll
    tracks.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        tracks.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  };

  const tcFromSec = (sec) => {
    const s = Math.max(0, sec);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    const ff = String(Math.floor((s - Math.floor(s)) * 25)).padStart(2, '0');
    return `00:${mm}:${ss}:${ff}`;
  };

  const setPlayhead = (sec) => {
    if (!playhead || !tracks) return;
    const x = sec * pxPerSec;
    playhead.style.transform = `translateX(${x}px)`;
    if (nleTC) nleTC.textContent = tcFromSec(sec);
  };

  const selectClip = (idx, sec) => {
    if (nleTitle) nleTitle.textContent = clips[idx]?.name || 'Work';
    if (nleScreen && clips[idx]?.img) nleScreen.style.backgroundImage = `url('${clips[idx].img}')`;
    $$('.clip', tracks).forEach((c, i) => c.classList.toggle('is-active', i === idx));
    setPlayhead(sec);
    // keep in view
    if (tracks) {
      const x = sec * pxPerSec;
      const pad = 120;
      if (x < tracks.scrollLeft + pad) tracks.scrollLeft = Math.max(0, x - pad);
      if (x > tracks.scrollLeft + tracks.clientWidth - pad) tracks.scrollLeft = x - tracks.clientWidth + pad;
    }
  };

  // Drag playhead
  if (tracks && playhead) {
    let dragging = false;

    const secFromX = (clientX) => {
      const r = tracks.getBoundingClientRect();
      const x = (clientX - r.left) + tracks.scrollLeft;
      return Math.max(0, x / pxPerSec);
    };

    const down = (e) => { dragging = true; try { tracks.setPointerCapture(e.pointerId); } catch(_){}; setPlayhead(secFromX(e.clientX)); };
    const move = (e) => { if (!dragging) return; setPlayhead(secFromX(e.clientX)); };
    const up = () => { dragging = false; };

    tracks.addEventListener('pointerdown', (e) => {
      // allow dragging anywhere in timeline area
      if (e.button !== undefined && e.button !== 0) return;
      down(e);
    });
    tracks.addEventListener('pointermove', move);
    tracks.addEventListener('pointerup', up);
    tracks.addEventListener('pointercancel', up);
  }

  // Mobile media pool
  const buildBin = () => {
    if (!bin) return;
    bin.innerHTML = '';
    clips.forEach((c, idx) => {
      const item = document.createElement('div');
      item.className = 'bin-item';
      item.addEventListener('click', () => selectClip(idx, c.start));

      const thumb = document.createElement('div');
      thumb.className = 'bin-thumb';
      thumb.style.backgroundImage = `url('${c.img.replace('/1280/720','/640/360')}')`;

      const cap = document.createElement('div');
      cap.className = 'bin-cap';
      cap.textContent = c.name;

      item.appendChild(thumb);
      item.appendChild(cap);
      bin.appendChild(item);
    });
  };

  // Build NLE only once DOM is ready
  buildRuler();
  buildTracks();
  buildBin();
  selectClip(0, 0);

  // Update active scene on resize (switch theatre <-> scroll)
  window.addEventListener('resize', () => {
    // keep spotlight centered if no hover
    if (!canHover) setSpot(window.innerWidth * .5, window.innerHeight * .35);
  }, { passive: true });
})();
