/* Project page interactions (v3):
   - liquid background
   - horizontal scroll by wheel anywhere + drag
   - toggle body.on-dark when end block is visible (to restyle top button)
*/
(() => {
  const liquidEl = document.getElementById("projectLiquid");
  const track = document.getElementById("projTrack");
  const endSlide = document.querySelector(".proj-slide--end");

  function initLiquid() {
    if (!liquidEl) return;
    if (!window.THREE || !window.LiquidApp) return;
    if (liquidEl.__liquid) return;
    liquidEl.__liquid = new LiquidApp(liquidEl);
  }

  function initVideoAutoplay() {
    const v = document.querySelector("video[data-autoplay]");
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;

    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();
  }

  function updateDarkMode() {
    if (!endSlide) return;
    const r = endSlide.getBoundingClientRect();
    // If any part of the end slide is under the viewport, consider it "dark"
    const visible = r.left < window.innerWidth && r.right > 0;
    document.body.classList.toggle("on-dark", visible);
  }

  function initScroll() {
    if (!track) return;

    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) return; // allow zoom
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if (["input","textarea","select"].includes(tag)) return;

        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollLeft += e.deltaY;
          e.preventDefault();
          updateDarkMode();
        }
      },
      { passive: false }
    );

    // drag to scroll
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
      updateDarkMode();
    });

    track.addEventListener("pointerup", () => (isDown = false));
    track.addEventListener("pointercancel", () => (isDown = false));

    // also update on native scroll (touchpad horizontal)
    track.addEventListener("scroll", updateDarkMode, { passive: true });

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { track.scrollLeft += 120; updateDarkMode(); }
      if (e.key === "ArrowLeft")  { track.scrollLeft -= 120; updateDarkMode(); }
    });

    window.addEventListener("resize", updateDarkMode, { passive: true });
    updateDarkMode();
  }

  window.addEventListener("load", () => {
    initLiquid();
    initScroll();
    initVideoAutoplay();
  });
})();
