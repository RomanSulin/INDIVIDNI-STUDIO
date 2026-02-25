(() => {
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
