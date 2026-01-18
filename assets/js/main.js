(function () {
  // year in footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // burger / drawer
  const burger = document.querySelector("[data-burger]");
  if (burger) {
    burger.addEventListener("click", () => {
      document.body.classList.toggle("menu-open");
    });
  }

  // accordion (single open)
  const acc = document.querySelector("[data-accordion]");
  if (!acc) return;

  const items = Array.from(acc.querySelectorAll("[data-acc-item]"));

  function closeItem(item) {
    const btn = item.querySelector(".acc-btn");
    const panel = item.querySelector("[data-acc-panel]");
    item.removeAttribute("data-open");
    btn.setAttribute("aria-expanded", "false");
    panel.style.height = panel.scrollHeight + "px";
    requestAnimationFrame(() => { panel.style.height = "0px"; });
  }

  function openItem(item) {
    const btn = item.querySelector(".acc-btn");
    const panel = item.querySelector("[data-acc-panel]");
    item.setAttribute("data-open", "");
    btn.setAttribute("aria-expanded", "true");
    panel.style.height = panel.scrollHeight + "px";

    panel.addEventListener("transitionend", function te(e) {
      if (e.propertyName === "height" && item.hasAttribute("data-open")) {
        panel.style.height = "auto";
        panel.removeEventListener("transitionend", te);
      }
    });
  }

  // init closed panels
  items.forEach((item) => {
    const panel = item.querySelector("[data-acc-panel]");
    if (!item.hasAttribute("data-open")) panel.style.height = "0px";
  });

  // click handlers
  items.forEach((item) => {
    const btn = item.querySelector(".acc-btn");
    btn.addEventListener("click", () => {
      const isOpen = item.hasAttribute("data-open");
      items.forEach((it) => { if (it !== item && it.hasAttribute("data-open")) closeItem(it); });
      if (isOpen) closeItem(item); else openItem(item);
    });
  });
})();

// =========================================== SHOWREEL Laptop: open/close on scroll + play/pause + sound =================================================================

(function () {
  const section = document.querySelector("[data-sr]");
  if (!section) return;

  const video = section.querySelector("[data-sr-video]");
  const btn = section.querySelector("[data-sr-sound]");
  if (!video || !btn) return;

  video.muted = true;

  function syncBtn() {
    const on = !video.muted;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Выключить звук" : "Включить звук");
  }

  btn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
    syncBtn();
  });

  syncBtn();

  // точнее чем IntersectionObserver для sticky-сцен:
  let raf = null;
  function updatePlayback() {
    raf = null;
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;

    // "в блоке" если середина экрана находится внутри секции
    const mid = vh * 0.5;
    const inSection = r.top < mid && r.bottom > mid;

    if (inSection) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function requestUpdate() {
    if (raf) return;
    raf = requestAnimationFrame(updatePlayback);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  updatePlayback();
})();
