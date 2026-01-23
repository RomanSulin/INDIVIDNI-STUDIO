(function () {
  // Capabilities SVG tabs
  // Goals:
  //  - keep the same "hover wave" feel (tabs shift down + labels fade)
  //  - fill the whole container width (no dead gaps)
  //  - make cards visibly taller (~2x on screen) by using a smaller internal viewBox height
  //  - allow overlap (cards on top of each other) with a simple parameter
  if (!window.gsap) return;

  const mainSVG = document.getElementById("mainSVG");
  if (!mainSVG) return;

  const wrap = mainSVG.closest(".cap-anim") || mainSVG.parentElement;
  const container = mainSVG.querySelector("#container");
  const colorTab = mainSVG.querySelector(".colorTab");
  const maskRect = mainSVG.querySelector("#mask rect");
  if (!container || !colorTab) return;

  gsap.config({ trialWarn: false });

  const pt = mainSVG.createSVGPoint();
  const mousePos = { x: -9999, y: -9999 };
  const visibleArea = { value: 180, offset: 0 };

  // EDIT TEXTS HERE (same count as colors)
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
    "Direction",
  ];

  // You can swap colors later
  const colors = [
    "#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6",
    "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b2226"
  ];

  // Build tabs once
  gsap.set(mainSVG, { visibility: "visible" });
  container.innerHTML = "";
  const tabs = [];

  colors.forEach((fill, i) => {
    const clone = colorTab.cloneNode(true);
    container.appendChild(clone);

    const rect = clone.querySelector("rect");
    if (rect) {
      rect.setAttribute("fill", fill);
    }

    const text = clone.querySelector("text");
    if (text) {
      text.textContent = labels[i] || `Item ${i + 1}`;
    }

    tabs.push(clone);
  });

  function cursorPoint(evt) {
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(mainSVG.getScreenCTM().inverse());
  }

  // ---- Layout settings (tweak these only) ----
  const VIEW_H = 400;            // smaller internal height => bigger cards on screen
  const MASK_H = 5;            // same as view height => no "dead" vertical area
  const OVERLAP = 0.65;          // 0 = no overlap, 0.65 = strong overlap (cards on top)
  const LABEL_Y = 250;           // label baseline inside the card (in viewBox units)
  const RECT_Y = 5;             // top offset inside the group
  const RECT_H = 250;            // card height (in viewBox units) ~almost full height
  const GAP = 0;                 // keep 0 for full-coverage. increase if you want spacing

  // dynamic layout
  let step = 0;
  let cardW = 0;

  function fitToWrap() {
    const r = wrap.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);

    // match viewBox aspect to actual element => SVG fills without letterboxing
    const viewW = VIEW_H * (w / h);

    mainSVG.setAttribute("viewBox", `0 0 ${viewW} ${VIEW_H}`);
    if (maskRect) {
      maskRect.setAttribute("width", String(viewW));
      maskRect.setAttribute("height", String(MASK_H));
    }

    const n = Math.max(1, tabs.length);

    // Overlap math:
    // cardW = step*(1+OVERLAP)
    // total = step*(n + OVERLAP)  => step = (viewW - GAP*(n-1)) / (n + OVERLAP)
    step = (viewW - GAP * (n - 1)) / (n + OVERLAP);
    cardW = step * (1 + OVERLAP);

    // influence radius tied to card spacing (keeps feel consistent)
    visibleArea.value = Math.max(180, step * 2.4);

    const rx = Math.max(14, Math.min(28, cardW * 0.12));
    const padX = Math.max(14, cardW * 0.07);

    tabs.forEach((g, i) => {
      gsap.set(g, { x: i * (step + GAP) });

      const rect = g.querySelector("rect");
      if (rect) {
        rect.setAttribute("width", String(cardW));
        rect.setAttribute("height", String(RECT_H));
        rect.setAttribute("rx", String(rx));
        rect.setAttribute("y", String(RECT_Y));
      }

      const text = g.querySelector("text");
      if (text) {
        text.setAttribute("x", String(padX));
        text.setAttribute("y", String(LABEL_Y));
      }
    });
  }

  fitToWrap();
  window.addEventListener("resize", fitToWrap, { passive: true });

  function onMove(e) {
    const p = cursorPoint(e);

    // Only react inside the mask area (so no "empty space" control)
    if (p.y < 0 || p.y > MASK_H) {
      mousePos.x = -9999;
      mousePos.y = -9999;
      return;
    }

    mousePos.x = p.x;
    mousePos.y = p.y;
  }

  mainSVG.addEventListener("pointermove", onMove);
  mainSVG.addEventListener("pointerleave", () => {
    mousePos.x = -9999;
    mousePos.y = -9999;
  });

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function mapOpacity(dist) {
    const max = Math.max(1, visibleArea.value);
    const t = clamp01(dist / max);
    return 1 - t; // near = 1, far = 0
  }

  function mapPosY(dist) {
    const max = Math.max(1, visibleArea.value);
    const t = clamp01(dist / max);
    // same feel as before, just scaled down for VIEW_H=400
    // near -> smaller Y, far -> larger Y
    return 40 + t * 70; // 40..110
  }

  function update() {
    // if pointer isn't inside mask, keep tabs at "far" state
    const inactive = mousePos.x < -1000;

    tabs.forEach((g) => {
      const gx = gsap.getProperty(g, "x");
      const centerX = gx + cardW * 0.5;

      const dist = inactive ? visibleArea.value : Math.abs(centerX - mousePos.x);

      gsap.to(g, { y: mapPosY(dist), duration: 0.22, overwrite: true });

      const label = g.querySelector("text");
      if (label) gsap.to(label, { opacity: mapOpacity(dist), duration: 0.22, overwrite: true });
    });
  }

  gsap.ticker.add(update);
})();
