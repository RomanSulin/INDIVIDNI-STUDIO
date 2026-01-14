(() => {
  const qs = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------------- Menu ---------------- */
  const menu = qs("#menu");
  const btnMenu = qs("#btnMenu");

  function openMenu() {
    if (!menu) return;
    menu.classList.add("isOpen");
    menu.setAttribute("aria-hidden", "false");
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("isOpen");
    menu.setAttribute("aria-hidden", "true");
  }

  btnMenu?.addEventListener("click", () => {
    menu?.classList.contains("isOpen") ? closeMenu() : openMenu();
  });

  menu?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------------- About stroke draw ---------------- */
  const about = qs("#about");
  const strokePath = qs("#strokePath");
  const strokeLen = 100;

  if (strokePath) {
    strokePath.style.strokeDasharray = `${strokeLen}`;
    strokePath.style.strokeDashoffset = `${strokeLen}`;
  }

  function updateStroke() {
    if (!about || !strokePath) return;

    const r = about.getBoundingClientRect();
    const vh = window.innerHeight;

    // 0 когда секция только снизу вошла, 1 когда прошла дальше вверх
    const start = vh * 0.85;
    const end = -r.height * 0.15;

    const t = (start - r.top) / (start - end);
    const p = clamp(t, 0, 1);

    strokePath.style.strokeDashoffset = `${strokeLen * (1 - p)}`;
  }

  /* ---------------- Reel scroll + play ---------------- */
  const reelPin = qs("#reelPin");
  const reelFrame = qs("#reelFrame");
  const reelVideo = qs("#reelVideo");
  const reelOverlay = qs("#reelOverlay");

  let reelPlayed = false;

  function playReel() {
    if (!reelVideo || !reelFrame || reelPlayed) return;
    reelPlayed = true;

    reelFrame.classList.add("isPlaying");
    reelVideo.muted = true;

    const p = reelVideo.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  reelOverlay?.addEventListener("click", playReel);

  function updateReel() {
    if (!reelPin || !reelFrame) return;

    const pinTop = reelPin.offsetTop;
    const pinH = reelPin.offsetHeight;
    const vh = window.innerHeight;

    const p = clamp((window.scrollY - pinTop) / (pinH - vh), 0, 1);

    // первые ~60% — “въезд” (как у lusion)
    const e = easeOutCubic(clamp(p / 0.62, 0, 1));

    const s = 0.92 + (1.0 - 0.92) * e;
    const y = 18 * (1 - e);
    const r = 28 - 6 * e;

    reelFrame.style.setProperty("--reelS", s.toFixed(3));
    reelFrame.style.setProperty("--reelY", `${y.toFixed(1)}px`);
    reelFrame.style.setProperty("--reelR", `${r.toFixed(1)}px`);

    // лёгкое “приглушение” оверлея ближе к середине скролла
    const ov = 1 - clamp((p - 0.55) / 0.18, 0, 1) * 0.25;
    reelFrame.style.setProperty("--ov", ov.toFixed(3));

    // автозапуск при прокрутке как “подсказка”
    if (!reelPlayed && p > 0.63) playReel();
  }

  /* ---------------- RAF scroll loop ---------------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateStroke();
      updateReel();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();
