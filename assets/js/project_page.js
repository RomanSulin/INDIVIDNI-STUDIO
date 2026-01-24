/* Project page — FINAL
   - wheel -> horizontal (no snap)
   - drag to scroll
   - autoplay muted video
   - toggles body.on-dark when end slide is in view (for brief button styling)
*/
(() => {
  const track = document.getElementById("projTrack");
  const endSlide = document.querySelector(".proj-slide--end");
  const v = document.querySelector("video[data-autoplay]");

  function updateDarkMode(){
    if (!endSlide) return;
    const r = endSlide.getBoundingClientRect();
    const visible = r.left < window.innerWidth && r.right > 0;
    document.body.classList.toggle("on-dark", visible);
  }

  function initVideo(){
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();
  }

  function initScroll(){
    if (!track) return;

    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey) return; // allow zoom
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
        updateDarkMode();
      }
    }, { passive: false });

    let down = false, startX = 0, startLeft = 0;
    track.addEventListener("pointerdown", (e) => {
      down = true;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", (e) => {
      if (!down) return;
      track.scrollLeft = startLeft - (e.clientX - startX);
      updateDarkMode();
    });
    track.addEventListener("pointerup", () => (down = false));
    track.addEventListener("pointercancel", () => (down = false));

    track.addEventListener("scroll", updateDarkMode, { passive: true });
    window.addEventListener("resize", updateDarkMode, { passive: true });
    updateDarkMode();
  }

  window.addEventListener("load", () => {
    initScroll();
    initVideo();
  });
})();
