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

  const warmFirstFrame = (v) => {
    if (!v || v.dataset.warmed) return;
    v.dataset.warmed = '1';
    // ensure sources are present and fetch only metadata
    v.preload = 'metadata';
    prime(v);

    // remove placeholder poster after we have a decoded frame
    const tryRemovePoster = () => { try { v.removeAttribute('poster'); } catch (_) {} };

    // Seek a tiny bit to force decode in Safari/iOS
    const onMeta = () => {
      try {
        const t = Math.min(0.05, (isFinite(v.duration) && v.duration > 0) ? v.duration * 0.01 : 0.05);
        v.currentTime = t;
      } catch (_) {}
    };

    const onSeeked = () => {
      try { v.pause(); } catch (_) {}
      tryRemovePoster();
    };

    v.addEventListener('loadedmetadata', onMeta, { once: true });
    v.addEventListener('seeked', onSeeked, { once: true });

    try { v.load(); } catch (_) {}
  };

  // Warm posters ASAP (but keep it light): only when cards enter viewport
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const v = e.target.querySelector && e.target.querySelector('video');
      if (v) warmFirstFrame(v);
      io.unobserve(e.target);
    });
  }, { rootMargin: '300px 0px' }) : null;

  const cards = Array.from(document.querySelectorAll('.scard'));
  cards.forEach((card) => {
    const v = card.querySelector('video');
    if (!v) return;

    // Make sure the card is never blank on refresh: load the first frame
    if (io) { io.observe(card); } else { warmFirstFrame(v); }

    const play = () => {
      if (prefersReduced) return;
      prime(v);
      const p = v.play && v.play();
      if (p && p.catch) p.catch(() => {});
    };

    const stop = () => {
      try { v.pause(); } catch (_) {}
    };

    // Default state: stopped
    stop();

    if (canHover) {
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', () => { stop(); try { v.currentTime = 0; } catch (_) {} });
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', () => { stop(); try { v.currentTime = 0; } catch (_) {} });
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
