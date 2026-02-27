/* services_catalog.js — nav toggle + year + hover video play */
(() => {
  // year
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  // nav drawer (same behavior as on landing)
  const nav = document.querySelector('nav');
  const btn = document.querySelector('[data-nav-toggle]');
  const drawer = document.querySelector('[data-nav-drawer]');
  if (nav && btn && drawer) {
    const sync = () => btn.setAttribute('aria-expanded', nav.classList.contains('is-open') ? 'true' : 'false');
    const close = () => { nav.classList.remove('is-open'); sync(); };
    btn.addEventListener('click', (e) => { e.preventDefault(); nav.classList.toggle('is-open'); sync(); });
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    sync();
  }

  // video hover on cards (desktop). On touch: keep paused.
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  const prime = (v) => {
    if (!v || v.dataset.primed) return;
    v.dataset.primed = '1';
    v.querySelectorAll('source').forEach((s) => {
      if (!s.getAttribute('src') && s.dataset.src) s.setAttribute('src', s.dataset.src);
    });
    try { v.load(); } catch (_) {}
  };

  // Catalog cards
  const cards = Array.from(document.querySelectorAll('.scard'));
  cards.forEach((card) => {
    const v = card.querySelector('video');
    if (!v) return;

    const play = () => {
      if (prefersReduced) return;
      prime(v);
      const p = v.play && v.play();
      if (p && p.catch) p.catch(() => {});
    };

    const stop = () => {
      try { v.pause(); } catch (_) {}
      try { v.currentTime = 0; } catch (_) {}
    };

    // Default state: stopped
    stop();

    if (canHover) {
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', stop);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', stop);
    }
  });

  // Detail page: keep hero playing, but pause on background tab
  const heroV = document.querySelector('.service-hero__video');
  if (heroV) {
    const ensure = () => {
      if (prefersReduced) return;
      const p = heroV.play && heroV.play();
      if (p && p.catch) p.catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        try { heroV.pause(); } catch (_) {}
      } else {
        ensure();
      }
    });
    ensure();
  }
})();
