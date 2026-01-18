/* =========================
   INDIVIDNI — main.js
   ========================= */

// ---------- helpers ----------
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- year ----------
(() => {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

// ---------- reveal (data-reveal -> .is-visible) ----------
(() => {
  const els = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.15 }
  );

  els.forEach((el) => io.observe(el));
})();

// ---------- split text (chars/words) ----------
(() => {
  const targets = Array.from(document.querySelectorAll(".split[data-split]"));
  if (!targets.length) return;

  function split(el, mode) {
    const text = (el.textContent || "").trim();
    el.textContent = "";

    const parts = mode === "chars" ? [...text] : text.split(/\s+/);
    parts.forEach((p, i) => {
      const s = document.createElement("span");
      s.textContent = mode === "chars" ? p : p + (i < parts.length - 1 ? " " : "");
      // initial state
      s.style.opacity = "0";
      s.style.transform = "translateY(10px)";
      // stagger
      const d = i * (mode === "chars" ? 12 : 28);
      s.style.transition = `opacity .55s ease ${d}ms, transform .55s ease ${d}ms`;
      el.appendChild(s);
    });
  }

  targets.forEach((el) => split(el, el.getAttribute("data-split")));

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.querySelectorAll("span").forEach((s) => {
          s.style.opacity = "1";
          s.style.transform = "translateY(0)";
        });
        io.unobserve(e.target);
      }
    },
    { threshold: 0.45 }
  );

  targets.forEach((el) => io.observe(el));
})();

// ---------- mobile menu (black dropdown) ----------
(() => {
  const burger = document.getElementById("burger");
  const mnav = document.getElementById("mnav");
  const closeBtn = document.getElementById("mnavClose");
  const backdrop = document.getElementById("mnavBackdrop");

  if (!burger || !mnav) return;

  const open = () => {
    mnav.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    mnav.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    mnav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    mnav.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

  burger.addEventListener("click", () => {
    mnav.classList.contains("is-open") ? close() : open();
  });

  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  mnav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();

// ---------- hero cover tilt (mousemove parallax) ----------
(() => {
  const cover = document.getElementById("cover");
  if (!cover) return;

  // no tilt on touch devices by default
  const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!canTilt) return;

  let targetRX = 0, targetRY = 0;
  let rx = 0, ry = 0;

  let targetMX = 50, targetMY = 40;
  let mx = 50, my = 40;

  function onMove(x, y) {
    const r = cover.getBoundingClientRect();
    const px = clamp((x - r.left) / r.width, 0, 1);
    const py = clamp((y - r.top) / r.height, 0, 1);

    // rotate bounds
    targetRY = lerp(-10, 10, px);
    targetRX = lerp(8, -8, py);

    targetMX = px * 100;
    targetMY = py * 100;
  }

  cover.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  cover.addEventListener("mouseleave", () => {
    targetRX = 0; targetRY = 0;
    targetMX = 50; targetMY = 40;
  });

  function tick() {
    rx = lerp(rx, targetRX, 0.08);
    ry = lerp(ry, targetRY, 0.08);
    mx = lerp(mx, targetMX, 0.08);
    my = lerp(my, targetMY, 0.08);

    cover.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    cover.style.setProperty("--mx", `${mx}%`);
    cover.style.setProperty("--my", `${my}%`);

    requestAnimationFrame(tick);
  }
  tick();
})();

// ---------- showreel: scroll transition + autoplay + sound toggle + stop on leave ----------
(() => {
  const stage = document.getElementById("reelStage");
  const frame = document.getElementById("reelFrame");
  const video = document.getElementById("showreelVideo");
  const btn = document.getElementById("soundToggle");

  if (!stage || !frame || !video) return;

  let userSound = false;

  function setSoundUI() {
    if (!btn) return;
    const icon = btn.querySelector(".reelBtn__icon");
    if (icon) icon.textContent = userSound ? "🔊" : "🔇";
    btn.setAttribute("aria-label", userSound ? "Выключить звук" : "Включить звук");
  }
  setSoundUI();

  btn?.addEventListener("click", () => {
    userSound = !userSound;
    video.muted = !userSound; // unmute only after user interaction
    setSoundUI();
    video.play().catch(() => {});
  });

  // play/pause/reset on section visibility
  const visIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.target !== stage) continue;

        if (e.isIntersecting) {
          video.muted = !userSound;
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0; // stop when leaving showreel
        }
      }
    },
    { threshold: 0.25 }
  );
  visIo.observe(stage);

  // scroll-driven transform -> CSS vars used in CSS
  let ticking = false;

  function update() {
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight || 800;

    // progress through the scroll-playground
    // 0 when stage top hits ~70% of viewport, 1 when stage bottom hits ~30%
    const start = vh * 0.70;
    const end = vh * 0.30;
    const t = clamp((start - r.top) / (r.height - (end - start)), 0, 1);

    // “turn into background”: scale a bit, reduce radius, slight lift
    const scale = lerp(0.96, 1.06, t);
    const radius = lerp(22, 0, t);
    const y = lerp(14, -10, t);

    frame.style.setProperty("--reelScale", scale.toFixed(4));
    frame.style.setProperty("--reelRadius", `${radius.toFixed(2)}px`);
    frame.style.setProperty("--reelY", `${y.toFixed(2)}px`);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// ---------- optional: case videos hover play (desktop) ----------
(() => {
  const hoverOk = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!hoverOk) return;

  const vids = Array.from(document.querySelectorAll(".caseBig__video, .caseCard__video"));
  vids.forEach((v) => {
    const card = v.closest(".caseBig, .caseCard");
    if (!card) return;

    card.addEventListener("mouseenter", () => v.play().catch(() => {}));
    card.addEventListener("mouseleave", () => {
      v.pause();
      v.currentTime = 0;
    });
  });
})();
