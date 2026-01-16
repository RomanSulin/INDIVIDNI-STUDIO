(() => {
  const html = document.documentElement;
  const body = document.body; 

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // We intentionally add the `.has-js` class a bit later (after we mark
  // above-the-fold elements as in-view) so there is no “blank page” moment.

  // Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Menu overlay
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');
  const menuClose = document.getElementById('menuClose');

  const closeMenu = () => {
    body.classList.remove('menu-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    if (menu) menu.setAttribute('aria-hidden', 'true');
  };

  const openMenu = () => {
    body.classList.add('menu-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    if (menu) menu.setAttribute('aria-hidden', 'false');
  };

  const toggleMenu = () => {
    body.classList.contains('menu-open') ? closeMenu() : openMenu();
  };

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', toggleMenu);
    menuClose && menuClose.addEventListener('click', closeMenu);

    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!body.classList.contains('menu-open')) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#menu') || t.closest('#menuBtn')) return;
      closeMenu();
    });
  }

  // Smooth in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  // Reveal
  // By default `.reveal` elements are visible (so the site isn't blank if JS fails).
  // We only enable the “hidden until in-view” behaviour *after* we immediately mark
  // above-the-fold elements as `.is-inview`.
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if (revealEls.length) {
    const inView = (el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.92 && r.bottom > 0;
    };

    // Mark visible elements BEFORE enabling the hidden state.
    revealEls.forEach((el) => {
      if (inView(el)) el.classList.add('is-inview');
    });

    // Now we can safely enable the hidden state for the rest.
    html.classList.add('has-js');

    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('is-inview'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              en.target.classList.add('is-inview');
              io.unobserve(en.target);
            }
          }
        },
        { threshold: 0.12 }
      );

      revealEls.forEach((el) => {
        if (el.classList.contains('is-inview')) return;
        io.observe(el);
      });
    }
  }

  // Magnetic
  if (finePointer && !reduce) {
    document.querySelectorAll('[data-magnet]').forEach((el) => {
      const strength = Number(el.getAttribute('data-magnet') || '0.22');
      let rect = null;

      el.addEventListener('pointerenter', () => {
        rect = el.getBoundingClientRect();
      });

      el.addEventListener('pointermove', (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        (el instanceof HTMLElement) && (el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`);
      });

      el.addEventListener('pointerleave', () => {
        rect = null;
        (el instanceof HTMLElement) && (el.style.transform = '');
      });
    });
  }

  // Custom cursor
  const cursor = document.querySelector('.cursor');
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorLabel = cursor?.querySelector('.cursor__label');

  if (finePointer && !reduce && cursor && cursorDot) {
    body.classList.add('has-cursor');

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let tx = x;
    let ty = y;

    const setPos = (el, px, py) => {
      el.style.left = px + 'px';
      el.style.top = py + 'px';
    };

    window.addEventListener(
      'pointermove',
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        setPos(cursorDot, tx, ty);
      },
      { passive: true }
    );

    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      setPos(cursor, x, y);
      requestAnimationFrame(loop);
    };
    loop();

    // Cursor labels
    const setLabel = (text) => {
      if (!cursorLabel) return;
      cursorLabel.textContent = text || '';
      cursorLabel.style.opacity = text ? '1' : '0';
    };

    const onEnter = (label) => {
      body.classList.add('cursor-active');
      setLabel(label);
    };
    const onLeave = () => {
      body.classList.remove('cursor-active');
      setLabel('');
    };

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      const label = el.getAttribute('data-cursor') || '';
      el.addEventListener('pointerenter', () => onEnter(label));
      el.addEventListener('pointerleave', onLeave);
    });

    // Default hover for links/buttons
    document.querySelectorAll('a, button, .card, .press').forEach((el) => {
      el.addEventListener('pointerenter', () => body.classList.add('cursor-hover'));
      el.addEventListener('pointerleave', () => body.classList.remove('cursor-hover'));
    });

    // Hide cursor on touch after first touch
    window.addEventListener('touchstart', () => {
      body.classList.remove('has-cursor');
      cursor.remove();
      cursorDot.remove();
    }, { once: true, passive: true });
  } else {
    cursor && cursor.remove();
    cursorDot && cursorDot.remove();
  }

  // Hover preview (projects)
  const preview = document.querySelector('.hover-preview');
  const previewImg = preview?.querySelector('img');

  if (preview && previewImg && finePointer && !reduce) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const show = (src) => {
      if (!src) return;
      previewImg.src = src;
      preview.classList.add('is-visible');
    };

    const hide = () => {
      preview.classList.remove('is-visible');
    };

    const move = (x, y) => {
      const pad = 18;
      const boxW = 360;
      const boxH = 240;
      const nx = clamp(x + 22, pad, window.innerWidth - boxW - pad);
      const ny = clamp(y + 18, pad, window.innerHeight - boxH - pad);
      preview.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
    };

    document.querySelectorAll('[data-preview]').forEach((el) => {
      const src = el.getAttribute('data-preview');
      el.addEventListener('pointerenter', () => show(src));
      el.addEventListener('pointerleave', hide);
      el.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
    });
  }

  // Info drawer (case pages)
  const infoBtn = document.getElementById('infoBtn');
  const infoClose = document.getElementById('infoClose');
  const infoBackdrop = document.getElementById('infoBackdrop');

  const closeInfo = () => body.classList.remove('info-open');
  const openInfo = () => body.classList.add('info-open');

  if (infoBtn) infoBtn.addEventListener('click', openInfo);
  if (infoClose) infoClose.addEventListener('click', closeInfo);
  if (infoBackdrop) infoBackdrop.addEventListener('click', closeInfo);

  // Progress bar
  const progressBar = document.querySelector('.progress__bar');
  if (progressBar) {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      progressBar.style.transform = `scaleX(${p})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  // Canvas background (subtle, monochrome)
  const canvas = document.getElementById('bg');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0;
  let h = 0;
  let mx = 0;
  let my = 0;

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
    },
    { passive: true }
  );

  const rand = (min, max) => min + Math.random() * (max - min);

  const orbs = Array.from({ length: 5 }, (_, i) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(Math.min(w, h) * 0.16, Math.min(w, h) * 0.34),
    vx: rand(-0.10, 0.10),
    vy: rand(-0.08, 0.08),
    a: rand(0.09, 0.15),
    t: i,
  }));

  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    // vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h));
    vg.addColorStop(0, 'rgba(255,255,255,0.035)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    const px = (mx / Math.max(1, w) - 0.5) * 24;
    const py = (my / Math.max(1, h) - 0.5) * 24;

    for (const o of orbs) {
      o.x += o.vx;
      o.y += o.vy;

      if (o.x < -o.r) o.x = w + o.r;
      if (o.x > w + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = h + o.r;
      if (o.y > h + o.r) o.y = -o.r;

      const cx = o.x + px * (o.r / 220);
      const cy = o.y + py * (o.r / 220);

      const isAccent = o.t === 2; // one subtle accent orb
      const colA = isAccent ? `rgba(26,47,251,${o.a})` : `rgba(255,255,255,${o.a})`;

      const rg = ctx.createRadialGradient(cx, cy, o.r * 0.18, cx, cy, o.r);
      rg.addColorStop(0, colA);
      rg.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    if (!reduce) requestAnimationFrame(draw);
  };

  draw();
})();
