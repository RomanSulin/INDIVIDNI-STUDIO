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

// ===== HERO reveal: drag clapper =====
(() => {
  const stage = document.getElementById('heroStage');
  const handle = document.getElementById('clapHandle');
  if (!stage || !handle) return;

  let dragging = false;
  let startX = 0;
  let startHandleX = 0;
  let handleX = 0;

  const bounds = { min: 0, max: 0 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const measure = () => {
    const stageRect = stage.getBoundingClientRect();
    const handleRect = handle.getBoundingClientRect();

    // границы движения внутри stage
    const pad = Math.min(40, stageRect.width * 0.06);
    bounds.min = 0; // в px относительно стартовой позиции
    bounds.max = Math.max(0, stageRect.width - handleRect.width - pad * 2);

    // если экран стал меньше — поджимаем позицию
    handleX = clamp(handleX, bounds.min, bounds.max);
    apply(handleX, false);
  };

  const apply = (x, live) => {
    handleX = clamp(x, bounds.min, bounds.max);

    const denom = Math.max(1, (bounds.max - bounds.min));
    const p = (handleX - bounds.min) / denom; // 0..1

    const pct = Math.round(p * 100);
    stage.style.setProperty('--handleX', `${handleX}px`);
    stage.style.setProperty('--reveal', `${pct}%`);
    stage.style.setProperty('--clapAngle', `${(-55 * p).toFixed(2)}deg`);

    handle.setAttribute('aria-valuenow', String(pct));

    if (live) stage.classList.add('is-live');
    if (!live && pct === 0) stage.classList.remove('is-live');
  };

  const onDown = (e) => {
    dragging = true;
    stage.dataset.dragging = 'true';
    stage.classList.add('is-live');

    startX = e.clientX;
    startHandleX = handleX;

    handle.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    apply(startHandleX + dx, true);
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    stage.dataset.dragging = 'false';

    // снап (чтобы ощущалось “дошёл — открыл”)
    const denom = Math.max(1, (bounds.max - bounds.min));
    const p = (handleX - bounds.min) / denom;

    const target = p > 0.55 ? bounds.max : bounds.min;
    apply(target, true);

    // если закрыли — гасим live чуть позже
    if (target === bounds.min) {
      setTimeout(() => stage.classList.remove('is-live'), 450);
    }
  };

  handle.addEventListener('pointerdown', onDown);
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);

  // клавиатура (на всякий)
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); apply(handleX + 30, true); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); apply(handleX - 30, true); }
    if (e.key === 'Enter')      { e.preventDefault(); apply(handleX > bounds.max * 0.4 ? bounds.min : bounds.max, true); }
  });

  window.addEventListener('resize', measure, { passive: true });
  measure();
})();

