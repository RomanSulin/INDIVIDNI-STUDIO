(function () {
  // Capabilities: SVG blocks hover animation (GSAP)
  if (!window.gsap) return;

  const mainSVG = document.getElementById("mainSVG");
  if (!mainSVG) return;

  const container = mainSVG.querySelector("#container");
  const colorTab = mainSVG.querySelector(".colorTab");
  if (!container || !colorTab) return;

  const pt = mainSVG.createSVGPoint();
  const mousePos = { x: -9999, y: 0 };

  const visibleArea = { value: 170, offset: 0 };

  // Colors stay as in your snippet, labels are the part you’ll tweak later
  const colors = [
    "#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6",
    "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b2226"
  ];

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

  const spacerX = 66; // distance between blocks in SVG units
  const tabs = [];

  gsap.set(mainSVG, { visibility: "visible" });

  // Build blocks
  colors.forEach((fill, i) => {
    const clone = colorTab.cloneNode(true);
    container.appendChild(clone);

    // group position
    gsap.set(clone, { x: i * spacerX });

    // rect
    const rect = clone.querySelector("rect");
    if (rect) gsap.set(rect, { fill, y: 90 });

    // label
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
    mousePos.y = p.y;
  }

  mainSVG.addEventListener("pointermove", onMove);
  mainSVG.addEventListener("pointerleave", () => {
    mousePos.x = -9999;
  });

  const clamp = gsap.utils.clamp;

  const mapOpacity = gsap.utils.pipe(
    clamp(0, visibleArea.value),
    gsap.utils.mapRange(0, visibleArea.value, 1, 0)
  );

  const mapPosY = gsap.utils.pipe(
    clamp(0, visibleArea.value),
    gsap.utils.mapRange(0, visibleArea.value, 95, 200)
  );

  function update() {
    tabs.forEach((g) => {
      const gx = gsap.getProperty(g, "x");
      const dist = Math.abs(gx - mousePos.x + visibleArea.offset);

      gsap.to(g, { y: mapPosY(dist), duration: 0.25, overwrite: true });
      const label = g.querySelector("text");
      if (label) gsap.to(label, { opacity: mapOpacity(dist), duration: 0.25, overwrite: true });
    });
  }

  gsap.ticker.add(update);
})();