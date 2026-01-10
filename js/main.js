// INDIVIDNI — main interactions

// 1) Шапка: фон при скролле
const header = document.getElementById('header');
if (header) {
  const onScroll = () => {
    if (window.scrollY > 24) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 2) Мобильное меню
const navToggle = document.querySelector('.nav-toggle');
const navList = document.getElementById('nav-list');

if (header && navToggle && navList) {
  const closeMenu = () => {
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    header.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.contains('nav-open');
    if (isOpen) closeMenu();
    else openMenu();
  });

  navList.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // клик вне меню — закрыть
  document.addEventListener('click', (e) => {
    if (!header.classList.contains('nav-open')) return;
    if (!header.contains(e.target)) closeMenu();
  });
}

// 3) Плавное появление блоков
const revealItems = document.querySelectorAll('.reveal');
if (revealItems.length) {
  if ('IntersectionObserver' in window) {
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
}

// 4) Кастомный курсор (только на устройствах с мышью)
const cursor = document.getElementById('custom-cursor');
const canUseCustomCursor =
  cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canUseCustomCursor) {
  document.addEventListener(
    'mousemove',
    (e) => {
      cursor.style.top = e.clientY + 'px';
      cursor.style.left = e.clientX + 'px';
    },
    { passive: true }
  );

  const hoverElements = document.querySelectorAll(
    'a, button, .btn, input, textarea, select, label'
  );

  hoverElements.forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovered'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovered'));
  });
}

// 5) Текущий год в футере
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
