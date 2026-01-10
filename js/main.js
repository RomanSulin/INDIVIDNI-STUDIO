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
