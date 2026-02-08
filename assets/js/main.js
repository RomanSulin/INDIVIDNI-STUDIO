(() => {
  // year in footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // burger / drawer
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");

  if (burger) {
    burger.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.classList.toggle("menu-open");
    });
  }

  // brand click -> scroll to top
  const brand = document.querySelector(".brand");
  if (brand) {
    brand.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.remove("menu-open");
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "#top");
    });
  }

  // close menu on outside click + ESC
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("menu-open")) return;
    const clickedBurger = e.target.closest("[data-burger]");
    const clickedDrawer = e.target.closest("[data-drawer]");
    if (!clickedBurger && !clickedDrawer) document.body.classList.remove("menu-open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.body.classList.remove("menu-open");
  });

  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("a")) document.body.classList.remove("menu-open");
    });
  }

  // smooth scroll for hash links
  function scrollToHash(hash) {
    const id = hash.replace("#", "");
    const target = document.getElementById(id);
    if (!target) return;

    const header = document.querySelector(".header");
    const headerH = header ? header.getBoundingClientRect().height + 18 : 0;
    const r = target.getBoundingClientRect();
    const top = window.scrollY + r.top - headerH;

    window.scrollTo({ top, behavior: "smooth" });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href === "#") return;

    e.preventDefault();
    document.body.classList.remove("menu-open");
    history.replaceState(null, "", href);
    scrollToHash(href);
  });

  // reveal animations
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // accordions (multiple; single-open per accordion)
  const accordions = Array.from(document.querySelectorAll("[data-accordion]"));
  accordions.forEach((acc) => {
    const items = Array.from(acc.querySelectorAll("[data-acc-item]"));

    function closeItem(item) {
      const btn = item.querySelector(".acc-btn");
      const panel = item.querySelector("[data-acc-panel]");
      if (!btn || !panel) return;

      item.removeAttribute("data-open");
      btn.setAttribute("aria-expanded", "false");

      panel.style.height = panel.scrollHeight + "px";
      requestAnimationFrame(() => { panel.style.height = "0px"; });
    }

    function openItem(item) {
      const btn = item.querySelector(".acc-btn");
      const panel = item.querySelector("[data-acc-panel]");
      if (!btn || !panel) return;

      item.setAttribute("data-open", "");
      btn.setAttribute("aria-expanded", "true");
      panel.style.height = panel.scrollHeight + "px";

      panel.addEventListener("transitionend", function te(ev) {
        if (ev.propertyName === "height" && item.hasAttribute("data-open")) {
          panel.style.height = "auto";
          panel.removeEventListener("transitionend", te);
        }
      });
    }

    // init closed panels
    items.forEach((item) => {
      const panel = item.querySelector("[data-acc-panel]");
      if (!panel) return;
      if (!item.hasAttribute("data-open")) panel.style.height = "0px";
      else panel.style.height = "auto";
    });

    items.forEach((item) => {
      const btn = item.querySelector(".acc-btn");
      if (!btn) return;

      btn.addEventListener("click", () => {
        const isOpen = item.hasAttribute("data-open");
        items.forEach((it) => { if (it !== item && it.hasAttribute("data-open")) closeItem(it); });
        if (isOpen) closeItem(item); else openItem(item);
      });
    });
  });

  // process preview (hover/click -> swap image)
  const process = document.querySelector("[data-process]");
  if (process) {
    const previewImg = process.querySelector("[data-process-preview]");
    const steps = Array.from(process.querySelectorAll("[data-step]"));

    const setActive = (step) => {
      steps.forEach((s) => s.classList.toggle("is-active", s === step));
      const img = step.getAttribute("data-img");
      if (previewImg && img) previewImg.src = img;
    };

    steps.forEach((step) => {
      const btn = step.querySelector(".step-btn");
      if (!btn) return;

      btn.addEventListener("mouseenter", () => setActive(step));
      btn.addEventListener("focus", () => setActive(step));
      btn.addEventListener("click", () => setActive(step));
    });
  }

  // contact form -> mailto (simple; can be replaced with backend)
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const contact = String(fd.get("contact") || "").trim();
      const msg = String(fd.get("message") || "").trim();

      const subject = encodeURIComponent(`Заявка INDIVIDNI — ${name || "без имени"}`);
      const body = encodeURIComponent(
        `Имя: ${name}\nКонтакт: ${contact}\n\nЗадача:\n${msg}\n\n— отправлено с сайта`
      );

      window.location.href = `mailto:hello@individnistudio.ru?subject=${subject}&body=${body}`;
      form.reset();
    });
  }

  // page transition stinger for links with data-stinger (non-hash only)
  const stinger = document.querySelector("[data-stinger].page-stinger") || document.querySelector(".page-stinger");
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function runStingerThenNavigate(href) {
    if (!stinger || prefersReduced) {
      window.location.href = href;
      return;
    }
    stinger.classList.remove("is-active");
    // force reflow to restart animation
    void stinger.offsetWidth;
    stinger.classList.add("is-active");
    window.setTimeout(() => { window.location.href = href; }, 220);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-stinger]");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#")) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // external links: keep normal behavior
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) return;

    e.preventDefault();
    runStingerThenNavigate(href);
  });
})();

// =========================================== SHOWREEL Laptop: open/close on scroll + play/pause + sound =================================================================
(() => {
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

// ============================= HERO TV: typed + buttons (does NOT touch tv_hero.js) =============================
(() => {
  const el = document.getElementById("heroTyped");
  if (!el) return;

  const heroTypedPhrases = [
    "Подкаст под ключ",
    "Имиджевый ролик",
    "Реклама",
    "Видео-отчет о мероприятии",
    "Многокамерная трансляция",
    "Монтаж",
    "AI проекты",
    "Фото проекты",
  ];

  let p = 0, i = 0, del = false;

  const TYPE = 42;
  const DEL = 26;
  const HOLD_FULL = 900;
  const HOLD_EMPTY = 240;

  function tick() {
    const s = heroTypedPhrases[p];
    if (!del) {
      i = Math.min(i + 1, s.length);
      el.textContent = s.slice(0, i);
      if (i === s.length) { del = true; return setTimeout(tick, HOLD_FULL); }
      return setTimeout(tick, TYPE);
    } else {
      i = Math.max(i - 1, 0);
      el.textContent = s.slice(0, i);
      if (i === 0) { del = false; p = (p + 1) % heroTypedPhrases.length; return setTimeout(tick, HOLD_EMPTY); }
      return setTimeout(tick, DEL);
    }
  }
  tick();
})();

(() => {
  const btn = document.getElementById("btnShowreel");
  const video = document.getElementById("tvHeroVideo");
  if (!btn || !video) return;

  btn.addEventListener("click", async () => {
    try {
      video.muted = false;
      video.volume = 1;
      await video.play();
    } catch (e) {
      // ignore autoplay errors
    }
  });
})();
