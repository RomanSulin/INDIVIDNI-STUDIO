/* Project page interactions (v2):
   - liquid background (same as first block)
   - horizontal scroll by wheel anywhere + drag
   - keep position exactly where you scroll (no snapping)
*/
(() => {
  const liquidEl = document.getElementById("projectLiquid");
  const track = document.getElementById("projTrack");

  function initLiquid() {
    if (!liquidEl) return;
    if (!window.THREE || !window.LiquidApp) return;
    if (liquidEl.__liquid) return;
    liquidEl.__liquid = new LiquidApp(liquidEl);
  }

  function initVideoAutoplay() {
    const v = document.querySelector("video[data-autoplay]");
    if (!v) return;
    // ensure muted autoplay
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    // try play after a tick
    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();
  }

  function initScroll() {
    if (!track) return;

    // wheel anywhere -> horizontal
    window.addEventListener(
      "wheel",
      (e) => {
        // allow pinch-zoom / ctrl wheel
        if (e.ctrlKey) return;

        // don't hijack when over form elements
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if (["input","textarea","select"].includes(tag)) return;

        // if user scrolls vertically, convert to horizontal
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // drag to scroll (mouse/touch)
    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    track.addEventListener("pointerdown", (e) => {
      isDown = true;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startLeft - dx;
    });

    track.addEventListener("pointerup", () => (isDown = false));
    track.addEventListener("pointercancel", () => (isDown = false));

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") track.scrollLeft += 120;
      if (e.key === "ArrowLeft") track.scrollLeft -= 120;
    });
  }

  window.addEventListener("load", () => {
    initLiquid();
    initScroll();
    initVideoAutoplay();
  });
})();
