(() => {
  // mobile nav
  const nav = document.querySelector('nav');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navDrawer = document.querySelector('[data-nav-drawer]');
  if (nav && navToggle && navDrawer) {
    const close = () => nav.classList.remove('is-open');
    navToggle.addEventListener('click', (e) => {
      e.preventDefault();
      nav.classList.toggle('is-open');
    });
    navDrawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  // banner close
  const closeBtn = document.querySelector('[data-close-banner]');
  const banner = document.getElementById('proBanner');
  if (closeBtn && banner) closeBtn.addEventListener('click', () => (banner.style.display = 'none'));

  // year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbClose = document.querySelector('[data-lb-close]');

  const openLightbox = (src) => {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lb.classList.add('open');
  };

  const closeLightbox = () => {
    if (!lb) return;
    lb.classList.remove('open');
  };

  if (lbClose) lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  if (lb) lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // projects split hover background (solid colors)
  const chooser = document.querySelector('[data-project-chooser]');
  if (chooser) {
    const items = chooser.querySelectorAll('[data-color]');
    const defaultBg = '#000';

    const setBg = (v) => chooser.style.setProperty('--split-bg', v);
    const reset = () => setBg(defaultBg);

    // init
    setBg(defaultBg);

    items.forEach((item) => {
      const c = item.getAttribute('data-color');
      const apply = () => c && setBg(c);
      item.addEventListener('mouseenter', apply);
      item.addEventListener('focus', apply);
      item.addEventListener('touchstart', apply, { passive: true });
    });
    chooser.addEventListener('mouseleave', reset);
    chooser.addEventListener('blur', reset);
  }

  // collection items
  const items = Array.from({ length: 40 }, (_, i) => ({ n: i + 1, alt: `Frame ${i + 1}` }));
  const grid = document.getElementById('letterGrid');
  const previewIcon = './assets/png/sound.png'; // simple local icon

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

  // tab switching
  window.switchTab = (btn, tab) => {
    document.querySelectorAll('.color-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = tab;
    buildGrid(tab);
  };

  // init
  buildGrid(currentTab);
})();
