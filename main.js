/* =====================================================
   INDIVIDNI — Winter ’26 (ref-style)
   main.js
   - overlays (edition/search/mobile)
   - reveal
   - split text
   - tabs
   - cover tilt
   - showreel scroll morph + autoplay + sound toggle + stop on leave
   - simple “search” highlight
   ===================================================== */

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------------------
   Year
--------------------------- */
(() => {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

/* ---------------------------
   Reveal: [data-reveal] -> .is-visible
--------------------------- */
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

/* ---------------------------
   Split text animation: .split[data-split="chars|words"]
--------------------------- */
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
      s.style.opacity = "0";
      s.style.transform = "translateY(10px)";
      const d = i * (mode === "chars" ? 12 : 28);
      s.style.transition = `opacity .6s cubic-bezier(.2,.8,.2,1) ${d}ms, transform .6s cubic-bezier(.2,.8,.2,1) ${d}ms`;
      el.appendChild(s);
    });
  }

  targets.forEach((el) => split(el, el.getAttribute("data-split") || "chars"));

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

/* ---------------------------
   Overlay helper
--------------------------- */
function setupOverlay({ triggerId, overlayId, closeId, backdropId }) {
  const trigger = document.getElementById(triggerId);
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeId);
  const backdrop = document.getElementById(backdropId);

  if (!trigger || !overlay) return null;

  const open = () => {
    overlay.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    overlay.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

  trigger.addEventListener("click", () => {
    overlay.classList.contains("is-open") ? close() : open();
  });

  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return { open, close, overlay, trigger };
}

/* ---------------------------
   Overlays: edition / search / mobile
--------------------------- */
const edition = setupOverlay({
  triggerId: "editionBtn",
  overlayId: "editionMenu",
  closeId: "editionClose",
  backdropId: "editionBackdrop",
});

const search = setupOverlay({
  triggerId: "searchBtn",
  overlayId: "searchOverlay",
  closeId: "searchClose",
  backdropId: "searchBackdrop",
});

const mobile = setupOverlay({
  triggerId: "burger",
  overlayId: "mobileMenu",
  closeId: "mobileClose",
  backdropId: "mobileBackdrop",
});

/* Close mobile overlay after clicking any link */
(() => {
  const overlay = document.getElementById("mobileMenu");
  if (!overlay || !mobile) return;
  overlay.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => mobile.close());
  });
})();

/* ---------------------------
   Tabs: [data-tabs]
--------------------------- */
(() => {
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const tabs = Array.from(root.querySelectorAll(".tabs__tab"));
    const panes = Array.from(root.querySelectorAll(".pane"));

    if (!tabs.length || !panes.length) return;

    const activate = (id) => {
      tabs.forEach((t) => {
        const on = t.dataset.tab === id;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      panes.forEach((p) => p.classList.toggle("is-active", p.dataset.pane === id));
    };

    tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.tab)));
  });
})();

/* ---------------------------
   Cover tilt: #cover (desktop pointer only)
--------------------------- */
(() => {
  const cover = document.getElementById("cover");
  if (!cover) return;

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

    targetRY = lerp(-9, 9, px);
    targetRX = lerp(7, -7, py);

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

/* ---------------------------
   Showreel:
   - scroll morph (CSS vars on #reelFrame)
   - autoplay muted when visible
   - sound toggle
   - stop+reset when leaving section
--------------------------- */
(() => {
  const stage = document.getElementById("reelStage");
  const frame = document.getElementById("reelFrame");
  const video = document.getElementById("showreelVideo");
  const btn = document.getElementById("soundToggle");

  if (!stage || !frame || !video) return;

  let userSound = false;

  const setSoundUI = () => {
    if (!btn) return;
    const icon = btn.querySelector(".reelBtn__icon");
    if (icon) icon.textContent = userSound ? "🔊" : "🔇";
    btn.setAttribute("aria-label", userSound ? "Выключить звук" : "Включить звук");
  };
  setSoundUI();

  btn?.addEventListener("click", () => {
    userSound = !userSound;
    video.muted = !userSound;  // unmute only after click
    setSoundUI();
    video.play().catch(() => {});
  });

  // Visibility handling: play/pause/reset
  const visIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.target !== stage) continue;
        if (e.isIntersecting) {
          video.muted = !userSound;
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    },
    { threshold: 0.25 }
  );
  visIo.observe(stage);

  // Scroll-driven morph
  let ticking = false;

  function updateMorph() {
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight || 800;

    // progress through scroll playground
    // 0 when stage top is near 70% viewport, 1 near 30%
    const start = vh * 0.70;
    const end = vh * 0.30;
    const t = clamp((start - r.top) / (r.height - (end - start)), 0, 1);

    // ref-like: very subtle scale + radius to 0
    const scale = lerp(0.98, 1.04, t);
    const radius = lerp(0, 0, t); // stays square in this ref-style
    const y = lerp(10, -8, t);

    frame.style.setProperty("--reelScale", scale.toFixed(4));
    frame.style.setProperty("--reelRadius", `${radius.toFixed(2)}px`);
    frame.style.setProperty("--reelY", `${y.toFixed(2)}px`);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateMorph();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateMorph();
})();

/* ---------------------------
   Simple Search highlight:
   - looks in headings/titles/case titles
   - adds <mark> around matches
--------------------------- */
(() => {
  const input = document.getElementById("searchInput");
  if (!input) return;

  // targets we highlight in
  const selectors = [
    ".chapterTitle",
    ".chapterDesc",
    ".toc__item",
    ".tabs__tab",
    ".pane__title",
    ".caseTitle",
    ".caseTag",
    ".item__title",
    ".item__text",
    ".priceName",
    ".contactsTitle",
  ];

  const nodes = Array.from(document.querySelectorAll(selectors.join(",")))
    .filter((n) => n.childNodes.length === 1 && n.firstChild.nodeType === Node.TEXT_NODE);

  const original = new Map(nodes.map((n) => [n, n.textContent || ""]));

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function clearMarks() {
    nodes.forEach((n) => {
      const t = original.get(n);
      if (typeof t === "string") n.textContent = t;
    });
  }

  function applyMarks(q) {
    const qq = q.trim();
    if (!qq) return;

    const re = new RegExp(escapeRegExp(qq), "ig");

    nodes.forEach((n) => {
      const t = original.get(n) || "";
      if (!re.test(t)) return;

      // reset regex state
      re.lastIndex = 0;

      // build marked html safely
      const parts = t.split(re);
      const matches = t.match(re) || [];

      let html = "";
      for (let i = 0; i < parts.length; i++) {
        html += parts[i];
        if (matches[i]) html += `<mark>${matches[i]}</mark>`;
      }
      n.innerHTML = html;
    });
  }

  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      clearMarks();
      applyMarks(input.value);
    }, 120);
  });

  // If search overlay closes, clear highlights
  const searchOverlay = document.getElementById("searchOverlay");
  const searchBtn = document.getElementById("searchBtn");
  const searchClose = document.getElementById("searchClose");
  const searchBackdrop = document.getElementById("searchBackdrop");

  function maybeClearOnClose() {
    // if overlay is not open -> clear
    if (!searchOverlay?.classList.contains("is-open")) {
      clearMarks();
      input.value = "";
    }
  }

  searchBtn?.addEventListener("click", () => {
    // opening handled elsewhere; do nothing
  });
  searchClose?.addEventListener("click", () => setTimeout(maybeClearOnClose, 0));
  searchBackdrop?.addEventListener("click", () => setTimeout(maybeClearOnClose, 0));
})();
