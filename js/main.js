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
    raf = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();

/* =========================
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

  const tick = () => {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.top = cy + 'px';
    cursor.style.left = cx + 'px';

    const d = shortestDelta(currentAngle, targetAngle);
    currentAngle = normalize180(currentAngle + d * 0.12);
    cursor.style.setProperty('--angle', currentAngle + 'deg');

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  document.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;

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
    const turningOn = v.muted;
    v.muted = !turningOn;

    if (turningOn) {
      try { await v.play(); } catch (e) {}
    }
    setUI(turningOn);
  });
}

/* ==========================
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
    rAF = requestAnimationFrame(tick);
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
    }

    if (hoverActive) setTargetFromPoint(e.clientX, e.clientY);
  }, { passive: true });
})();

/* ==========================
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
