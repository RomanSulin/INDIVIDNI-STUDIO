/* services_catalog.js — nav toggle + service videos */
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

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  const mobileMq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : { matches: false };

  const getResponsiveSrc = (source) => {
    const desktop = source.dataset.srcDesktop || source.dataset.src || source.getAttribute('src') || '';
    const mobile = source.dataset.srcMobile || desktop;
    return mobileMq.matches ? (mobile || desktop) : (desktop || mobile);
  };

  const applyResponsiveSources = (video) => {
    if (!video) return false;
    let changed = false;

    video.querySelectorAll('source').forEach((source) => {
      const nextSrc = getResponsiveSrc(source);
      if (!nextSrc) return;

      if (source.dataset.src !== nextSrc) {
        source.dataset.src = nextSrc;
      }

      if (source.getAttribute('src') !== nextSrc) {
        source.setAttribute('src', nextSrc);
        changed = true;
      }
    });

    return changed;
  };

  const prime = (video, force = false) => {
    if (!video) return;
    const changed = applyResponsiveSources(video);
    if (video.dataset.primed && !force && !changed) return;
    video.dataset.primed = '1';
    try { video.load(); } catch (_) {}
  };

  const safePlay = (video) => {
    if (!video || prefersReduced) return;
    prime(video);
    const p = video.play && video.play();
    if (p && p.catch) p.catch(() => {});
  };

  // Catalog cards
  const warmFirstFrame = (video) => {
    if (!video || video.dataset.warmed) return;
    video.dataset.warmed = '1';
    video.preload = 'metadata';
    prime(video);

    const tryRemovePoster = () => { try { video.removeAttribute('poster'); } catch (_) {} };

    const onMeta = () => {
      try {
        const t = Math.min(0.05, (isFinite(video.duration) && video.duration > 0) ? video.duration * 0.01 : 0.05);
        video.currentTime = t;
      } catch (_) {}
    };

    const onSeeked = () => {
      try { video.pause(); } catch (_) {}
      tryRemovePoster();
    };

    video.addEventListener('loadedmetadata', onMeta, { once: true });
    video.addEventListener('seeked', onSeeked, { once: true });

    try { video.load(); } catch (_) {}
  };

  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const video = entry.target.querySelector && entry.target.querySelector('video');
      if (video) warmFirstFrame(video);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '300px 0px' }) : null;

  const cards = Array.from(document.querySelectorAll('.scard'));
  cards.forEach((card) => {
    const video = card.querySelector('video');
    if (!video) return;

    if (io) { io.observe(card); } else { warmFirstFrame(video); }

    const play = () => {
      safePlay(video);
    };

    const stop = () => {
      try { video.pause(); } catch (_) {}
    };

    stop();

    if (canHover) {
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', () => { stop(); try { video.currentTime = 0; } catch (_) {} });
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', () => { stop(); try { video.currentTime = 0; } catch (_) {} });
    }
  });

  // Additional service cards on the catalog page
  const extraVideos = Array.from(document.querySelectorAll('.svc-video'));
  extraVideos.forEach((video) => {
    prime(video);
    safePlay(video);
  });

  // Detail page hero video
  const heroV = document.querySelector('.service-hero__video');
  if (heroV) {
    prime(heroV);

    const ensure = () => {
      safePlay(heroV);
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

  const handleBreakpointChange = () => {
    document.querySelectorAll('video').forEach((video) => {
      const hasResponsiveSource = video.querySelector('source[data-src-desktop], source[data-src-mobile]');
      if (!hasResponsiveSource) return;

      try { video.pause(); } catch (_) {}
      video.removeAttribute('data-primed');
      video.removeAttribute('data-warmed');
      prime(video, true);

      if (video.matches('.service-hero__video, .svc-video')) {
        safePlay(video);
      }
    });
  };

  if (mobileMq && typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', handleBreakpointChange);
  } else if (mobileMq && typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(handleBreakpointChange);
  }
})();
