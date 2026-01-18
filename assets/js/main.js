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
  const section = document.querySelector("[data-showreel]");
  if (!section) return;

  const laptop = section.querySelector("[data-laptop]");
  const lid = section.querySelector("[data-lid]");
  const video = section.querySelector("[data-showreel-video]");
  const btn = section.querySelector("[data-sound-toggle]");
  if (!laptop || !lid || !video || !btn) return;

  // autoplay policy
  video.muted = true;

  function updateBtn() {
    const on = !video.muted;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Выключить звук" : "Включить звук");
  }

  btn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
    updateBtn();
  });
  updateBtn();

  // play/pause when section in/out of view (keeps currentTime)
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.35 }
  );
  io.observe(section);

  // scroll-driven open/close
  let raf = null;

  function clamp01(x){ return Math.min(1, Math.max(0, x)); }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function render() {
    raf = null;

    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height - vh;
    const scrolled = clamp01(total <= 0 ? 1 : (-r.top / total));
    const t = easeOutCubic(scrolled);

    // lid angle: closed -> open
    // 18deg (почти закрыт) => 102deg (открыт)
    const angle = 18 + (102 - 18) * t;
    // scale: smaller -> bigger
    const scale = 0.76 + (1.02 - 0.76) * t;

    laptop.style.setProperty("--lid", `${angle}deg`);
    laptop.style.setProperty("--scale", `${scale}`);
  }

  function requestRender() {
    if (raf) return;
    raf = requestAnimationFrame(render);
  }

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", () => render(), { passive: true });

  render();
})();
