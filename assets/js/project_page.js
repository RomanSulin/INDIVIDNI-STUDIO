(() => {
  const track = document.getElementById("projTrack");
  const endSlide = document.querySelector(".proj-slide--end");
  const v = document.querySelector("video[data-autoplay]");
  const isMobile = window.matchMedia("(max-width: 900px)").matches;

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
    v.loop = true;

    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();
  }

  function initScroll(){
    if (!track) return;

    window.addEventListener("wheel", (e) => {
      if (isMobile) return;
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
        updateDarkMode();
      }
    }, { passive: false });

    let down = false, startX = 0, startLeft = 0;
    track.addEventListener("pointerdown", (e) => {
      if (isMobile) return;
      down = true;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", (e) => {
      if (isMobile) return;
      if (!down) return;
      track.scrollLeft = startLeft - (e.clientX - startX);
      updateDarkMode();
    });
    track.addEventListener("pointerup", () => down = false);
    track.addEventListener("pointercancel", () => down = false);

    track.addEventListener("scroll", updateDarkMode, { passive: true });
    window.addEventListener("resize", updateDarkMode, { passive: true });
    updateDarkMode();
  }

  window.addEventListener("load", () => {
    initScroll();
    initVideo();
  });

  // --- FORCE: move "К БРИФУ" button to <body> so it can't be hidden by end panel ---
window.addEventListener("load", () => {
  if (window.matchMedia("(max-width: 900px)").matches) return;
  const brief = document.querySelector(".proj-brief");
  if (!brief) return;

  // move to body (break out of any transformed stacking contexts)
  document.body.appendChild(brief);

  // hard-fix layering + position
  Object.assign(brief.style, {
    position: "fixed",
    top: "18px",
    right: "28px",
    zIndex: "2147483647"
  });
});
  
  // ===== Mobile-only: Intro layout (text -> photo -> second text) ==============================================================================================================
  function applyMobileIntroLayout() {
    if (!window.matchMedia("(max-width: 900px)").matches) return;

    const introLeft = document.querySelector(".proj-slide.proj-intro .proj-intro__left");
    if (!introLeft) return;

    const firstText = introLeft.querySelector(".proj-text");
    if (!firstText) return;

    const meta = introLeft.querySelector(".proj-meta");   // "второй текст"
    const cta  = introLeft.querySelector(".proj-cta");    // твоя кнопка "Рассчитать проект"

    // берем "первое фото" с первого фото-слайда (обычно Photo 02)
    const photoSlide =
      document.querySelector('.proj-slide.proj-media[aria-label="Photo 02"]') ||
      document.querySelector('.proj-slide.proj-media img[src*="/assets/project/1/2.jpg"]')?.closest(".proj-slide");

    if (!photoSlide) return;

    const media = photoSlide.querySelector(".media-169");
    if (!media) return;

    // вставляем фото сразу после первого текста
    firstText.insertAdjacentElement("afterend", media);

    // второй текст (meta + cta) переносим ниже фото, в отдельный контейнер
    const second = document.createElement("div");
    second.className = "proj-second";
    media.insertAdjacentElement("afterend", second);

    if (meta) second.appendChild(meta);
    if (cta) second.appendChild(cta);

    // убираем пустой фото-слайд, чтобы дальше шло видео и остальные как были
    photoSlide.remove();
  }

  // вызываем после загрузки
  window.addEventListener("load", applyMobileIntroLayout);

})();

