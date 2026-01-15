(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile menu
  const body = document.body;
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  const closeMenu = () => {
    body.classList.remove("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "true");
  };

  const openMenu = () => {
    body.classList.add("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "false");
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const isOpen = body.classList.contains("nav-open");
      isOpen ? closeMenu() : openMenu();
    });
  }

  if (mobileNav) {
    mobileNav.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!body.classList.contains("nav-open")) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("#mobileNav") || t.closest("#menuBtn")) return;
    closeMenu();
  });

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("is-inview");
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.14 }
  );

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Magnetic elements
  document.querySelectorAll(".magnetic").forEach((el) => {
    const strength = Number(el.getAttribute("data-magnet") || "0.25");
    let rect = null;

    el.addEventListener("pointerenter", () => {
      rect = el.getBoundingClientRect();
    });

    el.addEventListener("pointermove", (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });

    el.addEventListener("pointerleave", () => {
      rect = null;
      el.style.transform = "";
    });
  });

  // Custom cursor (fine pointer + not reduced motion)
  if (finePointer && !reduce) {
    const ring = document.querySelector(".cursor");
    const dot = document.querySelector(".cursor-dot");

    if (ring && dot) {
      body.classList.add("has-cursor");

      let x = innerWidth / 2;
      let y = innerHeight / 2;
      let tx = x;
      let ty = y;

      const setPos = (el, px, py) => {
        el.style.left = px + "px";
        el.style.top = py + "px";
      };

      window.addEventListener(
        "pointermove",
        (e) => {
          tx = e.clientX;
          ty = e.clientY;
          setPos(dot, tx, ty);
        },
        { passive: true }
      );

      const loop = () => {
        x += (tx - x) * 0.13;
        y += (ty - y) * 0.13;
        setPos(ring, x, y);
        requestAnimationFrame(loop);
      };
      loop();

      const hoverSelector = "a, button, .card, .magnetic";
      document.querySelectorAll(hoverSelector).forEach((el) => {
        el.addEventListener("pointerenter", () => body.classList.add("cursor-active"));
        el.addEventListener("pointerleave", () => body.classList.remove("cursor-active"));
      });
    }
  } else {
    // Remove cursor nodes for touch / reduced motion
    document.querySelectorAll(".cursor, .cursor-dot").forEach((el) => el.remove());
  }

  // Canvas background orbs
  const canvas = document.getElementById("bg");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0, h = 0;
  let mx = 0, my = 0;

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
    },
    { passive: true }
  );

  const rand = (min, max) => min + Math.random() * (max - min);

  const baseHues = [285, 198, 42, 310, 160, 220];
  const orbs = Array.from({ length: 6 }, (_, i) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(Math.min(w, h) * 0.12, Math.min(w, h) * 0.28),
    vx: rand(-0.25, 0.25),
    vy: rand(-0.22, 0.22),
    hue: baseHues[i % baseHues.length] + rand(-12, 12),
    a: rand(0.16, 0.26),
  }));

  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    // subtle vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h));
    vg.addColorStop(0, "rgba(255,255,255,0.03)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    const px = (mx / Math.max(1, w) - 0.5) * 40;
    const py = (my / Math.max(1, h) - 0.5) * 40;

    for (const o of orbs) {
      o.x += o.vx;
      o.y += o.vy;

      // wrap (smoother than bounce)
      if (o.x < -o.r) o.x = w + o.r;
      if (o.x > w + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = h + o.r;
      if (o.y > h + o.r) o.y = -o.r;

      const cx = o.x + px * (o.r / 160);
      const cy = o.y + py * (o.r / 160);

      const rg = ctx.createRadialGradient(cx, cy, o.r * 0.18, cx, cy, o.r);
      rg.addColorStop(0, `hsla(${o.hue}, 92%, 65%, ${o.a})`);
      rg.addColorStop(1, `hsla(${o.hue}, 92%, 55%, 0)`);

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    if (!reduce) requestAnimationFrame(draw);
  };

  draw(); // first frame (and loop if not reduced)
})();
