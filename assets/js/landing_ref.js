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
  const nav = $('nav');
  const navToggle = $('[data-nav-toggle]');
  const navDrawer = $('[data-nav-drawer]');
  if (nav && navToggle && navDrawer) {
    const close = () => {
      nav.classList.remove('is-open');
      document.documentElement.classList.remove('nav-open');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', isOpen);
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
    const DEFAULT = '#005BFF'; // стартовый синий

    const setBg = (hex) => {
      if (!hex) return;
      splitRight.style.setProperty('--split-bg', hex);
      splitRight.style.setProperty('--split-fg', '#fff'); // всегда белый текст
    };

    const resetBg = () => setBg(DEFAULT);

    // init
    resetBg();

    items.forEach((el) => {
      const c = el.getAttribute('data-color');
      if (!c) return;
      el.addEventListener('pointerenter', () => setBg(c));
      el.addEventListener('focus', () => setBg(c));
    });

    splitRight.addEventListener('pointerleave', resetBg);
    splitRight.addEventListener('focusout', (e) => {
      const next = e.relatedTarget;
      if (!next || !splitRight.contains(next)) resetBg();
    });
  }

  // ── Steps interactive
  const stepsPanel = $('[data-steps]');
  if (stepsPanel) {
    const cards = $$('.step-card', stepsPanel);

    const closeAll = () => {
      stepsPanel.classList.remove('has-open');
      cards.forEach((c) => c.classList.remove('is-open'));
    };

    const openCard = (card) => {
      stepsPanel.classList.add('has-open');
      cards.forEach((c) => c.classList.toggle('is-open', c === card));
    };

    cards.forEach((card) => {
      const closeBtn = $('.step-x', card);

      const toggle = () => {
        if (card.classList.contains('is-open')) closeAll();
        else openCard(card);
      };

      card.addEventListener('click', (e) => {
        if (closeBtn && (e.target === closeBtn || closeBtn.contains(e.target))) {
          e.stopPropagation();
          closeAll();
          return;
        }
        toggle();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
        if (e.key === 'Escape') closeAll();
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeAll();
        });
      }
    });

    // click outside closes
    document.addEventListener('click', (e) => {
      if (!stepsPanel.classList.contains('has-open')) return;
      if (!stepsPanel.contains(e.target)) closeAll();
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
