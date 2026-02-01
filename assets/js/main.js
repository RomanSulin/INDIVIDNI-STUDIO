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

// =========================================== HERO: typed line + showreel button + liquid mirror cursor highlight =================
(function () {
  const typed = document.getElementById("heroTyped");
  if (!typed) return;

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

  // --- typewriter
  let pi = 0;
  let ci = 0;
  let deleting = false;
  let hold = 0;

  function tick() {
    const word = phrases[pi % phrases.length];

    if (hold > 0) {
      hold -= 1;
      setTimeout(tick, 50);
      return;
    }

    if (!deleting) {
      ci = Math.min(ci + 1, word.length);
      typed.textContent = word.slice(0, ci);
      if (ci >= word.length) {
        deleting = true;
        hold = 24; // ~1.2s
      }
      setTimeout(tick, 38);
    } else {
      ci = Math.max(ci - 1, 0);
      typed.textContent = word.slice(0, ci);
      if (ci <= 0) {
        deleting = false;
        pi += 1;
        hold = 6;
      }
      setTimeout(tick, 22);
    }
  }
  tick();

  // --- "Шоурил" button: unmute + play hero TV video (no changes to the TV engine)
  const showBtn = document.querySelector("[data-hero-showreel]");
  const heroVideo = document.getElementById("tvHeroVideo");

  if (showBtn && heroVideo) {
    showBtn.addEventListener("click", () => {
      try {
        heroVideo.muted = false;
        heroVideo.volume = 1;
        heroVideo.play().catch(() => {});
      } catch (_) {}

      // small UI feedback
      showBtn.classList.add("is-playing");
      window.setTimeout(() => showBtn.classList.remove("is-playing"), 600);
    });
  }

  // --- liquid mirror highlight follows pointer (CSS vars)
  const mirror = document.querySelector(".liquid-mirror");
  const hero = document.querySelector(".hero-tv.liquid-hero") || mirror?.parentElement;
  if (mirror && hero) {
    let raf = 0;
    let mx = 0.55;
    let my = 0.45;

    const apply = () => {
      raf = 0;
      mirror.style.setProperty("--mx", (mx * 100).toFixed(2) + "%");
      mirror.style.setProperty("--my", (my * 100).toFixed(2) + "%");
    };

    const onMove = (clientX, clientY) => {
      const r = hero.getBoundingClientRect();
      if (!r.width || !r.height) return;
      mx = (clientX - r.left) / r.width;
      my = (clientY - r.top) / r.height;
      mx = Math.min(1, Math.max(0, mx));
      my = Math.min(1, Math.max(0, my));
      if (!raf) raf = requestAnimationFrame(apply);
    };

    hero.addEventListener(
      "pointermove",
      (e) => onMove(e.clientX, e.clientY),
      { passive: true }
    );

    hero.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        onMove(t.clientX, t.clientY);
      },
      { passive: true }
    );

    // init to center-ish
    apply();
  }
})();
