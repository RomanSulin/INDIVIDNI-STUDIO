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


// TouchTexture class
class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size; // Much larger touch radius for more obvious effect
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.initTexture();
  }

  initTexture() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  update() {
    this.clear();
    let speed = this.speed;
    // Use reverse iteration to safely remove items
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      let f = point.force * speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addTouch(point) {
    let force = 0;
    let vx = 0;
    let vy = 0;
    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      let d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;
      force = Math.min(dd * 20000, 2.0); // Much stronger force for very noticeable effect
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point) {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height
    };

    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;

    const radius = this.radius;
    let color = `${((point.vx + 1) / 2) * 255}, ${
      ((point.vy + 1) / 2) * 255
    }, ${intensity * 255}`;
    let offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius * 1;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

// GradientBackground class
class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;
    this.uniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      },
      uColor1: { value: new THREE.Vector3(0.945, 0.353, 0.133) }, // F15A22 - Orange
      uColor2: { value: new THREE.Vector3(0.039, 0.055, 0.153) }, // 0a0e27 - Navy Blue
      uColor3: { value: new THREE.Vector3(0.945, 0.353, 0.133) }, // F15A22 - Orange
      uColor4: { value: new THREE.Vector3(0.039, 0.055, 0.153) }, // 0a0e27 - Navy Blue
      uColor5: { value: new THREE.Vector3(0.945, 0.353, 0.133) }, // F15A22 - Orange
      uColor6: { value: new THREE.Vector3(0.039, 0.055, 0.153) }, // 0a0e27 - Navy Blue
      uSpeed: { value: 1.2 }, // Faster animation
      uIntensity: { value: 1.8 },
      uTouchTexture: { value: null },
      uGrainIntensity: { value: 0.08 },
      uZoom: { value: 1.0 }, // Zoom/scale control - lower = less zoomed (more visible)
      uDarkNavy: { value: new THREE.Vector3(0.039, 0.055, 0.153) }, // #0a0e27 - Dark navy base color
      uGradientSize: { value: 1.0 }, // Control gradient size (smaller = more gradients)
      uGradientCount: { value: 6.0 }, // Number of gradient centers
      uColor1Weight: { value: 1.0 }, // Weight for color1 (orange) - reduce for more navy
      uColor2Weight: { value: 1.0 } // Weight for color2 (navy) - increase for more navy
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(
      viewSize.width,
      viewSize.height,
      1,
      1
    );

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
            varying vec2 vUv;
            void main() {
              vec3 pos = position.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
              vUv = uv;
            }
          `,
      fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform vec3 uColor4;
            uniform vec3 uColor5;
            uniform vec3 uColor6;
            uniform float uSpeed;
            uniform float uIntensity;
            uniform sampler2D uTouchTexture;
            uniform float uGrainIntensity;
            uniform float uZoom;
            uniform vec3 uDarkNavy;
            uniform float uGradientSize;
            uniform float uGradientCount;
            uniform float uColor1Weight;
            uniform float uColor2Weight;
            
            varying vec2 vUv;
            
            #define PI 3.14159265359
            
            // Grain function for film grain effect
            float grain(vec2 uv, float time) {
              vec2 grainUv = uv * uResolution * 0.5;
              float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
              return grainValue * 2.0 - 1.0;
            }
            
            vec3 getGradientColor(vec2 uv, float time) {
              // Dynamic gradient size based on uniform
              float gradientRadius = uGradientSize;
              
              // Multiple animated centers with different speeds and patterns
              // Support up to 12 centers for more gradient action
              vec2 center1 = vec2(
                0.5 + sin(time * uSpeed * 0.4) * 0.4,
                0.5 + cos(time * uSpeed * 0.5) * 0.4
              );
              vec2 center2 = vec2(
                0.5 + cos(time * uSpeed * 0.6) * 0.5,
                0.5 + sin(time * uSpeed * 0.45) * 0.5
              );
              vec2 center3 = vec2(
                0.5 + sin(time * uSpeed * 0.35) * 0.45,
                0.5 + cos(time * uSpeed * 0.55) * 0.45
              );
              vec2 center4 = vec2(
                0.5 + cos(time * uSpeed * 0.5) * 0.4,
                0.5 + sin(time * uSpeed * 0.4) * 0.4
              );
              vec2 center5 = vec2(
                0.5 + sin(time * uSpeed * 0.7) * 0.35,
                0.5 + cos(time * uSpeed * 0.6) * 0.35
              );
              vec2 center6 = vec2(
                0.5 + cos(time * uSpeed * 0.45) * 0.5,
                0.5 + sin(time * uSpeed * 0.65) * 0.5
              );
              
              // Additional centers for more gradient action (7-12)
              vec2 center7 = vec2(
                0.5 + sin(time * uSpeed * 0.55) * 0.38,
                0.5 + cos(time * uSpeed * 0.48) * 0.42
              );
              vec2 center8 = vec2(
                0.5 + cos(time * uSpeed * 0.65) * 0.36,
                0.5 + sin(time * uSpeed * 0.52) * 0.44
              );
              vec2 center9 = vec2(
                0.5 + sin(time * uSpeed * 0.42) * 0.41,
                0.5 + cos(time * uSpeed * 0.58) * 0.39
              );
              vec2 center10 = vec2(
                0.5 + cos(time * uSpeed * 0.48) * 0.37,
                0.5 + sin(time * uSpeed * 0.62) * 0.43
              );
              vec2 center11 = vec2(
                0.5 + sin(time * uSpeed * 0.68) * 0.33,
                0.5 + cos(time * uSpeed * 0.44) * 0.46
              );
              vec2 center12 = vec2(
                0.5 + cos(time * uSpeed * 0.38) * 0.39,
                0.5 + sin(time * uSpeed * 0.56) * 0.41
              );
              
              float dist1 = length(uv - center1);
              float dist2 = length(uv - center2);
              float dist3 = length(uv - center3);
              float dist4 = length(uv - center4);
              float dist5 = length(uv - center5);
              float dist6 = length(uv - center6);
              float dist7 = length(uv - center7);
              float dist8 = length(uv - center8);
              float dist9 = length(uv - center9);
              float dist10 = length(uv - center10);
              float dist11 = length(uv - center11);
              float dist12 = length(uv - center12);
              
              // Smaller, tighter influence areas based on uGradientSize
              float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
              float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
              float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
              float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
              float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
              float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
              float influence7 = 1.0 - smoothstep(0.0, gradientRadius, dist7);
              float influence8 = 1.0 - smoothstep(0.0, gradientRadius, dist8);
              float influence9 = 1.0 - smoothstep(0.0, gradientRadius, dist9);
              float influence10 = 1.0 - smoothstep(0.0, gradientRadius, dist10);
              float influence11 = 1.0 - smoothstep(0.0, gradientRadius, dist11);
              float influence12 = 1.0 - smoothstep(0.0, gradientRadius, dist12);
              
              // Multiple rotation layers for depth
              vec2 rotatedUv1 = uv - 0.5;
              float angle1 = time * uSpeed * 0.15;
              rotatedUv1 = vec2(
                rotatedUv1.x * cos(angle1) - rotatedUv1.y * sin(angle1),
                rotatedUv1.x * sin(angle1) + rotatedUv1.y * cos(angle1)
              );
              rotatedUv1 += 0.5;
              
              vec2 rotatedUv2 = uv - 0.5;
              float angle2 = -time * uSpeed * 0.12;
              rotatedUv2 = vec2(
                rotatedUv2.x * cos(angle2) - rotatedUv2.y * sin(angle2),
                rotatedUv2.x * sin(angle2) + rotatedUv2.y * cos(angle2)
              );
              rotatedUv2 += 0.5;
              
              float radialGradient1 = length(rotatedUv1 - 0.5);
              float radialGradient2 = length(rotatedUv2 - 0.5);
              float radialInfluence1 = 1.0 - smoothstep(0.0, 0.8, radialGradient1);
              float radialInfluence2 = 1.0 - smoothstep(0.0, 0.8, radialGradient2);
              
              // Blend all colors with dynamic intensities - increased for more contrast
              vec3 color = vec3(0.0);
              color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
              color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
              color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
              color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
              color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
              color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;
              
              // Add extra centers if uGradientCount > 6
              if (uGradientCount > 6.0) {
                color += uColor1 * influence7 * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uColor1Weight;
                color += uColor2 * influence8 * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uColor2Weight;
                color += uColor3 * influence9 * (0.55 + 0.45 * sin(time * uSpeed * 1.6)) * uColor1Weight;
                color += uColor4 * influence10 * (0.55 + 0.45 * cos(time * uSpeed * 1.7)) * uColor2Weight;
              }
              if (uGradientCount > 10.0) {
                color += uColor5 * influence11 * (0.55 + 0.45 * sin(time * uSpeed * 1.8)) * uColor1Weight;
                color += uColor6 * influence12 * (0.55 + 0.45 * cos(time * uSpeed * 1.9)) * uColor2Weight;
              }
              
              // Add radial overlays - increased for more contrast, with color weighting
              color += mix(uColor1, uColor3, radialInfluence1) * 0.45 * uColor1Weight;
              color += mix(uColor2, uColor4, radialInfluence2) * 0.4 * uColor2Weight;
              
              // Clamp and apply intensity
              color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
              
              // Enhanced color saturation for more vibrant look
              float luminance = dot(color, vec3(0.299, 0.587, 0.114));
              color = mix(vec3(luminance), color, 1.35);
              
              color = pow(color, vec3(0.92)); // Slight gamma adjustment for better contrast
              
              // Ensure minimum brightness (navy blue base instead of grey/black)
              // Use higher threshold to ensure navy blue shows through in low-intensity areas
              float brightness1 = length(color);
              float mixFactor1 = max(brightness1 * 1.2, 0.15); // Higher threshold for navy blue base
              color = mix(uDarkNavy, color, mixFactor1);
              
              // Cap maximum brightness - increased for more contrast
              float maxBrightness = 1.0;
              float brightness = length(color);
              if (brightness > maxBrightness) {
                color = color * (maxBrightness / brightness);
              }
              
              return color;
            }
            
            void main() {
              vec2 uv = vUv;
              
              // Apply water distortion from touch texture - very strong
              vec4 touchTex = texture2D(uTouchTexture, uv);
              float vx = -(touchTex.r * 2.0 - 1.0);
              float vy = -(touchTex.g * 2.0 - 1.0);
              float intensity = touchTex.b;
              // Much increased distortion strength for very obvious effect
              uv.x += vx * 0.8 * intensity;
              uv.y += vy * 0.8 * intensity;
              
              // Combined ripple and wave effect for better performance
              vec2 center = vec2(0.5);
              float dist = length(uv - center);
              float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
              float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
              uv += vec2(ripple + wave);
              
              vec3 color = getGradientColor(uv, uTime);
              
              // Apply grain effect
              float grainValue = grain(uv, uTime);
              color += grainValue * uGrainIntensity;
              
              // Subtle color shifting - optimized with single calculation
              float timeShift = uTime * 0.5;
              color.r += sin(timeShift) * 0.02;
              color.g += cos(timeShift * 1.4) * 0.02;
              color.b += sin(timeShift * 1.2) * 0.02;
              
              // Ensure minimum brightness (navy blue base instead of grey/black)
              // Use higher threshold to ensure navy blue shows through in low-intensity areas
              float brightness2 = length(color);
              float mixFactor2 = max(brightness2 * 1.2, 0.15); // Higher threshold for navy blue base
              color = mix(uDarkNavy, color, mixFactor2);
              
              // Clamp to valid color range
              color = clamp(color, vec3(0.0), vec3(1.0));
              
              // Cap maximum brightness - increased for more contrast
              float maxBrightness = 1.0;
              float brightness = length(color);
              if (brightness > maxBrightness) {
                color = color * (maxBrightness / brightness);
              }
              
              gl_FragColor = vec4(color, 1.0);
            }
          `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = 0;
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta) {
    if (this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }

  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(
        viewSize.width,
        viewSize.height,
        1,
        1
      );
    }
    if (this.uniforms.uResolution) {
      this.uniforms.uResolution.value.set(width, height);
    }
  }
}

// App class
class App {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    this.renderer.setAnimationLoop(null); // We'll use our own tick loop
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = "webGLApp";

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27); // Dark navy
    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    // Color schemes
    this.colorSchemes = {
      1: {
        // Orange + Navy Blue
        color1: new THREE.Vector3(0.945, 0.353, 0.133), // F15A22 - Orange
        color2: new THREE.Vector3(0.039, 0.055, 0.153) // 0a0e27 - Navy Blue
      },
      2: {
        // Turquoise + Coral Red-Orange
        color1: new THREE.Vector3(1.0, 0.424, 0.314), // FF6C50 - Coral Red-Orange
        color2: new THREE.Vector3(0.251, 0.878, 0.816) // 40E0D0 - Turquoise
      },
      3: {
        // Orange + Navy + Turquoise (identical to scheme 1 but with turquoise added)
        color1: new THREE.Vector3(0.945, 0.353, 0.133), // F15A22 - Orange
        color2: new THREE.Vector3(0.039, 0.055, 0.153), // 0a0e27 - Navy Blue
        color3: new THREE.Vector3(0.251, 0.878, 0.816) // 40E0D0 - Turquoise
      },
      4: {
        // Based on Scheme 3: F26633 + 2D6B6D + D1AF9C
        color1: new THREE.Vector3(0.949, 0.4, 0.2), // F26633 - Orange/Coral
        color2: new THREE.Vector3(0.176, 0.42, 0.427), // 2D6B6D - Teal/Blue-Green
        color3: new THREE.Vector3(0.82, 0.686, 0.612) // D1AF9C - Beige/Peach
      },
      5: {
        // F15A22 + 004238 + F15A22 + 000000 + F15A22 + 000000
        color1: new THREE.Vector3(0.945, 0.353, 0.133), // F15A22 - Orange
        color2: new THREE.Vector3(0.0, 0.259, 0.22), // 004238 - Dark Teal (0, 66, 56)
        color3: new THREE.Vector3(0.945, 0.353, 0.133), // F15A22 - Orange
        color4: new THREE.Vector3(0.0, 0.0, 0.0), // 000000 - Black
        color5: new THREE.Vector3(0.945, 0.353, 0.133), // F15A22 - Orange
        color6: new THREE.Vector3(0.0, 0.0, 0.0) // 000000 - Black
      }
    };
    this.currentScheme = 1;

    this.init();
  }

  setColorScheme(scheme) {
    if (!this.colorSchemes[scheme]) return;
    this.currentScheme = scheme;
    const colors = this.colorSchemes[scheme];
    const uniforms = this.gradientBackground.uniforms;

    // Update all color uniforms
    if (scheme === 3) {
      // Scheme 3: Orange + Navy + Turquoise (identical to scheme 1 but with turquoise)
      uniforms.uColor1.value.copy(colors.color1); // Orange
      uniforms.uColor2.value.copy(colors.color2); // Navy
      uniforms.uColor3.value.copy(colors.color3); // Turquoise
      uniforms.uColor4.value.copy(colors.color1); // Orange
      uniforms.uColor5.value.copy(colors.color2); // Navy
      uniforms.uColor6.value.copy(colors.color3); // Turquoise
    } else if (scheme === 4) {
      // Scheme 4: Based on Scheme 3 with F26633, 2D6B6D, D1AF9C
      uniforms.uColor1.value.copy(colors.color1); // F26633 - Orange/Coral
      uniforms.uColor2.value.copy(colors.color2); // 2D6B6D - Teal/Blue-Green
      uniforms.uColor3.value.copy(colors.color3); // D1AF9C - Beige/Peach
      uniforms.uColor4.value.copy(colors.color1); // F26633 - Orange/Coral
      uniforms.uColor5.value.copy(colors.color2); // 2D6B6D - Teal/Blue-Green
      uniforms.uColor6.value.copy(colors.color3); // D1AF9C - Beige/Peach
    } else if (scheme === 5) {
      // Scheme 5: F15A22 + 004238 + F15A22 + 000000 + F15A22 + 000000
      uniforms.uColor1.value.copy(colors.color1); // F15A22 - Orange
      uniforms.uColor2.value.copy(colors.color2); // 004238 - Dark Teal
      uniforms.uColor3.value.copy(colors.color3); // F15A22 - Orange
      uniforms.uColor4.value.copy(colors.color4); // 000000 - Black
      uniforms.uColor5.value.copy(colors.color5); // F15A22 - Orange
      uniforms.uColor6.value.copy(colors.color6); // 000000 - Black
    } else {
      uniforms.uColor1.value.copy(colors.color1);
      uniforms.uColor2.value.copy(colors.color2);
      uniforms.uColor3.value.copy(colors.color1);
      uniforms.uColor4.value.copy(colors.color2);
      uniforms.uColor5.value.copy(colors.color1);
      uniforms.uColor6.value.copy(colors.color2);
    }

    // Update background color and base color
    if (scheme === 1) {
      this.scene.background = new THREE.Color(0x0a0e27); // Navy blue for scheme 1
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Navy blue base color
      // More gradient action: smaller gradients, more of them
      uniforms.uGradientSize.value = 0.45; // Smaller gradient radius for more defined gradients
      uniforms.uGradientCount.value = 12.0; // More gradient centers (12 instead of 6)
      uniforms.uSpeed.value = 1.5; // Slightly faster for more movement
      // Balance colors: reduce orange, increase navy
      uniforms.uColor1Weight.value = 0.5; // Reduce orange intensity
      uniforms.uColor2Weight.value = 1.8; // Increase navy intensity
    } else if (scheme === 6) {
      // Scheme 6: Identical to scheme 1 but with Orange, Navy, and Turquoise
      this.scene.background = new THREE.Color(0x0a0e27); // Navy blue (same as scheme 1)
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Navy blue base color (same as scheme 1)
      // More gradient action: smaller gradients, more of them (same as scheme 1)
      uniforms.uGradientSize.value = 0.45; // Smaller gradient radius for more defined gradients
      uniforms.uGradientCount.value = 12.0; // More gradient centers (12 instead of 6)
      uniforms.uSpeed.value = 1.5; // Slightly faster for more movement
      // Balance colors: reduce orange, increase navy (same as scheme 1)
      uniforms.uColor1Weight.value = 0.5; // Reduce orange intensity
      uniforms.uColor2Weight.value = 1.8; // Increase navy intensity
    } else if (scheme === 7) {
      // Scheme 7: Based on Scheme 6 with F26633, 2D6B6D, D1AF9C (same settings as Scheme 6)
      this.scene.background = new THREE.Color(0x0a0e27); // Navy blue (same as scheme 6)
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Navy blue base color (same as scheme 6)
      // More gradient action: smaller gradients, more of them (same as scheme 6)
      uniforms.uGradientSize.value = 0.45; // Smaller gradient radius for more defined gradients
      uniforms.uGradientCount.value = 12.0; // More gradient centers (12 instead of 6)
      uniforms.uSpeed.value = 1.5; // Slightly faster for more movement
      // Balance colors: same as scheme 6
      uniforms.uColor1Weight.value = 0.5; // Reduce orange/coral intensity
      uniforms.uColor2Weight.value = 1.8; // Increase teal intensity
    } else if (scheme === 8) {
      // Scheme 8: Identical to Scheme 1
      this.scene.background = new THREE.Color(0x0a0e27); // Navy blue for scheme 8
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Navy blue base color
      // More gradient action: smaller gradients, more of them
      uniforms.uGradientSize.value = 0.45; // Smaller gradient radius for more defined gradients
      uniforms.uGradientCount.value = 12.0; // More gradient centers (12 instead of 6)
      uniforms.uSpeed.value = 1.5; // Slightly faster for more movement
      // Balance colors: reduce orange, increase navy
      uniforms.uColor1Weight.value = 0.5; // Reduce orange intensity
      uniforms.uColor2Weight.value = 1.8; // Increase navy intensity
    } else if (scheme === 5) {
      // Scheme 5: Same settings as Scheme 1 but with F15A22 + 004238 + F15A22 + 000000 + F15A22 + 000000
      this.scene.background = new THREE.Color(0x0a0e27); // Navy blue for scheme 5 (same as scheme 1)
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Navy blue base color (same as scheme 1)
      // More gradient action: smaller gradients, more of them (same as scheme 1)
      uniforms.uGradientSize.value = 0.45; // Smaller gradient radius for more defined gradients
      uniforms.uGradientCount.value = 12.0; // More gradient centers (12 instead of 6)
      uniforms.uSpeed.value = 1.5; // Slightly faster for more movement
      // Balance colors: reduce orange, increase navy (same as scheme 1)
      uniforms.uColor1Weight.value = 0.5; // Reduce orange intensity
      uniforms.uColor2Weight.value = 1.8; // Increase navy intensity
    } else if (scheme === 4) {
      this.scene.background = new THREE.Color(0xffffff); // Off-white for scheme 4
      uniforms.uDarkNavy.value.set(0, 0, 0); // #FAFAFA - Off-white base
    } else if (scheme === 2) {
      this.scene.background = new THREE.Color(0x0a0e27); // Default dark navy for scheme 2
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Default dark navy
      uniforms.uGradientSize.value = 1.0; // Default size
      uniforms.uGradientCount.value = 6.0; // Default count
      uniforms.uSpeed.value = 1.2; // Default speed
      uniforms.uColor1Weight.value = 1.0; // Default weight
      uniforms.uColor2Weight.value = 1.0; // Default weight
    } else {
      this.scene.background = new THREE.Color(0x0a0e27); // Default dark navy
      uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153); // #0a0e27 - Default dark navy
      uniforms.uGradientSize.value = 1.0; // Default size
      uniforms.uGradientCount.value = 6.0; // Default count
      uniforms.uSpeed.value = 1.2; // Default speed
      uniforms.uColor1Weight.value = 1.0; // Default weight
      uniforms.uColor2Weight.value = 1.0; // Default weight
    }
  }

  init() {
    this.gradientBackground.init();
    // Apply Scheme 1 settings on startup
    this.setColorScheme(1);

    // Force initial render to wake up the browser
    this.render();

    // Start animation loop
    this.tick();

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("mousemove", (ev) => this.onMouseMove(ev));
    window.addEventListener("touchmove", (ev) => this.onTouchMove(ev));

    // Handle visibility changes to prevent throttling
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // Force render when page becomes visible
        this.render();
      }
    });

    // Wake up animation on any user interaction
    const wakeUpAnimation = () => {
      this.render();
      window.removeEventListener("click", wakeUpAnimation);
      window.removeEventListener("touchstart", wakeUpAnimation);
      window.removeEventListener("mousemove", wakeUpAnimation);
    };
    window.addEventListener("click", wakeUpAnimation, { once: true });
    window.addEventListener("touchstart", wakeUpAnimation, { once: true });
    window.addEventListener("mousemove", wakeUpAnimation, { once: true });
  }

  onTouchMove(ev) {
    const touch = ev.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  onMouseMove(ev) {
    this.mouse = {
      x: ev.clientX / window.innerWidth,
      y: 1 - ev.clientY / window.innerHeight
    };
    this.touchTexture.addTouch(this.mouse);
  }

  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(
      this.camera.position.z * Math.tan(fovInRadians / 2) * 2
    );
    return { width: height * this.camera.aspect, height };
  }

  update(delta) {
    this.touchTexture.update();
    this.gradientBackground.update(delta);
  }

  render() {
    const delta = this.clock.getDelta();
    // Only update if delta is reasonable (prevents large jumps)
    const clampedDelta = Math.min(delta, 0.1);
    this.renderer.render(this.scene, this.camera);
    this.update(clampedDelta);
  }

  tick() {
    this.render();
    // Use arrow function to maintain context and ensure continuous rendering
    requestAnimationFrame(() => this.tick());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
  }
}

// Start the app
const app = new App();

// Force animation to start immediately by triggering a render
// This helps prevent browser throttling of requestAnimationFrame
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    app.render();
  });
} else {
  // DOM already loaded, force immediate render
  setTimeout(() => app.render(), 0);
}

// Color scheme buttons
const colorButtons = document.querySelectorAll(".color-btn");
colorButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const scheme = parseInt(btn.dataset.scheme);
    app.setColorScheme(scheme);

    // Update active state
    colorButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Update color pickers when scheme changes
    updateColorPickersFromScheme();
  });
});

// Color Adjuster Panel Functions
const colorAdjusterPanel = document.getElementById("colorAdjusterPanel");
const toggleAdjusterBtn = document.getElementById("toggleAdjusterBtn");
const closeAdjusterBtn = document.getElementById("closeAdjusterBtn");

// Toggle panel
toggleAdjusterBtn.addEventListener("click", () => {
  colorAdjusterPanel.classList.toggle("open");
  if (colorAdjusterPanel.classList.contains("open")) {
    updateColorPickersFromScheme();
    toggleAdjusterBtn.style.display = "none";
  } else {
    toggleAdjusterBtn.style.display = "block";
  }
});

closeAdjusterBtn.addEventListener("click", () => {
  colorAdjusterPanel.classList.remove("open");
  toggleAdjusterBtn.style.display = "block";
});

// Convert RGB (0-1) to Hex
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

// Convert Hex to RGB (0-1)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : null;
}

// Update color pickers from current scheme
function updateColorPickersFromScheme() {
  const uniforms = app.gradientBackground.uniforms;
  const colors = [
    uniforms.uColor1.value,
    uniforms.uColor2.value,
    uniforms.uColor3.value,
    uniforms.uColor4.value,
    uniforms.uColor5.value,
    uniforms.uColor6.value
  ];

  colors.forEach((color, index) => {
    const picker = document.getElementById(`colorPicker${index + 1}`);
    const display = document.getElementById(`colorValue${index + 1}`);
    const hex = rgbToHex(color.x, color.y, color.z);
    picker.value = hex;
    display.value = hex.toUpperCase();
  });
}

// Update gradient when color picker changes
for (let i = 1; i <= 6; i++) {
  const picker = document.getElementById(`colorPicker${i}`);
  const display = document.getElementById(`colorValue${i}`);

  picker.addEventListener("input", (e) => {
    const hex = e.target.value;
    const rgb = hexToRgb(hex);

    if (rgb) {
      const uniforms = app.gradientBackground.uniforms;
      const colorUniform = uniforms[`uColor${i}`];

      if (colorUniform) {
        colorUniform.value.set(rgb.r, rgb.g, rgb.b);
        display.value = hex.toUpperCase();
      }
    }
  });
}

// Copy color value
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const colorIndex = e.target.dataset.copy;
    const display = document.getElementById(`colorValue${colorIndex}`);
    const text = display.value;

    navigator.clipboard.writeText(text).then(() => {
      e.target.textContent = "Copied!";
      e.target.classList.add("copied");
      setTimeout(() => {
        e.target.textContent = "Copy";
        e.target.classList.remove("copied");
      }, 2000);
    });
  });
});

// Export all colors
const exportAllBtn = document.getElementById("exportAllBtn");
exportAllBtn.addEventListener("click", () => {
  const colors = [];
  for (let i = 1; i <= 6; i++) {
    const display = document.getElementById(`colorValue${i}`);
    colors.push(display.value);
  }

  const exportText = `Color Scheme:\n${colors
    .map((c, i) => `Color ${i + 1}: ${c}`)
    .join("\n")}\n\nHex Array: [${colors.map((c) => `"${c}"`).join(", ")}]`;

  navigator.clipboard.writeText(exportText).then(() => {
    exportAllBtn.textContent = "Copied!";
    exportAllBtn.style.background = "rgba(76, 175, 80, 0.3)";
    exportAllBtn.style.borderColor = "rgba(76, 175, 80, 0.5)";
    setTimeout(() => {
      exportAllBtn.textContent = "Export All Colors";
      exportAllBtn.style.background = "";
      exportAllBtn.style.borderColor = "";
    }, 2000);
  });
});

// Custom cursor
const cursor = document.getElementById("customCursor");
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

let isCursorAnimating = false;
function animateCursor() {
  if (!isCursorAnimating) return;
  // Instant following - no delay
  cursorX = mouseX;
  cursorY = mouseY;

  cursor.style.left = cursorX + "px";
  cursor.style.top = cursorY + "px";

  requestAnimationFrame(animateCursor);
}

// Only start animation when mouse moves
document.addEventListener(
  "mousemove",
  () => {
    if (!isCursorAnimating) {
      isCursorAnimating = true;
      animateCursor();
    }
  },
  { once: false }
);

// Cursor animation starts on first mouse move

// Make cursor larger on hover over interactive elements
const footerLink = document.querySelector(".footer a");
footerLink.addEventListener("mouseenter", () => {
  cursor.style.width = "50px";
  cursor.style.height = "50px";
  cursor.style.borderWidth = "3px";
});
footerLink.addEventListener("mouseleave", () => {
  cursor.style.width = "40px";
  cursor.style.height = "40px";
  cursor.style.borderWidth = "2px";
});

// Make cursor larger on hover over color buttons
colorButtons.forEach((btn) => {
  btn.addEventListener("mouseenter", () => {
    cursor.style.width = "50px";
    cursor.style.height = "50px";
    cursor.style.borderWidth = "3px";
  });
  btn.addEventListener("mouseleave", () => {
    cursor.style.width = "40px";
    cursor.style.height = "40px";
    cursor.style.borderWidth = "2px";
  });
});

// Make cursor larger on hover over toggle adjuster button
toggleAdjusterBtn.addEventListener("mouseenter", () => {
  cursor.style.width = "50px";
  cursor.style.height = "50px";
  cursor.style.borderWidth = "3px";
});
toggleAdjusterBtn.addEventListener("mouseleave", () => {
  cursor.style.width = "40px";
  cursor.style.height = "40px";
  cursor.style.borderWidth = "2px";
});

// Optimized pulse effect - use requestAnimationFrame instead of setTimeout
let lastMouseMoveTime = 0;
let pulseFrame = null;
function checkPulse() {
  if (Date.now() - lastMouseMoveTime > 100) {
    cursor.style.borderWidth = "2px";
    pulseFrame = null;
  } else {
    pulseFrame = requestAnimationFrame(checkPulse);
  }
}
document.addEventListener("mousemove", () => {
  lastMouseMoveTime = Date.now();
  cursor.style.borderWidth = "2.5px";
  if (!pulseFrame) {
    pulseFrame = requestAnimationFrame(checkPulse);
  }
});
