(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ── Banner close
  const closeBtn = $('[data-close-banner]');
  const banner = document.getElementById('proBanner');
  if (closeBtn && banner) {
    closeBtn.addEventListener('click', () => (banner.style.display = 'none'));
  }

  // ── Mobile nav
  const navToggle = $('[data-nav-toggle]');
  const navDrawer = $('[data-nav-drawer]');
  if (navToggle && navDrawer) {
    const close = () => {
      navDrawer.classList.remove('open');
      navToggle.classList.remove('open');
      document.documentElement.classList.remove('nav-open');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = !navDrawer.classList.contains('open');
      navDrawer.classList.toggle('open', isOpen);
      navToggle.classList.toggle('open', isOpen);
      document.documentElement.classList.toggle('nav-open', isOpen);
    });

    $$('a', navDrawer).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  // ── Year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ── Projects split: change right-half background to pure color on hover/focus
  const splitRight = $('[data-project-chooser]');
  if (splitRight) {
    const items = $$('[data-color]', splitRight);

    const parseHex = (hex) => {
      if (!hex) return null;
      const h = hex.trim().replace('#', '');
      if (h.length !== 6) return null;
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    };

    // WCAG-ish luminance to decide text color
    const idealText = (hex) => {
      const rgb = parseHex(hex);
      if (!rgb) return '#fff';
      const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
        const x = v / 255;
        return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
      return L > 0.55 ? '#000' : '#fff';
    };

    const setBg = (hex) => {
      splitRight.style.setProperty('--split-bg', hex);
      splitRight.style.setProperty('--split-fg', idealText(hex));
    };

    const resetBg = () => {
      splitRight.style.removeProperty('--split-bg');
      splitRight.style.removeProperty('--split-fg');
    };

    items.forEach((el) => {
      const c = el.getAttribute('data-color');
      if (!c) return;
      el.addEventListener('pointerenter', () => setBg(c));
      el.addEventListener('focus', () => setBg(c));
    });

    splitRight.addEventListener('pointerleave', resetBg);
    splitRight.addEventListener('focusout', (e) => {
      // reset when focus leaves the whole right panel
      const next = e.relatedTarget;
      if (!next || !splitRight.contains(next)) resetBg();
    });
  }

  // ── Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbClose = $('[data-lb-close]');

  const openLightbox = (src) => {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lb.classList.add('open');
  };

  const closeLightbox = () => {
    if (!lb) return;
    lb.classList.remove('open');
  };

  if (lbClose) lbClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  if (lb) lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // ── Collection grid
  const items = Array.from({ length: 40 }, (_, i) => ({ n: i + 1, alt: `Frame ${i + 1}` }));
  const grid = document.getElementById('letterGrid');
  const previewIcon = './assets/png/sound.png';

  let currentTab = 'color';

  function buildGrid(tab) {
    if (!grid) return;
    grid.innerHTML = '';
    items.forEach((item) => {
      const src = './assets/img/ph_square.png';
      const div = document.createElement('div');
      div.className = 'grid-item';
      if (tab === 'black') div.style.filter = 'grayscale(1) contrast(1.1)';
      div.innerHTML = `
        <img src="${src}" alt="${item.alt}" loading="lazy" />
        <img class="ic-preview" src="${previewIcon}" alt="" />
      `;
      div.addEventListener('click', () => openLightbox(src));
      grid.appendChild(div);
    });
  }

  // tab switching used by inline onclick
  window.switchTab = (btn, tab) => {
    $$('.color-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = tab;
    buildGrid(tab);
  };

  buildGrid(currentTab);
})();
