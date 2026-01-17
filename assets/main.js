/* INDIVIDNI – Lusion-like interactions (vanilla JS)
   - black menu
   - cursor glow
   - hero canvas "3D" reactive blob
   - red path draws on scroll
   - showreel sticky reveal + play
   - card hover tilt + wave distortion (SVG filter injected)
*/

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* -------------------------- Menu (black) -------------------------- */
  const menu = $("#menu");
  const btnMenu = $("#btnMenu");

  function openMenu() {
    if (!menu) return;
    menu.classList.add("isOpen");
    menu.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("hasMenu");
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("isOpen");
    menu.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("hasMenu");
  }

  btnMenu?.addEventListener("click", () => {
    if (!menu) return;
    menu.classList.contains("isOpen") ? closeMenu() : openMenu();
  });

  menu?.addEventListener("click", (e) => {
    const el = e.target;
    if (el && el.closest("[data-close]")) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* -------------------------- Cursor glow -------------------------- */
  const glow = $(".cursorGlow");
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const glowPos = { x: pointer.x, y: pointer.y };

  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { passive: true }
  );

  function tickGlow() {
    if (glow) {
      glowPos.x = lerp(glowPos.x, pointer.x, 0.14);
      glowPos.y = lerp(glowPos.y, pointer.y, 0.14);
      glow.style.transform = `translate3d(${glowPos.x}px, ${glowPos.y}px, 0)`;
    }
    requestAnimationFrame(tickGlow);
  }
  requestAnimationFrame(tickGlow);

  /* -------------------------- Inject SVG wave filter -------------------------- */
  const waveFilterId = "indiv-wave";
  function ensureWaveFilter() {
    if (document.getElementById(waveFilterId)) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.left = "-9999px";
    svg.style.top = "-9999px";

    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", waveFilterId);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");

    const turb = document.createElementNS("http://www.w3.org/2000/svg", "feTurbulence");
    turb.setAttribute("type", "fractalNoise");
    turb.setAttribute("baseFrequency", "0.012 0.02");
    turb.setAttribute("numOctaves", "2");
    turb.setAttribute("seed", "2");
    turb.setAttribute("result", "noise");

    const disp = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "noise");
    disp.setAttribute("scale", "0");
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");

    filter.appendChild(turb);
    filter.appendChild(disp);
    svg.appendChild(filter);
    document.body.appendChild(svg);

    // store refs
    window.__indivWave = { turb, disp };
  }
  ensureWaveFilter();

  /* -------------------------- Hover tilt + wave -------------------------- */
  const btnWave = $("#btnWave");
  let waveEnabled = true;

  btnWave?.addEventListener("click", () => {
    waveEnabled = !waveEnabled;
    document.documentElement.classList.toggle("noWave", !waveEnabled);
  });

  const parallaxEls = $$('[data-parallax], .waveTarget');

  function setupParallax(el) {
    let hover = false;
    let px = 0,
      py = 0;

    el.addEventListener("pointerenter", () => {
      hover = true;
      el.classList.add("isHover");
      if (waveEnabled) el.style.filter = `url(#${waveFilterId})`;

      const card = el.closest(".workCard");
      if (card) {
        card.classList.add("isFlash");
        window.setTimeout(() => card.classList.remove("isFlash"), 140);
      }
    });

    el.addEventListener("pointerleave", () => {
      hover = false;
      el.classList.remove("isHover");
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.style.removeProperty("--tx");
      el.style.removeProperty("--ty");
      el.style.filter = "";
    });

    el.addEventListener(
      "pointermove",
      (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width; // 0..1
        const ny = (e.clientY - r.top) / r.height;

        // tilt
        const ry = (nx - 0.5) * 10; // deg
        const rx = -(ny - 0.5) * 8;
        const tx = (nx - 0.5) * 8; // px
        const ty = (ny - 0.5) * 8;

        el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
        el.style.setProperty("--tx", `${tx.toFixed(1)}px`);
        el.style.setProperty("--ty", `${ty.toFixed(1)}px`);

        px = nx;
        py = ny;
      },
      { passive: true }
    );

    // wave animation via turbulence
    let t = Math.random() * 1000;
    function raf() {
      const w = window.__indivWave;
      if (!w) {
        requestAnimationFrame(raf);
        return;
      }

      // animate global noise slowly
      t += 0.016;

      const active = hover && waveEnabled && !document.documentElement.classList.contains("noWave");
      const targetScale = active ? 18 : 0;
      const cur = parseFloat(w.disp.getAttribute("scale") || "0");
      const next = lerp(cur, targetScale, 0.12);
      w.disp.setAttribute("scale", next.toFixed(2));

      // freq slightly changes with pointer position (gives "wave")
      const f1 = 0.010 + (active ? (px - 0.5) * 0.004 : 0);
      const f2 = 0.018 + (active ? (py - 0.5) * 0.006 : 0);
      w.turb.setAttribute("baseFrequency", `${f1.toFixed(4)} ${f2.toFixed(4)}`);
      w.turb.setAttribute("seed", `${Math.floor(2 + (Math.sin(t) * 2 + 2))}`);

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  parallaxEls.forEach(setupParallax);

  /* -------------------------- Hero canvas (fake 3D blob) -------------------------- */
  const canvas = $("#hero3d");
  if (canvas) {
    const ctx = canvas.getContext("2d", { alpha: false });
    const state = {
      w: 0,
      h: 0,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      mx: 0.5,
      my: 0.5,
      tm: 0,
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    canvas.addEventListener(
      "pointermove",
      (e) => {
        const r = canvas.getBoundingClientRect();
        state.mx = clamp((e.clientX - r.left) / r.width, 0, 1);
        state.my = clamp((e.clientY - r.top) / r.height, 0, 1);
      },
      { passive: true }
    );

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = state.dpr;
      state.w = Math.max(1, Math.floor(r.width * dpr));
      state.h = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = state.w;
      canvas.height = state.h;
    }

    function draw() {
      if (!ctx) return;
      state.tm += 0.016;
      const w = state.w,
        h = state.h;

      // background
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#0b1020");
      bg.addColorStop(1, "#101a2f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // soft vignette
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.65);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // blob group (cheap "3D")
      const cx = w * (0.50 + (state.mx - 0.5) * 0.08);
      const cy = h * (0.52 + (state.my - 0.5) * 0.06);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${28 * state.dpr}px)`;

      const colors = [
        "rgba(52, 92, 255, 0.75)",
        "rgba(146, 168, 255, 0.35)",
        "rgba(20, 210, 255, 0.22)",
      ];

      for (let i = 0; i < 7; i++) {
        const t = state.tm * (0.7 + i * 0.08);
        const ox = Math.cos(t + i) * (w * 0.10) + (state.mx - 0.5) * w * 0.09;
        const oy = Math.sin(t * 1.2 + i * 1.7) * (h * 0.10) + (state.my - 0.5) * h * 0.08;
        const r = (Math.min(w, h) * (0.16 + (i % 3) * 0.06)) * (0.85 + 0.15 * Math.sin(t * 1.8));

        ctx.beginPath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // glossy highlight
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = `blur(${6 * state.dpr}px)`;

      const hx = cx + (state.mx - 0.5) * w * 0.18;
      const hy = cy - h * 0.18 + (state.my - 0.5) * h * 0.12;

      const hg = ctx.createLinearGradient(hx - w * 0.25, hy - h * 0.15, hx + w * 0.25, hy + h * 0.15);
      hg.addColorStop(0, "rgba(255,255,255,0)");
      hg.addColorStop(0.45, "rgba(255,255,255,0.65)");
      hg.addColorStop(0.55, "rgba(255,255,255,0.25)");
      hg.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(hx, hy, w * 0.32, h * 0.11, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      requestAnimationFrame(draw);
    }

    resize();
    requestAnimationFrame(draw);
  }

  /* -------------------------- Red path draw on scroll -------------------------- */
  const flow = $("#flow");
  const flowPath = $("#flowPath");

  if (flowPath) {
    flowPath.style.strokeDasharray = "100";
    flowPath.style.strokeDashoffset = "100";
  }

  function updateFlowStroke() {
    if (!flow || !flowPath) return;
    const r = flow.getBoundingClientRect();
    const vh = window.innerHeight;

    // start when flow is about to enter, finish when almost left
    const start = vh * 0.9;
    const end = -r.height * 0.15;

    const t = (start - r.top) / (start - end);
    const p = clamp(t, 0, 1);

    flowPath.style.strokeDashoffset = (100 * (1 - p)).toFixed(2);
  }

  /* -------------------------- Reel sticky reveal + play -------------------------- */
  const reelPin = $("#reelPin");
  const reelFrame = $("#reelFrame");
  const reelOverlay = $("#reelOverlay");
  const reelBtn = $("#reelBtn");
  const reelVideo = $("#reelVideo");

  let reelPlayed = false;

  function playReel() {
    if (!reelVideo || reelPlayed) return;
    reelPlayed = true;
    reelFrame?.classList.add("isPlaying");

    // try to play (muted by default)
    reelVideo.muted = true;
    const p = reelVideo.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  reelOverlay?.addEventListener("click", playReel);
  reelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    playReel();
  });

  function updateReel() {
    if (!reelPin || !reelFrame) return;

    const pinTop = reelPin.offsetTop;
    const pinH = reelPin.offsetHeight;
    const vh = window.innerHeight;

    const p = clamp((window.scrollY - pinTop) / (pinH - vh), 0, 1);

    // curve: first part does the reveal (like gif), later stabilizes
    const a = easeOutCubic(clamp(p / 0.65, 0, 1));
    const b = easeInOutCubic(clamp((p - 0.55) / 0.45, 0, 1));

    // scale from smaller to full
    const s = lerp(0.90, 1.0, a);
    const y = lerp(18, 0, a);
    const r = lerp(28, 20, a);

    // overlay fades a bit during scroll, fully hides when playing
    const ov = reelPlayed ? 0 : lerp(1, 0.72, b);

    // video becomes visible around mid-progress or when playing
    const vid = reelPlayed ? 1 : clamp((p - 0.18) / 0.32, 0, 1);

    reelFrame.style.setProperty("--reelS", s.toFixed(3));
    reelFrame.style.setProperty("--reelY", `${y.toFixed(1)}px`);
    reelFrame.style.setProperty("--reelR", `${r.toFixed(1)}px`);
    reelFrame.style.setProperty("--ov", ov.toFixed(3));
    reelFrame.style.setProperty("--vid", vid.toFixed(3));

    // autoplay near end of reveal (like Lusion)
    if (!reelPlayed && p > 0.72) playReel();
  }

  /* -------------------------- RAF scroll loop -------------------------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateFlowStroke();
      updateReel();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();
