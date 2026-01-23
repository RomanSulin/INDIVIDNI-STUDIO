(function () {
  // Capabilities SVG tabs — keep the original hover animation
  // but make BOTH spacing and CARD widths fill the whole container width.
  if (!window.gsap) return;

  const mainSVG = document.getElementById('mainSVG');
  if (!mainSVG) return;

  const animWrap = mainSVG.closest('.cap-anim') || mainSVG.parentElement;
  const container = mainSVG.querySelector('#container');
  const colorTab = mainSVG.querySelector('.colorTab');
  const maskRect = mainSVG.querySelector('#mask rect');

  if (!container || !colorTab) return;

  gsap.config({ trialWarn: false });

  const pt = mainSVG.createSVGPoint();
  const mousePos = { x: -9999, y: 0 };

  // Will be updated after layout
  const visibleArea = { value: 160, offset: 0 };

  const colors = [
    '#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6',
    '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226'
  ];

  // ✅ Change texts here
  const labels = [
    'Commercials',
    'Brand Films',
    'Music Videos',
    'Fashion',
    'CGI / VFX',
    'Color',
    'Sound',
    'Motion',
    'Web',
    'Direction'
  ];

  // make sure it's visible
  gsap.set(mainSVG, { visibility: 'visible' });

  // Build tabs once
  container.innerHTML = '';
  const tabs = [];

  colors.forEach((fill, i) => {
    const clone = colorTab.cloneNode(true);
    container.appendChild(clone);

    const rect = clone.querySelector('rect');
    if (rect) gsap.set(rect, { fill, y: 100 });

    const text = clone.querySelector('text');
    if (text) text.textContent = labels[i] || `Item ${i + 1}`;

    tabs.push(clone);
  });

  function cursorPoint(evt) {
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(mainSVG.getScreenCTM().inverse());
  }

  function onMove(e) {
    const p = cursorPoint(e);
    mousePos.x = p.x;
    mousePos.y = p.y - visibleArea.offset;
  }

  mainSVG.addEventListener('pointermove', onMove);
  mainSVG.addEventListener('pointerleave', () => (mousePos.x = -9999));

  function mapOpacity(dist) {
    const max = Math.max(1, visibleArea.value);
    const v = Math.max(0, Math.min(max, dist));
    return gsap.utils.mapRange(0, max, 1, 0, v);
  }

  function mapPosY(dist) {
    const max = Math.max(1, visibleArea.value);
    const v = Math.max(0, Math.min(max, dist));
    return gsap.utils.mapRange(0, max, 100, 200, v);
  }

  // Layout: keep viewBox height stable, adapt viewBox width to container aspect
  // then make each CARD width = slot width (so no gaps).
  const VIEW_H = 600;

  function fitToWidth() {
    const r = (animWrap && animWrap.getBoundingClientRect) ? animWrap.getBoundingClientRect() : mainSVG.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);

    // keep vertical scale stable
    const viewW = VIEW_H * (w / h);

    mainSVG.setAttribute('viewBox', `0 0 ${viewW} ${VIEW_H}`);
    if (maskRect) maskRect.setAttribute('width', String(viewW));

    const n = Math.max(1, tabs.length);
    const GAP = 0; // set to 6 if you want a small gap between cards

    const tabW = (viewW - GAP * (n - 1)) / n;

    // keep the hover influence proportional to the new card size
    visibleArea.value = Math.max(160, tabW * 2.2);

    const rx = Math.max(10, Math.min(20, tabW * 0.18));
    const padX = Math.max(10, tabW * 0.08);

    tabs.forEach((g, i) => {
      gsap.set(g, { x: i * (tabW + GAP) });

      const rect = g.querySelector('rect');
      if (rect) {
        rect.setAttribute('width', String(tabW));
        rect.setAttribute('rx', String(rx));
      }

      const text = g.querySelector('text');
      if (text) {
        text.setAttribute('x', String(padX));
      }
    });
  }

  fitToWidth();
  window.addEventListener('resize', fitToWidth, { passive: true });

  function update() {
    tabs.forEach((g) => {
      const gx = gsap.getProperty(g, 'x');
      const dist = Math.hypot(gx - mousePos.x + visibleArea.offset, 0);

      gsap.to(g, { y: mapPosY(dist), duration: 0.25, overwrite: true });

      const label = g.querySelector('text');
      if (label) gsap.to(label, { opacity: mapOpacity(dist), duration: 0.25, overwrite: true });
    });
  }

  gsap.ticker.add(update);
})();
