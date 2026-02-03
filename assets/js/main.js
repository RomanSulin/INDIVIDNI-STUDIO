(function () {
  // year in footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // burger / drawer
  const burger = document.querySelector("[data-burger]");
  if (burger) {
    burger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.body.classList.toggle("menu-open");
    });
  }
    // brand click -> scroll to top (reliable on all devices)
  const brand = document.querySelector(".brand");
  if (brand) {
    brand.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.remove("menu-open"); // если меню открыто
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "#top");
    });
  }


  // close menu when clicking outside drawer / burger + ESC
const drawer = document.querySelector("[data-drawer]");

document.addEventListener("click", (e) => {
  if (!document.body.classList.contains("menu-open")) return;

  const clickedBurger = e.target.closest("[data-burger]");
  const clickedDrawer = e.target.closest("[data-drawer]");

  if (!clickedBurger && !clickedDrawer) {
    document.body.classList.remove("menu-open");
  }
});
  

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.body.classList.remove("menu-open");
});

// optional: click on any menu link closes
if (drawer) {
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) document.body.classList.remove("menu-open");
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
  const section = document.querySelector("[data-sr-demo]");
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

  // sticky-сцены лучше детектить через "середина экрана внутри секции"
  let raf = null;
  function update() {
    raf = null;
    const r = section.getBoundingClientRect();
    const mid = window.innerHeight * 0.5;
    const inView = r.top < mid && r.bottom > mid;

    if (inView) video.play().catch(() => {});
    else video.pause();
  }

  function req() { if (!raf) raf = requestAnimationFrame(update); }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req, { passive: true });
  update();
})();


// ========================= HERO: typewriter + buttons =========================
(function () {
  const typedEl = document.getElementById("heroTyped");
  if (typedEl) {
    const phrases = [
      "Подкаст под ключ",
      "Имиджевый ролик",
      "Реклама",
      "Видео-отчет о мероприятии",
      "Многокамерная трансляция",
      "Монтаж",
      "AI проекты",
      "Фото проекты"
    ];

    let i = 0;
    let j = 0;
    let deleting = false;

    const typeSpeed = 42;
    const deleteSpeed = 24;
    const holdMs = 950;

    function tick() {
      const full = phrases[i];

      if (!deleting) {
        j = Math.min(full.length, j + 1);
        typedEl.textContent = full.slice(0, j);
        if (j === full.length) {
          deleting = true;
          setTimeout(tick, holdMs);
          return;
        }
        setTimeout(tick, typeSpeed);
      } else {
        j = Math.max(0, j - 1);
        typedEl.textContent = full.slice(0, j);
        if (j === 0) {
          deleting = false;
          i = (i + 1) % phrases.length;
          setTimeout(tick, 200);
          return;
        }
        setTimeout(tick, deleteSpeed);
      }
    }

    tick();
  }

  const btn = document.querySelector("[data-hero-showreel]");
  const video = document.getElementById("tvHeroVideo");
  if (btn && video) {
    btn.addEventListener("click", () => {
      try {
        video.muted = false;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}

      const stage = document.querySelector(".hero-tv__stage");
      if (stage) stage.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
})();
