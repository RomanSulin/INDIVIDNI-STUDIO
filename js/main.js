/* INDIVIDNI STUDIO — Rebuild v1 (Night Edit Suite)
   - Cursor light beam (desktop)
   - HUD (title + tc)
   - Scrubber (drag to scroll) + marks
   - Logo reveal scan on pointer
   - Showreel: lazy-load + pause offscreen + sound toggle + timecode
   - Services: switchboard (hover only on canHover, click locks on mobile)
   - Works: NLE timeline (desktop) + bin (mobile)
*/
(() => {
  const root = document.documentElement;
  const body = document.body;

  // touch detect
  const isTouch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
  body.dataset.touch = isTouch ? 'true' : 'false';

  // year
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------------------------------
     Cursor beam
  --------------------------------- */
  const beam = document.getElementById('beam');
  if (beam && !isTouch) {
    const onMove = (e) => {
      const x = (e.clientX / innerWidth) * 100;
      const y = (e.clientY / innerHeight) * 100;
      beam.style.setProperty('--mx', `${x.toFixed(2)}%`);
      beam.style.setProperty('--my', `${y.toFixed(2)}%`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  /* ---------------------------------
     Scene observer (accent + HUD title)
  --------------------------------- */
  const hudTitle = document.getElementById('hudTitle');
  const hudTC = document.getElementById('hudTC');
  const sections = Array.from(document.querySelectorAll('.chapter[data-title]'));

  const setAccent = (accentName) => {
    // map name -> rgb
    const map = {
      amber: '255 197 72',
      cyan: '102 255 198',
      lime: '168 255 108',
      violet: '184 132 255',
      magenta: '255 118 214',
    };
    const v = map[accentName] || map.amber;
    root.style.setProperty('--accent', v);
  };

  // timecode helper
  const tc = (seconds, fps = 24) => {
    const s = Math.max(0, seconds);
    const totalFrames = Math.floor(s * fps);
    const ff = totalFrames % fps;
    const totalSeconds = Math.floor(totalFrames / fps);
    const ss = totalSeconds % 60;
    const mm = Math.floor(totalSeconds / 60) % 60;
    const hh = Math.floor(totalSeconds / 3600);
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  };

  const updateHudTC = () => {
    const progress = window.scrollY / Math.max(1, (document.documentElement.scrollHeight - innerHeight));
    const pseudoTime = progress * 180; // 3 minutes "sequence"
    if (hudTC) hudTC.textContent = tc(pseudoTime);
  };
  window.addEventListener('scroll', updateHudTC, { passive: true });
  updateHudTC();

  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => (b.intersectionRatio - a.intersectionRatio))[0];
    if (!visible) return;

    const el = visible.target;
    if (hudTitle) hudTitle.textContent = el.dataset.title || '—';
    setAccent(el.dataset.accent || 'amber');
  }, { threshold: [0.35, 0.55, 0.75] });

  sections.forEach((s) => io.observe(s));

  /* ---------------------------------
     Burger / Drawer
  --------------------------------- */
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const drawerClose = document.getElementById('drawerClose');

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  };
  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  };

  if (burger) burger.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawer) drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a');
    if (a && drawer?.classList.contains('is-open')) closeDrawer();
  });

  /* ---------------------------------
     Scrubber (drag scroll) + marks
  --------------------------------- */
  const scrubTrack = document.getElementById('scrubTrack');
  const scrubHead = document.getElementById('scrubHead');
  const scrubMarks = document.getElementById('scrubMarks');

  const setScrubHead = (progress) => {
    if (!scrubHead || !scrubTrack) return;

    const r = scrubTrack.getBoundingClientRect();
    if (r.height > r.width) {
      // vertical
      const y = progress * r.height;
      scrubHead.style.top = `${y}px`;
      scrubHead.style.left = '50%';
    } else {
      // horizontal (mobile)
      const x = progress * r.width;
      scrubHead.style.left = `${x}px`;
      scrubHead.style.top = '50%';
    }
  };

  const getScrollProgress = () =>
    window.scrollY / Math.max(1, (document.documentElement.scrollHeight - innerHeight));

  const scrollToProgress = (p) => {
    const prog = Math.min(1, Math.max(0, p));
    const max = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo({ top: prog * max, behavior: 'auto' });
  };

  const updateScrub = () => setScrubHead(getScrollProgress());
  window.addEventListener('scroll', updateScrub, { passive: true });
  updateScrub();

  if (scrubMarks) {
    scrubMarks.innerHTML = '';
    const labels = sections.map((s) => (s.id || '').toUpperCase());
    labels.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'm';
      d.textContent = t || `S${i+1}`;
      scrubMarks.appendChild(d);
    });
  }

  if (scrubTrack) {
    let dragging = false;

    const posToProgress = (clientX, clientY) => {
      const r = scrubTrack.getBoundingClientRect();
      if (r.height > r.width) {
        const y = (clientY - r.top) / r.height;
        return y;
      } else {
        const x = (clientX - r.left) / r.width;
        return x;
      }
    };

    const onDown = (e) => {
      dragging = true;
      scrubTrack.setPointerCapture?.(e.pointerId);
      const p = posToProgress(e.clientX, e.clientY);
      scrollToProgress(p);
      setScrubHead(p);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = posToProgress(e.clientX, e.clientY);
      scrollToProgress(p);
      setScrubHead(p);
    };
    const onUp = () => { dragging = false; };

    scrubTrack.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
  }

  /* ---------------------------------
     Hero logo reveal (pointer spotlight)
  --------------------------------- */
  const heroLogo = document.getElementById('heroLogo');
  if (heroLogo && !isTouch) {
    const setPos = (e) => {
      const r = heroLogo.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      heroLogo.style.setProperty('--lx', `${x.toFixed(2)}%`);
      heroLogo.style.setProperty('--ly', `${y.toFixed(2)}%`);
    };
    heroLogo.addEventListener('pointerenter', () => heroLogo.classList.add('is-hot'));
    heroLogo.addEventListener('pointerleave', () => heroLogo.classList.remove('is-hot'));
    heroLogo.addEventListener('pointermove', setPos, { passive: true });
  }

  // clapper micro hit
  const clap = document.getElementById('clapButton');
  if (clap) {
    clap.addEventListener('click', () => {
      clap.classList.remove('is-hit');
      // restart animation
      void clap.offsetWidth;
      clap.classList.add('is-hit');
    });
  }

  /* ---------------------------------
     Showreel video: lazy + pause offscreen + sound + timecode
  --------------------------------- */
  const video = document.getElementById('showreelVideo');
  const soundBtn = document.getElementById('soundBtn');
  const showreelTC = document.getElementById('showreelTC');

  const ensureVideoLoaded = () => {
    if (!video) return;
    const source = video.querySelector('source[data-src]');
    if (source && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
  };

  if (video) {
    // update showreel timecode
    const tick = () => {
      if (!video || !showreelTC) return;
      showreelTC.textContent = tc(video.currentTime);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const vObs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;

      if (e.isIntersecting) {
        ensureVideoLoaded();
        video.play().catch(() => {});
      } else {
        video.pause();
        // when offscreen — if sound was on, we keep state but video is paused
      }
    }, { threshold: 0.35 });

    vObs.observe(video);

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        ensureVideoLoaded();

        const willEnable = video.muted;
        video.muted = !willEnable;

        // if enabling sound, also set volume gently
        if (!video.muted) video.volume = 0.9;

        soundBtn.setAttribute('aria-pressed', String(!video.muted));
      });
    }
  }

  /* ---------------------------------
     Services switchboard
  --------------------------------- */
  const svc = document.querySelector('[data-svc]');
  if (svc) {
    const canHover = matchMedia('(hover: hover)').matches;
    const items = Array.from(svc.querySelectorAll('.svc-item'));
    const out = {
      code: svc.querySelector('[data-svc-code]'),
      title: svc.querySelector('[data-svc-title]'),
      lead: svc.querySelector('[data-svc-lead]'),
      doList: svc.querySelector('[data-svc-do]'),
      getList: svc.querySelector('[data-svc-get]'),
      pipe: svc.querySelector('[data-svc-pipe]'),
    };

    const split = (s) => String(s || '').split('|').map(x => x.trim()).filter(Boolean);
    const fill = (ul, arr) => {
      if (!ul) return;
      ul.innerHTML = '';
      arr.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
      });
    };

    const setPipe = (stepsStr) => {
      if (!out.pipe) return;
      out.pipe.innerHTML = '';
      const steps = String(stepsStr || '').split(',').map(s => s.trim()).filter(Boolean);
      steps.forEach(s => {
        const el = document.createElement('span');
        el.textContent = s;
        out.pipe.appendChild(el);
      });
    };

    let current = Math.max(0, items.findIndex(i => i.classList.contains('is-active')));
    let locked = false;

    const apply = (idx, fromHover=false) => {
      if (fromHover && locked) return;
      idx = Math.max(0, Math.min(items.length - 1, idx));
      current = idx;

      items.forEach((b, i) => b.classList.toggle('is-active', i === idx));

      const d = items[idx].dataset;
      if (out.code) out.code.textContent = d.code || '';
      if (out.title) out.title.textContent = d.title || '';
      if (out.lead) out.lead.textContent = d.lead || '';
      fill(out.doList, split(d.do));
      fill(out.getList, split(d.get));
      setPipe(d.steps);
    };

    items.forEach((b, i) => {
      b.addEventListener('click', () => {
        if (current === i) locked = !locked;
        else locked = true;
        apply(i, false);
      });

      if (canHover) {
        b.addEventListener('mouseenter', () => apply(i, true));
        b.addEventListener('focus', () => apply(i, true));
      }
    });

    apply(current);
  }

  /* ---------------------------------
     Works NLE timeline
  --------------------------------- */
  const nle = document.querySelector('[data-nle]');
  if (nle) {
    const preview = document.getElementById('nlePreview');
    const seq = document.getElementById('nleSeq');
    const nleTC = document.getElementById('nleTC');
    const tracksEl = document.getElementById('nleTracks');
    const timelineEl = document.getElementById('nleTimeline');
    const playheadEl = document.getElementById('nlePlayhead');
    const bin = document.getElementById('nleBin');

    // timeline model: in "seconds" within 60 sec sequence
    const fps = 25;
    const seqLen = 60;
    const pxPerSec = 36; // controls zoom feel
    const padLeft = 120; // room for labels / safe

    const clips = [
      { name:'EVENT_01', start: 3,  dur: 12, track: 0, img:'https://picsum.photos/seed/individni_01/1280/720' },
      { name:'COURSE_02', start: 18, dur: 18, track: 0, img:'https://picsum.photos/seed/individni_02/1280/720' },
      { name:'LIVE_03',  start: 10, dur: 10, track: 1, img:'https://picsum.photos/seed/individni_03/1280/720' },
      { name:'AD_04',    start: 32, dur: 15, track: 1, img:'https://picsum.photos/seed/individni_04/1280/720' },
    ];

    let t = 0;

    const renderTimeline = () => {
      if (!tracksEl) return;
      tracksEl.innerHTML = '';
      const trackNames = ['V1', 'V2', 'A1'];

      const totalW = padLeft + seqLen * pxPerSec + 180;

      trackNames.forEach((label, idx) => {
        const track = document.createElement('div');
        track.className = 'track';
        track.style.width = `${totalW}px`;

        const tl = document.createElement('div');
        tl.className = 'track-label';
        tl.textContent = label;
        track.appendChild(tl);

        tracksEl.appendChild(track);
      });

      // place clips
      const trackEls = Array.from(tracksEl.querySelectorAll('.track'));

      clips.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'clip';
        el.textContent = c.name;
        el.style.left = `${padLeft + c.start * pxPerSec}px`;
        el.style.width = `${Math.max(60, c.dur * pxPerSec)}px`;

        el.addEventListener('click', () => {
          setTime(c.start);
          setActiveClip(i);
          if (seq) seq.textContent = c.name;
          if (preview) preview.src = c.img;
        });

        trackEls[c.track]?.appendChild(el);
      });

      // ruler ticks (simple)
      const ruler = document.getElementById('nleRuler');
      if (ruler) {
        ruler.style.width = `${totalW}px`;
        ruler.style.backgroundSize = `${pxPerSec * 5}px 100%`; // 5 sec spacing visual
      }

      // sync scroll with ruler/playhead
      if (timelineEl) {
        const scrollable = tracksEl;
        scrollable.addEventListener('scroll', () => {
          // keep playhead position visually aligned; it's absolute in container so ok
        }, { passive: true });

        // wheel -> horizontal scroll
        scrollable.addEventListener('wheel', (e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            scrollable.scrollLeft += e.deltaY;
          }
        }, { passive: false });
      }
    };

    const setActiveClip = (idx) => {
      const els = Array.from(nle.querySelectorAll('.clip'));
      els.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      if (bin) {
        const bins = Array.from(bin.querySelectorAll('.bin-item'));
        bins.forEach((b) => b.classList.remove('is-active'));
        const b = bin.querySelector(`.bin-item[data-clip="${idx}"]`);
        if (b) b.classList.add('is-active');
      }
    };

    const setTime = (sec) => {
      t = Math.max(0, Math.min(seqLen, sec));
      if (nleTC) nleTC.textContent = tc(t, fps);
      if (playheadEl && tracksEl) {
        const x = padLeft + t * pxPerSec;
        // playhead is positioned relative to timeline container (not scroll content), so subtract scrollLeft
        const scrollLeft = tracksEl.scrollLeft || 0;
        playheadEl.style.left = `${x - scrollLeft}px`;
      }
    };

    // drag playhead
    const bindPlayheadDrag = () => {
      if (!timelineEl || !tracksEl) return;
      let dragging = false;

      const pointToTime = (clientX) => {
        const r = timelineEl.getBoundingClientRect();
        const x = clientX - r.left;
        const scrollLeft = tracksEl.scrollLeft || 0;
        const worldX = x + scrollLeft;
        const sec = (worldX - padLeft) / pxPerSec;
        return sec;
      };

      const onDown = (e) => {
        dragging = true;
        timelineEl.setPointerCapture?.(e.pointerId);
        setTime(pointToTime(e.clientX));
      };
      const onMove = (e) => {
        if (!dragging) return;
        setTime(pointToTime(e.clientX));
      };
      const onUp = () => { dragging = false; };

      timelineEl.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onUp, { passive: true });
    };

    // mobile bin
    if (bin) {
      const buttons = Array.from(bin.querySelectorAll('.bin-item'));
      buttons.forEach((b) => {
        b.addEventListener('click', () => {
          const idx = Number(b.dataset.clip || '0');
          const clip = clips[idx];
          if (!clip) return;
          setActiveClip(idx);
          if (seq) seq.textContent = clip.name;
          if (preview) preview.src = clip.img;
          setTime(clip.start);
        });
      });
    }

    renderTimeline();
    bindPlayheadDrag();
    setActiveClip(0);
    setTime(clips[0].start);
    if (seq) seq.textContent = clips[0].name;
    if (preview) preview.src = clips[0].img;
  }

  /* ---------------------------------
     Smooth anchor scroll (keeps it neat)
  --------------------------------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
