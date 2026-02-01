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


// =========================================== HERO TV: typed text + buttons + silver mirror ===========================================
(function () {
  const hero = document.querySelector(".hero-tv");
  if (!hero) return;

  const typedEl = document.getElementById("heroTyped");
  const mirror = hero.querySelector(".silver-mirror");
  const showreelBtn = hero.querySelector("[data-hero-showreel]");
  const tvVideo = document.getElementById("tvHeroVideo");

  // --- liquid mirror pointer highlight ---
  function setMirrorVars(clientX, clientY){
    if (!mirror) return;
    const r = hero.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    mirror.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
    mirror.style.setProperty("--my", (y * 100).toFixed(2) + "%");
  }

  // defaults (so it looks alive even без движения мыши)
  setMirrorVars(window.innerWidth * 0.55, window.innerHeight * 0.45);

  hero.addEventListener("mousemove", (e) => setMirrorVars(e.clientX, e.clientY), { passive: true });
  hero.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (t) setMirrorVars(t.clientX, t.clientY);
  }, { passive: true });

  // --- showreel button: включаем звук и play ---
  if (showreelBtn && tvVideo) {
    showreelBtn.addEventListener("click", async () => {
      try {
        tvVideo.muted = false;
        await tvVideo.play();
      } catch (e) {
        // если браузер не дал авто-play со звуком — оставим play без обещаний
        try { tvVideo.muted = true; await tvVideo.play(); } catch (_) {}
      }
    });
  }

  // --- typed text ---
  if (!typedEl) return;

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const phrases = [
    "Подкаст под ключ",
    "Имиджевый ролик",
    "Реклама",
    "Видео-отчет о мероприятии",
    "Многокамерная трансляция",
    "Монтаж",
    "AI проекты",
    "Фото проекты",
  ];

  if (prefersReduced) {
    let i = 0;
    typedEl.textContent = phrases[i];
    setInterval(() => {
      i = (i + 1) % phrases.length;
      typedEl.textContent = phrases[i];
    }, 2200);
    return;
  }

  let p = 0;
  let c = 0;
  let deleting = false;

  const TYPE_SPEED = 36;
  const DELETE_SPEED = 22;
  const HOLD_MS = 900;

  function tick() {
    const text = phrases[p];
    if (!deleting) {
      c++;
      typedEl.textContent = text.slice(0, c);
      if (c >= text.length) {
        deleting = true;
        setTimeout(tick, HOLD_MS);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      c--;
      typedEl.textContent = text.slice(0, Math.max(0, c));
      if (c <= 0) {
        deleting = false;
        p = (p + 1) % phrases.length;
        setTimeout(tick, 220);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  }

  tick();
})();
