/* Project page interactions:
   - liquid background (same as first block)
   - horizontal scroll by wheel + drag
*/
(() => {
  const liquidEl = document.getElementById("projectLiquid");
  // init liquid background
  function initLiquid() {
    if (!liquidEl) return;
    if (!window.THREE || !window.LiquidApp) return;

    // avoid double init
    if (liquidEl.__liquid) return;
    liquidEl.__liquid = new LiquidApp(liquidEl);
  }

  // Horizontal scroll track
  const track = document.getElementById("projTrack");

  function initScroll() {
    if (!track) return;

    // wheel -> horizontal
    track.addEventListener(
      "wheel",
      (e) => {
        // let touchpads horizontal pass through
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // drag to scroll (mouse)
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

  // liquid.js is deferred; wait a tick
  window.addEventListener("load", () => {
    initLiquid();
    initScroll();
  });
})();
