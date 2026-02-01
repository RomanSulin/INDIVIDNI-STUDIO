/* global THREE */

/**
 * Liquid background v7 — "chrome / liquid metal" look + reliable cursor/touch interaction.
 * - Strong studio-like reflections (softboxes + strips) for metallic feel
 * - TouchTexture encodes velocity (RG) and intensity (B) for "finger drag" trails
 * - Uses window pointermove so TV canvas / overlays can't block the effect
 */

class TouchTexture {
  constructor() {
    this.size = 128;
    this.width = this.height = this.size;

    // Longer trail for "drag"
    this.maxAge = 140;
    this.radius = 0.38 * this.size;

    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.clear();

    this.texture = new THREE.Texture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  addTouch(point) {
    let force = 0.6; // show effect immediately even for first point
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      if (dx === 0 && dy === 0) return;

      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);

      vx = dx / d;
      vy = dy / d;

      // More sensitive to slow motion; clamp for stability
      force = Math.min(dd * 90000 + 0.10, 2.0);
      force = Math.max(force, 0.18);
    }

    this.last = { x: point.x, y: point.y };

    this.trail.push({
      x: point.x,
      y: point.y,
      age: 0,
      force,
      vx,
      vy
    });
  }

  update(delta) {
    // fade to black (cheap decay)
    this.ctx.fillStyle = "rgba(0,0,0,0.07)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // draw points
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      p.age += 1;
      if (p.age > this.maxAge) {
        this.trail.splice(i, 1);
        i--;
        continue;
      }
      this.drawPoint(p);
    }

    this.texture.needsUpdate = true;
  }

  drawPoint(p) {
    const pos = { x: p.x * this.width, y: (1 - p.y) * this.height };

    let intensity = 1;
    if (p.age < this.maxAge * 0.25) {
      intensity = Math.sin((p.age / (this.maxAge * 0.25)) * (Math.PI / 2));
    } else {
      const t = 1 - (p.age - this.maxAge * 0.25) / (this.maxAge * 0.75);
      intensity = -t * (t - 2);
    }

    intensity *= p.force;
    intensity = Math.max(0, Math.min(1, intensity));

    const radius = this.radius;
    const offset = this.size * 3;

    // RG: velocity in 0..255, B: intensity in 0..255
    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.36 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)"; // hidden; only shadow matters
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },

      uSpeed: { value: 1.25 },
      uIntensity: { value: 1.0 },

      uTouchTexture: { value: null },
      uTouchStrength: { value: 0.30 },   // "finger drag" strength
      uIdleMotion: { value: 0.04 },      // idle waves; keep subtle

      uMetalness: { value: 0.98 },
      uSpecular: { value: 1.75 },
      uRoughness: { value: 0.10 },       // lower = sharper highlights

      uGrainIntensity: { value: 0.035 }
    };
  }

  init() {
    const view = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(view.width, view.height, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;

        uniform float uSpeed;
        uniform float uIntensity;

        uniform sampler2D uTouchTexture;
        uniform float uTouchStrength;
        uniform float uIdleMotion;

        uniform float uMetalness;
        uniform float uSpecular;
        uniform float uRoughness;

        uniform float uGrainIntensity;

        varying vec2 vUv;

        // hash / noise
        float hash12(vec2 p){
          vec3 p3  = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          float a = hash12(i + vec2(0.0,0.0));
          float b = hash12(i + vec2(1.0,0.0));
          float c = hash12(i + vec2(0.0,1.0));
          float d = hash12(i + vec2(1.0,1.0));
          return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
        }

        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.52;
          mat2 m = mat2(1.7, -1.2, 1.2, 1.7);
          for(int i=0;i<6;i++){
            v += a * noise(p);
            p = m * p;
            a *= 0.52;
          }
          return v;
        }

        vec2 curl(vec2 p){
          float e = 0.0028;
          float n1 = fbm(p + vec2(0.0, e));
          float n2 = fbm(p - vec2(0.0, e));
          float a  = (n1 - n2) / (2.0 * e);
          float n3 = fbm(p + vec2(e, 0.0));
          float n4 = fbm(p - vec2(e, 0.0));
          float b  = (n3 - n4) / (2.0 * e);
          return vec2(a, -b);
        }

        float grain(vec2 uv, float time){
          vec2 gUv = uv * uResolution * 0.35;
          float g = fract(sin(dot(gUv + time*11.17, vec2(12.9898, 78.233))) * 43758.5453);
          return g * 2.0 - 1.0;
        }

        // "studio" environment — bright softboxes on dark stage
        vec3 envColor(vec3 r){
          r = normalize(r);

          float y = clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 base = mix(vec3(0.006,0.0065,0.008), vec3(0.14,0.145,0.155), pow(y, 1.6));

          // overhead softbox
          float sb1 = pow(max(dot(r, normalize(vec3(0.0, 0.86, 0.52))), 0.0), 34.0);
          base += sb1 * vec3(2.6);

          // side softbox
          float sb2 = pow(max(dot(r, normalize(vec3(0.78, 0.22, 0.58))), 0.0), 52.0);
          base += sb2 * vec3(1.6);

          // long strip light
          float stripY = exp(-pow((r.y - 0.14) * 10.0, 2.0));
          float stripX = smoothstep(0.92, 0.18, abs(r.x));
          base += (stripY * stripX) * vec3(1.8);

          // subtle floor bounce
          float floorB = smoothstep(-0.85, 0.25, r.y);
          base += floorB * vec3(0.035,0.037,0.04);

          return base;
        }

        void main(){
          vec2 uv = vUv;

          // Touch vector field
          vec4 touch = texture2D(uTouchTexture, uv);
          vec2 v = (touch.rg * 2.0 - 1.0);
          float inten = clamp(touch.b * 1.75, 0.0, 1.0);

          float t = uTime * (0.22 * uSpeed);

          // base flow (idle)
          vec2 p = (uv - 0.5) * 2.2;
          vec2 flow = curl(p * 1.35 + vec2(t, -t*0.9));
          uv += flow * (0.020 * uIdleMotion);

          // finger drag: warp uv along velocity field
          uv += v * (uTouchStrength * inten);

          // height field (more "metal" when highlights have structure)
          vec2 q = (uv - 0.5) * 2.6;
          float h = fbm(q * 1.85 + vec2(0.0, t));
          h += fbm(q * 4.25 - vec2(t*0.8, t*0.55)) * 0.52;
          h += fbm(q * 8.0 + vec2(t*1.15, -t*0.7)) * 0.22;

          // emboss from touch
          h += inten * 1.05;

          // tighten midrange for crisper highlights (avoid "cotton")
          h = smoothstep(0.18, 0.92, h);

          // normal from height derivatives
          float dx = dFdx(h);
          float dy = dFdy(h);
          vec3 n = normalize(vec3(-dx * 14.0, -dy * 14.0, 1.0));

          vec3 vDir = vec3(0.0, 0.0, 1.0);
          vec3 r = reflect(-vDir, n);

          // fresnel
          float NdV = clamp(dot(n, vDir), 0.0, 1.0);
          float fres = pow(1.0 - NdV, 5.0);

          // metal F0 (silver)
          vec3 F0 = mix(vec3(0.62,0.63,0.64), vec3(0.96,0.97,0.98), uMetalness);
          vec3 F = mix(F0, vec3(1.0), fres);

          // env reflection + spec highlight
          vec3 env = envColor(r);

          // cheap microfacet-ish spec shaping with roughness
          float gloss = 1.0 - clamp(uRoughness, 0.02, 0.55);
          float specBoost = mix(0.9, 1.45, gloss);
          vec3 col = env * F * (uSpecular * specBoost);

          // add subtle directional light response (helps form)
          vec3 lDir = normalize(vec3(-0.20, 0.42, 0.88));
          float ndl = clamp(dot(n, lDir), 0.0, 1.0);
          col += env * (ndl * 0.08);

          // grain (very subtle)
          float g = grain(vUv, uTime);
          col += g * (uGrainIntensity * 0.22);

          // tiny "oil" darkening in troughs
          col += vec3(-0.03, -0.03, -0.032) * (0.55 - h);

          // tone map
          col = col / (1.0 + col);
          col = pow(col, vec3(0.92));
          col *= (0.95 + 0.10 * uIntensity);

          // vignette to keep text readable
          float vgn = smoothstep(0.98, 0.25, length(vUv - vec2(0.48, 0.52)));
          col *= 0.88 + 0.12 * vgn;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta) {
    this.uniforms.uTime.value += delta;
  }

  onResize() {
    const view = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(view.width, view.height, 1, 1);
    }
    this.uniforms.uResolution.value.set(this.sceneManager.width, this.sceneManager.height);
  }
}

class LiquidApp {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: false
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050507);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    this.camera.position.z = 50;

    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.gradient = new GradientBackground(this);
    this.gradient.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.init();
    this.bindEvents();
    this.tick();
  }

  init() {
    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // make canvas fill the mount
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";

    this.gradient.init();
    this.resize();

    requestAnimationFrame(() => this.tick());
  }

  get width() { return this.container.clientWidth; }
  get height() { return this.container.clientHeight; }

  getViewSize() {
    const fov = (this.camera.fov * Math.PI) / 180;
    const h = Math.abs(this.camera.position.z * Math.tan(fov / 2) * 2);
    return { width: h * this.camera.aspect, height: h };
  }

  bindEvents() {
    const hero = this.container.closest(".liquid-hero") || this.container;
    let rect = hero.getBoundingClientRect();

    const refreshRect = () => { rect = hero.getBoundingClientRect(); };

    const handleMove = (clientX, clientY) => {
      // fast bounds check
      const x = (clientX - rect.left) / rect.width;
      const y = 1 - (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      this.touchTexture.addTouch({ x, y });
    };

    // use window so other canvases can't swallow the event
    window.addEventListener("pointermove", (e) => handleMove(e.clientX, e.clientY), { passive: true });

    // mobile touch (fallback)
    window.addEventListener("touchmove", (e) => {
      if (!e.touches || !e.touches[0]) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener("resize", refreshRect, { passive: true });
    window.addEventListener("scroll", refreshRect, { passive: true, capture: true });
    refreshRect();
  }

  resize() {
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.gradient.onResize();
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.touchTexture.update(delta);
    this.gradient.update(delta);

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.tick());
  }
}

// Start
(function initLiquid() {
  const mount = document.getElementById("liquid-bg");
  if (!mount) return;

  // if three.js isn't loaded — fail silently
  if (!window.THREE) return;

  new LiquidApp(mount);
})();
