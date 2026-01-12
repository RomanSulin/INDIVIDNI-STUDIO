document.documentElement.classList.add('js');

/* =========================
   Header height var + scroll bg
========================= */
const header = document.getElementById('header');

function setHeaderHeightVar() {
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
}
setHeaderHeightVar();
window.addEventListener('resize', setHeaderHeightVar, { passive: true });

function onHeaderScroll() {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 24);
}
onHeaderScroll();
window.addEventListener('scroll', onHeaderScroll, { passive: true });

/* =========================
   Mobile menu
========================= */
const navToggle = document.querySelector('.nav-toggle');
const navList = document.getElementById('nav-list');

if (header && navToggle && navList) {
  const closeMenu = () => {
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.contains('nav-open');
    header.classList.toggle('nav-open', !isOpen);
    navToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  navList.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!header.classList.contains('nav-open')) return;
    if (!header.contains(e.target)) closeMenu();
  });
}

/* =========================
   Reveal sections
========================= */
const revealItems = document.querySelectorAll('.reveal');

if (revealItems.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealItems.forEach((el) => io.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('is-visible'));
}

/* =========================
   Footer year
========================= */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* =========================
   Ambient glow everywhere (smooth follow)
========================= */
(() => {
  let mx = window.innerWidth * 0.5;
  let my = window.innerHeight * 0.45;
  let tx = mx, ty = my;
  let raf = 0;

  const lerp = (a, b, t) => a + (b - a) * t;

  const tick = () => {
    mx = lerp(mx, tx, 0.14);
    my = lerp(my, ty, 0.14);
    document.documentElement.style.setProperty('--mx', `${mx.toFixed(1)}px`);
    document.documentElement.style.setProperty('--my', `${my.toFixed(1)}px`);
    const moving = (Math.abs(mx - tx) + Math.abs(my - ty)) > 0.6;
    raf = moving ? requestAnimationFrame(tick) : 0;
  };

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();

/* ===============================================================================================================================================================================
   Custom cursor beam (only mouse devices)
========================= */
const cursor = document.getElementById('custom-cursor');
const canUseCustomCursor =
  cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canUseCustomCursor) {
  document.body.classList.add('cursor-on');

  let prevX = null, prevY = null;

  // smooth position
  let cx = 0, cy = 0;
  let tx = 0, ty = 0;

  // smooth angle with shortest path
  let currentAngle = 0;
  let targetAngle = 0;

  const normalize180 = (a) => (((a + 180) % 360 + 360) % 360) - 180;
  const shortestDelta = (from, to) => normalize180(to - from);
  let raf = 0;
  const tick = () => {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.top = cy + 'px';
    cursor.style.left = cx + 'px';

    const d = shortestDelta(currentAngle, targetAngle);
    currentAngle = normalize180(currentAngle + d * 0.12);
    cursor.style.setProperty('--angle', currentAngle + 'deg');

    const moving = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.35) || (Math.abs(d) > 0.25);
    raf = moving ? requestAnimationFrame(tick) : 0;
  };

  document.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
     if (!raf) raf = requestAnimationFrame(tick);

    if (prevX !== null && prevY !== null) {
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      }
    }
    prevX = e.clientX;
    prevY = e.clientY;
  }, { passive: true });

  // boost on hover interactives
  document.querySelectorAll('a, button, .btn').forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovered'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovered'));
  });
}
/* =========================
   Showreel lazy load (load only when section is near)
========================= */
(() => {
  const section = document.getElementById('showreel');
  const video = document.getElementById('showreelVideo');
  const btn = document.getElementById('soundToggle');
  if (!section || !video) return;

  const srcEl = video.querySelector('source[data-src]');
  if (!srcEl) return;

  if (btn) btn.disabled = true;

  const load = () => {
    if (video.dataset.loaded === '1') return;
    const src = srcEl.dataset.src;
    if (!src) return;

    srcEl.src = src;
    video.load();
    video.dataset.loaded = '1';

    // включаем кнопку, когда видео реально готово
    const enable = () => { if (btn) btn.disabled = false; };
    video.addEventListener('loadeddata', enable, { once: true });

    // autoplay muted обычно разрешён
    video.play().catch(() => {});
  };

  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      load();
      io.disconnect();
    }
  }, { threshold: 0.12, rootMargin: '300px 0px 300px 0px' });

  io.observe(section);
})();

/* ===============================================================================================================================================================================
   Showreel sound toggle
========================= */
const v = document.getElementById('showreelVideo');
const soundBtn = document.getElementById('soundToggle');

if (v && soundBtn) {
  const textEl = soundBtn.querySelector('.sound-blob__text');

  const setUI = (isOn) => {
    soundBtn.classList.toggle('is-on', isOn);
    soundBtn.classList.toggle('is-off', !isOn);
    soundBtn.setAttribute('aria-pressed', String(isOn));
    if (textEl) textEl.textContent = isOn ? 'Выкл звук' : 'Вкл звук';

    soundBtn.classList.remove('jelly');
    void soundBtn.offsetWidth;
    soundBtn.classList.add('jelly');
  };

  setUI(!v.muted);

  soundBtn.addEventListener('click', async () => {
    if (soundBtn.disabled) return;
    const turningOn = v.muted;
    v.muted = !turningOn;

    if (turningOn) {
      try { await v.play(); } catch (e) {}
    }
    setUI(turningOn);
  });
}

/* ======================================================================================================================================================================================================================================================================================================================================
   HERO: hover reveal (ТОЛЬКО логотип)
========================== */
(() => {
  const stage = document.getElementById('heroStage');
  const logo  = document.getElementById('heroLogo');
  if (!stage || !logo) return;

  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let hoverActive = false;
  let tx = 50, ty = 50;
  let cx = 50, cy = 50;
  let rAF = 0;

  const tick = () => {
    cx = lerp(cx, tx, 0.18);
    cy = lerp(cy, ty, 0.18);
    stage.style.setProperty('--reveal-x', `${cx.toFixed(2)}%`);
    stage.style.setProperty('--reveal-y', `${cy.toFixed(2)}%`);
if (!hoverActive) { rAF = 0; return; }
const moving = (Math.abs(cx - tx) + Math.abs(cy - ty)) > 0.06;
rAF = moving ? requestAnimationFrame(tick) : 0;
  };

  const insideLogo = (x, y) => {
    const r = logo.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const setTargetFromPoint = (x, y) => {
    const r = logo.getBoundingClientRect();
    const px = ((x - r.left) / r.width) * 100;
    const py = ((y - r.top) / r.height) * 100;
    tx = clamp(px, 0, 100);
    ty = clamp(py, 0, 100);
  };
   
  // стартовое значение (чтобы было красиво сразу)
  stage.style.setProperty('--reveal-x', `50%`);
  stage.style.setProperty('--reveal-y', `50%`);
   
window.addEventListener('pointermove', (e) => {
  const inside = insideLogo(e.clientX, e.clientY);

  if (inside && !hoverActive) {
    hoverActive = true;
    stage.classList.add('is-hover');
    document.body.classList.add('glow-boost');
    if (!rAF) rAF = requestAnimationFrame(tick);
  }

  if (!inside && hoverActive) {
    hoverActive = false;
    stage.classList.remove('is-hover');
    document.body.classList.remove('glow-boost');
    if (rAF) { cancelAnimationFrame(rAF); rAF = 0; }
  }

  if (hoverActive) {
    setTargetFromPoint(e.clientX, e.clientY);
    if (!rAF) rAF = requestAnimationFrame(tick);
  }
}, { passive: true });

})();

/* ======================================================================================================================================================================================================================================================================================================================================
   CLAPPER: открывается, когда доскроллил
========================== */
(() => {
  const clap = document.getElementById('clapButton');
  const rig  = document.querySelector('.between-rig');
  if (!clap || !rig) return;

  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const setAngle = (deg) => clap.style.setProperty('--clapAngle', `${deg.toFixed(2)}deg`);

  // всегда закрыта при загрузке
  setAngle(0);

  let pinned = false;
  let armed = false;

  // активируем только когда блок виден
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        armed = true;
        io.disconnect();
        update();
      }
    }, { threshold: 0.2 });
    io.observe(rig);
  } else {
    armed = true;
  }

  const update = () => {
    if (!armed || pinned) return;
    if (window.scrollY < 40) { setAngle(0); return; }

    const r = rig.getBoundingClientRect();
    const vh = window.innerHeight;

    const start = vh * 0.92;
    const end   = vh * 0.58;

    const t = clamp((start - r.top) / (start - end), 0, 1);
    setAngle(-72 * t);
  };

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  clap.addEventListener('click', () => {
    pinned = !pinned;
    if (pinned) setAngle(-72);
    else update();
  });

})();

/* ============================================================================================================================================================================================================================================================================================================
   Service Deck: glare + tilt
========================= */
(() => {
  const deck = document.querySelector('.service-deck');
  if (!deck) return;

  const cards = deck.querySelectorAll('.deck-card');

  cards.forEach((card) => {
    let raf = 0;

    const update = (clientX, clientY) => {
      const r = card.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = (clientY - r.top) / r.height;

      const px = Math.max(0, Math.min(1, x)) * 100;
      const py = Math.max(0, Math.min(1, y)) * 100;

      // glare position
      card.style.setProperty('--px', `${px.toFixed(2)}%`);
      card.style.setProperty('--py', `${py.toFixed(2)}%`);

      // tilt (subtle)
      const tiltX = (0.5 - y) * 10;   // up/down
      const tiltY = (x - 0.5) * 14;   // left/right
      card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    };

    const onMove = (e) => {
      const p = e;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(p.clientX, p.clientY));
    };

    const reset = () => {
      card.style.setProperty('--tilt-x', `0deg`);
      card.style.setProperty('--tilt-y', `0deg`);
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointerdown', reset);
  });
})();

/* =====================================================================================================================================================================================================================================================================================================================================
   Title Lamp: flicker when centered
========================= */
(() => {
  const lamp = document.getElementById('deckTitleLamp');
  if (!lamp) return;

  const wrap = lamp.closest('.deck-title-imgwrap');

  let fired = false;

  const obs = new IntersectionObserver((entries) => {
    const e = entries[0];
    if (!e) return;

    if (e.isIntersecting && !fired) {
      fired = true;
      lamp.classList.add('lamp-lit');
      if (wrap) wrap.classList.add('lamp-lit');
      obs.disconnect(); // один раз: загорелась и всё
    }
  }, {
    root: null,
    threshold: 0,
    // срабатывает когда элемент попадает в центральную “полосу” экрана
    rootMargin: '-45% 0px -45% 0px'
  });

  obs.observe(lamp);
})();

/* ===============================================================================================================================================================================
   DOSSIER INDEX (hover = select, no pin, no revert)
========================= */
(() => {
  const root = document.getElementById('dossierIndex');
  if (!root) return;

  const list = root.querySelector('.dx-list');
  const items = Array.from(root.querySelectorAll('.dx-item'));
  const view = root.querySelector('.dx-view');
  const img = root.querySelector('.dx-view-img');
  const thumbs = root.querySelector('.dx-thumbs');

  const brief = {
    req: root.querySelector('[data-k="req"]'),
    evi: root.querySelector('[data-k="evi"]'),
    op:  root.querySelector('[data-k="op"]'),
    res: root.querySelector('[data-k="res"]'),
  };

  const copy = {
    courses: {
      req: "упаковать курс в сериал, который держит внимание",
      evi: "70+ роликов / строгая структура / критичен звук",
      op:  "каркас → съёмка/запись → монтаж ритмом → графика",
      res: "единый стиль серии, готово к масштабированию",
    },
    broadcast: {
      req: "ровный эфир без провалов + быстрые записи после события",
      evi: "4+ часа / 10+ камер / меняющийся свет / звук непредсказуем",
      op:  "схема камер → контроль звука → режиссура → титры/графика",
      res: "дело закрыто за 24 часа: эфир + нарезки",
    },
    concert: {
      req: "передать энергию сцены так, чтобы смотрелось как клип",
      evi: "контровик / дым / скорость / толпа",
      op:  "точки → динамика → монтаж по музыке → цвет/стаб/звук",
      res: "темп держит, кадры цепляют с первых секунд",
    },
  };

  const accentMap = {
    cyan: "rgba(0,220,255,.85)",
    amber: "rgba(255,190,90,.92)",
    magenta: "rgba(255,90,190,.82)",
  };

  // проставим акцент каждому пункту один раз (чтобы подсветка работала всегда)
  items.forEach((btn) => {
    const key = btn.dataset.accent || "amber";
    btn.style.setProperty('--ac', accentMap[key] || accentMap.amber);
  });

  const flashScan = () => {
    const scan = root.querySelector('.dx-scan');
    if (!scan) return;
    scan.style.transition = "none";
    scan.style.opacity = "0.42";
    requestAnimationFrame(() => {
      scan.style.transition = "opacity .35s ease";
      scan.style.opacity = "0.22";
    });
  };

  const renderThumbs = (thumbList) => {
    if (!thumbs) return;
    thumbs.innerHTML = "";

    thumbList.forEach((src) => {
      const s = src.trim();
      if (!s) return;

      const b = document.createElement('button');
      b.type = "button";
      b.className = "dx-thumb";
      b.setAttribute("aria-label", "Открыть улику");
      b.innerHTML = `<img src="${s}" alt="evidence">`;

      b.addEventListener('click', () => {
        img.src = s;
        flashScan();
      });

      thumbs.appendChild(b);
    });
  };

  const apply = (btn) => {
    if (!btn || !view || !img) return;

    items.forEach(x => x.classList.remove('is-active'));
    btn.classList.add('is-active');

    const accentKey = btn.dataset.accent || "amber";
    const accent = accentMap[accentKey] || accentMap.amber;

    view.style.setProperty('--accent', accent);

    // main image
    img.src = btn.dataset.cover || img.src;

    // thumbs
    const raw = (btn.dataset.thumbs || "");
    const t = raw.split(",").map(s => s.trim()).filter(Boolean);
    renderThumbs(t.length ? t : [btn.dataset.cover].filter(Boolean));

    // text
    const key = btn.dataset.case;
    const c = copy[key];
    if (c) {
      if (brief.req) brief.req.textContent = c.req;
      if (brief.evi) brief.evi.textContent = c.evi;
      if (brief.op)  brief.op.textContent  = c.op;
      if (brief.res) brief.res.textContent = c.res;
    }

    flashScan();
  };

  // init
  const initial = items.find(i => i.classList.contains('is-active')) || items[0];
  apply(initial);

  // hover/focus/click = select (без отката)
  items.forEach((btn) => {
    btn.addEventListener('pointerenter', () => apply(btn));
    btn.addEventListener('focus', () => apply(btn));
    btn.addEventListener('click', () => apply(btn));
  });

  // УБРАЛИ: pointerleave-откат полностью
})();


/* ===============================================================================================================================================================================
   Evidence strip: wheel scroll horizontally (no visible bar)
========================= */
(() => {
  const strip = document.querySelector('.dx-thumbs');
  if (!strip) return;

  strip.addEventListener('wheel', (e) => {
    // если пользователь реально крутит колесо вертикально — переводим в горизонталь
    const dominantVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    if (!dominantVertical) return;

    // только когда есть горизонтальный скролл
    if (strip.scrollWidth <= strip.clientWidth) return;

    e.preventDefault();
    strip.scrollLeft += e.deltaY;
  }, { passive: false });
})();

/* show arrows only when can scroll */
(() => {
  const strip = document.querySelector('.dx-thumbs');
  const shell = document.querySelector('.dx-strip');
  if (!strip || !shell) return;

  const update = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    shell.classList.toggle('has-left', strip.scrollLeft > 2);
    shell.classList.toggle('has-right', strip.scrollLeft < max - 2);
  };

  strip.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* =========================
   Evidence strip arrows + wheel horizontal scroll
========================= */
(() => {
  const strip = document.querySelector('.dx-strip');
  const thumbs = document.querySelector('.dx-thumbs');
  const leftBtn = document.querySelector('.dx-arrow-left');
  const rightBtn = document.querySelector('.dx-arrow-right');

  if (!strip || !thumbs) return;

  // wheel -> horizontal scroll (only when hover on thumbs)
  thumbs.addEventListener('wheel', (e) => {
    const dominantVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    if (!dominantVertical) return;
    if (thumbs.scrollWidth <= thumbs.clientWidth) return;

    e.preventDefault();
    thumbs.scrollLeft += e.deltaY;
  }, { passive: false });

  const update = () => {
    const max = thumbs.scrollWidth - thumbs.clientWidth;
    strip.classList.toggle('has-left', thumbs.scrollLeft > 2);
    strip.classList.toggle('has-right', thumbs.scrollLeft < max - 2);
  };

  const scrollByAmount = (dir) => {
    // примерно 2 превью за раз
    const step = Math.max(240, thumbs.clientWidth * 0.55);
    thumbs.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (leftBtn) leftBtn.addEventListener('click', () => scrollByAmount(-1));
  if (rightBtn) rightBtn.addEventListener('click', () => scrollByAmount(1));

  thumbs.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  // Когда меняется кейс, вы пересоздаёте превью (thumbs.innerHTML = ...),
  // поэтому обновляем состояние стрелок чуть позже.
  const mo = new MutationObserver(() => requestAnimationFrame(update));
  mo.observe(thumbs, { childList: true });

  update();
})();
