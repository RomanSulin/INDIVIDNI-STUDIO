document.documentElement.classList.add('js');
// ===== Header on scroll
const header = document.getElementById('header');
const onScroll = () => {
  if (!header) return;
  if (window.scrollY > 24) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== Mobile menu
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

// ===== Reveal sections
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

// ===== Custom cursor (spotlight) ONLY on mouse devices
const cursor = document.getElementById('custom-cursor');
const canUseCustomCursor =
  cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canUseCustomCursor) {
  document.body.classList.add('cursor-on');

  let prevX = null;
  let prevY = null;

  // позиция курсора (сглаживание)
  let cx = 0, cy = 0;
  let tx = 0, ty = 0;

  // угол луча (сглаживание + правильный переход через -180/180)
  let currentAngle = 0; // фактический угол (в градусах)
  let targetAngle = 0;  // куда хотим повернуться

  const normalize180 = (a) => {
    // приводит угол к диапазону [-180, 180)
    a = ((a + 180) % 360 + 360) % 360 - 180;
    return a;
  };

  const shortestAngleDelta = (from, to) => {
    // возвращает разницу по кратчайшему пути
    const delta = normalize180(to - from);
    return delta;
  };

  const tick = () => {
    // плавно двигаем позицию
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.top = cy + 'px';
    cursor.style.left = cx + 'px';

    // плавно поворачиваем луч по кратчайшему пути
    const d = shortestAngleDelta(currentAngle, targetAngle);
    currentAngle = normalize180(currentAngle + d * 0.12); // 0.18 = скорость поворота
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

      // если мышь реально двигается — обновляем целевой угол
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      }
    }

    prevX = e.clientX;
    prevY = e.clientY;
  }, { passive: true });

  // усиление при наведении на кликабельное
  document.querySelectorAll('a, button, .btn').forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovered'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovered'));
  });
}



// ===== Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());


// ===== Showreel sound toggle (TRASH BLOB)
const v = document.getElementById('showreelVideo');
const btn = document.getElementById('soundToggle');

if (v && btn) {
  const textEl = btn.querySelector('.sound-blob__text');

  const setUI = (isOn) => {
    btn.classList.toggle('is-on', isOn);
    btn.classList.toggle('is-off', !isOn);
    btn.setAttribute('aria-pressed', String(isOn));
    if (textEl) textEl.textContent = isOn ? 'Выкл звук' : 'Вкл звук';

    // перезапуск "желе" анимации
    btn.classList.remove('jelly');
    void btn.offsetWidth;
    btn.classList.add('jelly');
  };

  // старт: autoplay почти всегда muted
  setUI(!v.muted);

  btn.addEventListener('click', async () => {
    const isTurningOn = v.muted;
    v.muted = !isTurningOn;

    if (isTurningOn) {
      try { await v.play(); } catch (e) {}
    }

    setUI(isTurningOn);
  });
}

// ===== HERO: hover spotlight + clapper scroll-open + ambient glow =====
(() => {
  const section = document.getElementById('heroSection');
  const stage = document.getElementById('heroStage');
  const logo  = document.getElementById('heroLogo');
  const clap  = document.getElementById('clapButton');

  if (!section || !stage || !logo) return;

  // ---------- Ambient glow everywhere ----------
  let amx = window.innerWidth * 0.5;
  let amy = window.innerHeight * 0.45;
  let atx = amx, aty = amy;
  let araf = 0;

  const lerp = (a, b, t) => a + (b - a) * t;

  const ambientTick = () => {
    amx = lerp(amx, atx, 0.14);
    amy = lerp(amy, aty, 0.14);
    document.documentElement.style.setProperty('--mx', `${amx.toFixed(1)}px`);
    document.documentElement.style.setProperty('--my', `${amy.toFixed(1)}px`);
    araf = requestAnimationFrame(ambientTick);
  };

  window.addEventListener('pointermove', (e) => {
    atx = e.clientX;
    aty = e.clientY;
    if (!araf) ambientTick();
  }, { passive: true });

  // ---------- Spotlight reveal on logo (works even if something overlaps) ----------
  let hoverActive = false;

  let tx = 50, ty = 50;
  let cx = 50, cy = 50;
  let raf = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const tick = () => {
    cx = lerp(cx, tx, 0.18);
    cy = lerp(cy, ty, 0.18);
    stage.style.setProperty('--reveal-x', `${cx.toFixed(2)}%`);
    stage.style.setProperty('--reveal-y', `${cy.toFixed(2)}%`);
    raf = requestAnimationFrame(tick);
  };

  const setTargetFromEvent = (clientX, clientY) => {
    const r = logo.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    tx = clamp(x, 0, 100);
    ty = clamp(y, 0, 100);
  };

  // включаем режим только когда вошли в лого
  logo.addEventListener('pointerenter', (e) => {
    hoverActive = true;
    stage.classList.add('is-hover');
    document.body.classList.add('glow-boost');
    setTargetFromEvent(e.clientX, e.clientY);
    if (!raf) tick();
  });

  logo.addEventListener('pointerleave', () => {
    hoverActive = false;
    stage.classList.remove('is-hover');
    document.body.classList.remove('glow-boost');
  });

  // движения мыши слушаем по всей секции, чтобы перекрытия не ломали эффект
  section.addEventListener('pointermove', (e) => {
    if (!hoverActive) return;
    setTargetFromEvent(e.clientX, e.clientY);
  });

  // ---------- Clapper opens when you scroll down to it ----------
  let pinned = false;

  const setClapAngle = (deg) => {
    if (!clap) return;
    clap.style.setProperty('--clapAngle', `${deg.toFixed(2)}deg`);
  };

  const updateClapFromScroll = () => {
    if (!clap || pinned) return;

    const r = clap.getBoundingClientRect();
    const vh = window.innerHeight;

    // когда верх хлопушки около низа экрана -> начинаем открывать
    const startY = vh * 0.90;
    const endY   = vh * 0.55;

    const t = clamp((startY - r.top) / (startY - endY), 0, 1);
    const angle = -72 * t;

    setClapAngle(angle);

    // когда почти открыта — считаем “open”
    if (t > 0.75) stage.classList.add('is-open');
    else stage.classList.remove('is-open');
  };

  let sraf = 0;
  const onScroll = () => {
    if (sraf) return;
    sraf = requestAnimationFrame(() => {
      sraf = 0;
      updateClapFromScroll();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateClapFromScroll();

  // Клик = “зафиксировать открытой / закрытой”
  if (clap) {
    clap.addEventListener('click', () => {
      pinned = !pinned;
      clap.classList.add('touched');

      if (pinned) {
        setClapAngle(-72);
        stage.classList.add('is-open');
      } else {
        updateClapFromScroll();
      }
    });
  }
})();
