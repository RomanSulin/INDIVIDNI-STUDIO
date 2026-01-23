(function () {
  // Capabilities SVG tabs — keep the original animation,
  // but make the tabs span the FULL WIDTH of the accordion container
  // without scaling them taller.
  if (!window.gsap) return;

  const mainSVG = document.getElementById("mainSVG");
  if (!mainSVG) return;

  const animWrap = mainSVG.closest(".cap-anim") || mainSVG.parentElement;
  const container = mainSVG.querySelector("#container");
  const colorTab = mainSVG.querySelector(".colorTab");
  const maskRect = mainSVG.querySelector("#mask rect");

  if (!container || !colorTab) return;

  gsap.config({ trialWarn: false });

  const pt = mainSVG.createSVGPoint();
  const mousePos = { x: -9999, y: 0 };

  // Keep original "feel" but adapt to spacing a bit
  const visibleArea = { value: 160, offset: 0 };

  const colors = [
    "#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6",
    "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b2226"
  ];

  // ✅ Change texts here
  const labels = [
    "Commercials",
    "Brand Films",
    "Music Videos",
    "Fashion",
    "CGI / VFX",
    "Color",
    "Sound",
    "Motion",
    "Web",
    "Direction"
  ];

  // Make svg visible (in case it starts hidden)
  gsap.set(mainSVG, { visibility: "visible" });

  // Build tabs once
  container.innerHTML = "";
  const tabs = [];

  colors.forEach((fill, i) => {
    const clone = colorTab.cloneNode(true);
    container.appendChild(clone);

    // rect style + position like original
    const rect = clone.querySelector("rect");
    if (rect) gsap.set(rect, { fill, y: 100 });

    const text = clone.querySelector("text");
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

  mainSVG.addEventListener("pointermove", onMove);
  mainSVG.addEventListener("pointerleave", () => (mousePos.x = -9999));

  const clamp = gsap.utils.clamp;

  const mapOpacity = gsap.utils.pipe(
    clamp(0, visibleArea.value),
    gsap.utils.mapRange(0, visibleArea.value, 1, 0)
  );

  const mapPosY = gsap.utils.pipe(
    clamp(0, visibleArea.value),
    gsap.utils.mapRange(0, visibleArea.value, 100, 200)
  );

  // ---- Fit-to-width logic (only X), keep height behaviour the same
  // We keep viewBox HEIGHT = 600 (as in your SVG) => vertical scale stays stable.
  const VIEW_H = 600;

  function fitToWidth() {
    const r = (animWrap && animWrap.getBoundingClientRect) ? animWrap.getBoundingClientRect() : mainSVG.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);

    // Calculate a viewBox width that exactly matches the current container aspect ratio
    // so the SVG uses the FULL width without making everything taller.
    const viewW = VIEW_H * (w / h);

    mainSVG.setAttribute("viewBox", `0 0 ${viewW} ${VIEW_H}`);
    if (maskRect) maskRect.setAttribute("width", String(viewW));

    // Get tab width from template (default 130)
    const rectTemplate = colorTab.querySelector("rect");
    const tabW = rectTemplate ? (parseFloat(rectTemplate.getAttribute("width")) || 130) : 130;

    const n = tabs.length;
    const spacerX = n > 1 ? (viewW - tabW) / (n - 1) : 0;

    // Keep the "influence radius" similar even when we spread wider
    visibleArea.value = Math.max(160, spacerX * 2.2);

    tabs.forEach((g, i) => {
      gsap.set(g, { x: i * spacerX });
    });
  }

  // Initial + on resize
  fitToWidth();
  window.addEventListener("resize", () => {
    fitToWidth();
  }, { passive: true });

  function update() {
    tabs.forEach((g) => {
      const gx = gsap.getProperty(g, "x");
      const dist = Math.hypot(gx - mousePos.x + visibleArea.offset, 0);

      gsap.to(g, { y: mapPosY(dist), duration: 0.25, overwrite: true });

      const label = g.querySelector("text");
      if (label) gsap.to(label, { opacity: mapOpacity(dist), duration: 0.25, overwrite: true });
    });
  }

  gsap.ticker.add(update);
})();
