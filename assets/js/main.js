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


/* ================================
   HERO TV UX v2
   - Typewriter services list
   - "Showreel" button starts hero video
   - Pointer-driven liquid mirror highlight
================================ */
(() => {
  const hero = document.querySelector(".liquid-hero.hero-tv");
  if (!hero) return;

  // ---- Liquid mirror highlight (CSS vars) ----
  let targetX = 0.5, targetY = 0.45;
  let raf = 0;

  const setVars = () => {
    raf = 0;
    hero.style.setProperty("--mx", (targetX * 100).toFixed(2) + "%");
    hero.style.setProperty("--my", (targetY * 100).toFixed(2) + "%");
  };

  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    targetX = Math.min(1, Math.max(0, x));
    targetY = Math.min(1, Math.max(0, y));
    if (!raf) raf = requestAnimationFrame(setVars);
  };

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerdown", onMove, { passive: true });

  // ---- Typewriter ----
  const el = document.getElementById("heroTyped");
  if (el) {
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

    let p = 0;
    let i = 0;
    let dir = 1; // 1 typing, -1 deleting
    let hold = 0;

    const step = () => {
      const current = phrases[p];

      if (hold > 0) {
        hold -= 1;
        return setTimeout(step, 40);
      }

      i += dir;

      if (i <= 0) {
        i = 0;
        dir = 1;
        p = (p + 1) % phrases.length;
        hold = 6;
      }

      if (i >= current.length) {
        i = current.length;
        dir = -1;
        hold = 22; // pause on full phrase
      }

      el.textContent = current.slice(0, i);

      const speed =
        dir === 1 ? (i < 4 ? 70 : 45) : 28;

      setTimeout(step, speed);
    };

    step();
  }

  // ---- Showreel button ----
  const btn = hero.querySelector("[data-hero-showreel]");
  const video = document.getElementById("tvHeroVideo");
  if (btn && video) {
    btn.addEventListener("click", async () => {
      try {
        video.muted = false;
        video.volume = 1;
        await video.play();
      } catch (e) {
        // If autoplay policy blocks, try muted play as fallback
        try {
          video.muted = true;
          await video.play();
        } catch (_) {}
      }
    });
  }
})();
