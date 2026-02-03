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


// ===========================================
// HERO TV: typed services + showreel button + parallax tilt (doesn't touch TV internals)
// ===========================================
(function () {
  const typedEl = document.getElementById("heroTyped");
  const showreelBtn = document.querySelector("[data-hero-showreel]");
  const video = document.getElementById("tvHeroVideo");
  const stage = document.querySelector("[data-tv-hero]");
  if (!typedEl || !stage) return;

  // ---- Typewriter ----
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

  let pi = 0;
  let char = 0;
  let dir = 1; // 1 typing, -1 deleting
  let pause = 0;

  function tick() {
    if (!typedEl) return;

    const full = phrases[pi];
    if (pause > 0) { pause--; requestAnimationFrame(tick); return; }

    char += dir * 0.9; // speed
    if (dir === 1) {
      const len = Math.floor(char);
      typedEl.textContent = full.slice(0, len);
      if (len >= full.length) { dir = -1; pause = 70; }
    } else {
      const len = Math.max(0, Math.floor(char));
      typedEl.textContent = full.slice(0, len);
      if (len <= 0) { dir = 1; pi = (pi + 1) % phrases.length; pause = 20; }
    }
    requestAnimationFrame(tick);
  }
  // init
  typedEl.textContent = phrases[0];
  tick();

  // ---- Showreel button ----
  if (showreelBtn && video) {
    showreelBtn.addEventListener("click", () => {
      // try unmute + play (user gesture)
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => {});
    });
  }

  // ---- Parallax tilt ----
  // Create a wrapper to animate without overriding stage positioning/transforms.
  let wrap = stage.querySelector(".tv-hero-parallax");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "tv-hero-parallax";
    // move existing children into wrapper
    const kids = Array.from(stage.childNodes);
    kids.forEach((n) => wrap.appendChild(n));
    stage.appendChild(wrap);
  }

  // Ensure background doesn't eat pointer events
  const bg = document.getElementById("liquid-bg");
  if (bg) bg.style.pointerEvents = "none";

  let mx = 0, my = 0;
  let tx = 0, ty = 0;
  let rx = 0, ry = 0;
  let targetRX = 0, targetRY = 0, targetTX = 0, targetTY = 0;
  let active = false;

  function updateTargets(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (clientX - cx) / (r.width / 2);
    const dy = (clientY - cy) / (r.height / 2);

    const ndx = Math.max(-1, Math.min(1, dx));
    const ndy = Math.max(-1, Math.min(1, dy));

    // tilt
    targetRY = ndx * 14;      // deg
    targetRX = -ndy * 11;     // deg

    // subtle translation
    targetTX = ndx * 26;      // px
    targetTY = ndy * 18;      // px
  }

  function onMove(e) {
    // Only react when hero is visible
    const r = stage.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < window.innerHeight;
    if (!inView) return;

    active = true;
    updateTargets(e.clientX, e.clientY);
  }

  function onLeave() {
    active = false;
    targetRX = 0; targetRY = 0; targetTX = 0; targetTY = 0;
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  window.addEventListener("blur", onLeave);

  // if pointer leaves the viewport, relax
  document.addEventListener("mouseleave", onLeave);

  function animate() {
    // smooth lerp
    rx += (targetRX - rx) * 0.08;
    ry += (targetRY - ry) * 0.08;
    tx += (targetTX - tx) * 0.10;
    ty += (targetTY - ty) * 0.10;

    // apply
    if (wrap) {
      wrap.style.transform =
        `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) ` +
        `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
    requestAnimationFrame(animate);
  }
  animate();
})();
