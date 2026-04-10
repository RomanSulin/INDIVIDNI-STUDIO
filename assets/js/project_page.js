(() => {
  const MOBILE_QUERY = "(max-width: 900px)";

  function isMobileViewport() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function ensureProjectClass() {
    if (document.body) {
      document.body.classList.add("project-page");
    }
  }

  function updateDarkMode() {
    /* disabled: keep project pages white */
  }

  function initVideo() {
    const video = document.querySelector("video[data-autoplay]");
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      tryPlay();
      return;
    }

    video.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();
  }

  function initScroll() {
    const track = document.getElementById("projTrack");
    if (!track) return;

    window.addEventListener(
      "wheel",
      (event) => {
        if (isMobileViewport()) return;
        if (event.ctrlKey) return;
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

        track.scrollLeft += event.deltaY;
        event.preventDefault();
        updateDarkMode();
      },
      { passive: false }
    );

    let isPointerDown = false;
    let startX = 0;
    let startLeft = 0;

    track.addEventListener("pointerdown", (event) => {
      if (isMobileViewport()) return;

      isPointerDown = true;
      startX = event.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener("pointermove", (event) => {
      if (isMobileViewport() || !isPointerDown) return;

      track.scrollLeft = startLeft - (event.clientX - startX);
      updateDarkMode();
    });

    track.addEventListener("pointerup", () => {
      isPointerDown = false;
    });

    track.addEventListener("pointercancel", () => {
      isPointerDown = false;
    });

    track.addEventListener("scroll", updateDarkMode, { passive: true });
    window.addEventListener("resize", updateDarkMode, { passive: true });
    updateDarkMode();
  }

  function moveBriefButtonToBody() {
    if (isMobileViewport()) return;

    const briefButton = document.querySelector(".proj-brief");
    if (!briefButton || briefButton.dataset.movedToBody === "1") return;

    document.body.appendChild(briefButton);
    briefButton.dataset.movedToBody = "1";

    Object.assign(briefButton.style, {
      position: "fixed",
      top: "18px",
      right: "28px",
      zIndex: "2147483647",
    });
  }

  function findFirstPhotoSlide(introSlide) {
    let current = introSlide ? introSlide.nextElementSibling : null;

    while (current) {
      const isMediaSlide = current.matches(".proj-slide.proj-media");
      const hasAutoplayVideo = Boolean(current.querySelector("video[data-autoplay]"));

      if (isMediaSlide && !hasAutoplayVideo) {
        return current;
      }

      current = current.nextElementSibling;
    }

    return null;
  }

  function applyMobileIntroLayout() {
    if (!isMobileViewport()) return;

    const introSlide = document.querySelector(".proj-slide.proj-intro");
    const introLeft = introSlide?.querySelector(".proj-intro__left");
    if (!introLeft || introLeft.dataset.mobileLayoutApplied === "1") return;

    const firstText = introLeft.querySelector(".proj-text");
    const meta = introLeft.querySelector(".proj-meta");
    const cta = introLeft.querySelector(".proj-cta");
    const videoSlide =
      document.querySelector('.proj-slide.proj-media[aria-label="Video"]') ||
      document.querySelector("video[data-autoplay]")?.closest(".proj-slide");
    const photoSlide = findFirstPhotoSlide(introSlide);

    const videoMedia = videoSlide?.querySelector(".media-169");
    const photoMedia = photoSlide?.querySelector(".media-169");

    if (!firstText || !meta || !cta || !videoMedia || !photoMedia) return;

    introLeft.dataset.mobileLayoutApplied = "1";

    firstText.insertAdjacentElement("afterend", videoMedia);

    const secondBlock = document.createElement("div");
    secondBlock.className = "proj-second";
    videoMedia.insertAdjacentElement("afterend", secondBlock);

    secondBlock.appendChild(meta);
    secondBlock.appendChild(cta);
    secondBlock.insertAdjacentElement("afterend", photoMedia);

    videoSlide?.remove();
    photoSlide?.remove();
  }

  function initProjectPage() {
    ensureProjectClass();
    applyMobileIntroLayout();
    moveBriefButtonToBody();
    initScroll();
    initVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProjectPage, { once: true });
  } else {
    initProjectPage();
  }
})();
