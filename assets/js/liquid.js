/* global THREE */

/**
 * Liquid Silver background (WebGL)
 * - Subtle idle motion
 * - Strong pointer/touch-driven "finger drag" deformation
 * - Metallic lighting (specular + fresnel + env)
 */

class TouchTexture {
  constructor() {
    this.size = 128;
    this.width = this.height = this.size;
    this.maxAge = 120;
    this.radius = 0.34 * this.size;

    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // alpha:false => быстрее
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.clear();

    this.texture = new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  resetLast() {
    this.last = null;
  }

  addTouch(point) {
    let force = 0.35; // чтобы «первое касание» было видно
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const dd = dx * dx + dy * dy;
      if (dd < 1e-8) return;

      const d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;

      // force зависит от СКОРОСТИ, не от квадрата расстояния
      // так эффект есть даже при медленном движении мыши
      force = Math.min(Math.max(d * 220.0, 0.08), 1.0);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(p) {
    // touch texture UV: 0..1, WebGL uv y снизу -> рисуем с инверсией
    const pos = { x: p.x * this.width, y: (1 - p.y) * this.height };

    // fade-in / fade-out
    let t = 1;
    const inT = this.maxAge * 0.22;
    if (p.age < inT) {
      t = Math.sin((p.age / inT) * (Math.PI / 2));
    } else {
      const k = 1 - (p.age - inT) / (this.maxAge - inT);
      t = k * k;
    }

    const strength = Math.min(1, (0.25 + 0.75 * p.force) * t);
    const radius = this.radius;

    // Shadow trick: рисуем круг далеко, а цвет/интенсивность идёт в shadowColor
    const offset = this.size * 2.2;

    // R,G = направление, B = сила
    const r = ((p.vx + 1) * 0.5) * 255;
    const g = ((p.vy + 1) * 0.5) * 255;
    const b = strength * 255;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.55 * strength})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255,0,0,1)';
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.clear();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const f = (0.6 + 0.4 * p.force) * this.speed * (1 - p.age / this.maxAge);

      // лёгкое «растекание» следа
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.age++;

      if (p.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(p);
      }
    }

    this.texture.needsUpdate = true;
  }
}

class LiquidBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSpeed: { value: 1.0 },
      uTouchTexture: { value: null },
      uIdle: { value: 0.10 },         // насколько сильно фон «живёт» сам
      uTouchPower: { value: 1.0 },    // усиление реакции на касание
      uRoughness: { value: 0.28 },    // 0..1 (меньше = более зеркало)
      uGrain: { value: 0.035 },       // зерно/микрошум
      uExposure: { value: 1.10 }      // общая яркость
    };
  }

  init() {
    const view = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(view.width, view.height, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uSpeed;
        uniform sampler2D uTouchTexture;
        uniform float uIdle;
        uniform float uTouchPower;
        uniform float uRoughness;
        uniform float uGrain;
        uniform float uExposure;

        varying vec2 vUv;

        float hash12(vec2 p){
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
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
          float a = 0.55;
          mat2 m = mat2(1.6, -1.2, 1.2, 1.6);
          for(int i=0;i<5;i++){
            v += a * noise(p);
            p = m * p;
            a *= 0.55;
          }
          return v;
        }

        vec2 rot(vec2 p, float a){
          float s = sin(a), c = cos(a);
          return mat2(c,-s,s,c) * p;
        }

        float heightField(vec2 uv, float t, float inten){
          // базовый рельеф
          float h = fbm(uv * 3.2 + vec2(0.0, t));
          h += fbm(uv * 7.8 - vec2(t*0.85, t*0.55)) * 0.40;
          // усиление под касанием (как «палец продавил металл»)
          h += inten * 0.75;
          return h;
        }

        float grain(vec2 uv, float time){
          vec2 gUv = uv * uResolution * 0.35;
          float g = fract(sin(dot(gUv + time*11.17, vec2(12.9898, 78.233))) * 43758.5453);
          return g * 2.0 - 1.0;
        }

        void main(){
          vec2 uv = vUv;

          // touch map: RG = направление, B = сила
          vec4 touch = texture2D(uTouchTexture, uv);
          vec2 v = (touch.rg * 2.0 - 1.0);
          float inten = clamp(touch.b * uTouchPower, 0.0, 1.0);

          float t = uTime * (0.12 * uSpeed);

          // idle flow (очень мягко) + touch drag (сильно)
          float drive = mix(uIdle, 1.0, smoothstep(0.03, 0.22, inten));

          vec2 p = uv * 2.2;
          vec2 drift = vec2(
            fbm(p + vec2(0.0, t)) - 0.5,
            fbm(p + vec2(4.2, 1.7) - t) - 0.5
          );

          uv += drift * (0.030 * drive);
          uv += v * (0.18 * inten); // "тащим" жидкий металл

          // вращаем поле чуть-чуть, чтобы было более живо
          vec2 q = rot(uv - 0.5, 0.18 * sin(t*1.4)) + 0.5;

          // height
          float h = heightField(q, t, inten);

          // нормаль из height (finite diff)
          vec2 e = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
          float hx = heightField(q + vec2(e.x, 0.0), t, inten);
          float hy = heightField(q + vec2(0.0, e.y), t, inten);

          // bump amount зависит от roughness (более зеркало => сильнее нормали)
          float bump = mix(10.5, 6.5, clamp(uRoughness, 0.0, 1.0));
          vec3 n = normalize(vec3(-(hx - h) * bump, -(hy - h) * bump, 1.0));

          // lighting
          vec3 vDir = vec3(0.0, 0.0, 1.0);
          vec3 lDir = normalize(vec3(-0.22, 0.44, 0.86));

          float ndl = clamp(dot(n, lDir), 0.0, 1.0);

          // fresnel
          float fres = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 5.0);

          // specular
          float specPow = mix(55.0, 120.0, 1.0 - clamp(uRoughness, 0.0, 1.0));
          float spec = pow(clamp(dot(reflect(-lDir, n), vDir), 0.0, 1.0), specPow);

          // fake env reflection (sky vs ground + bright stripe)
          vec3 r = reflect(-vDir, n);
          float sky = smoothstep(-0.30, 0.95, r.y*0.55 + 0.45);
          vec3 env = mix(vec3(0.16,0.165,0.175), vec3(0.92,0.93,0.95), sky);

          float stripY = exp(-pow((r.y - 0.58) * 7.2, 2.0));
          float stripX = smoothstep(0.98, 0.18, abs(r.x));
          env += (stripY * stripX) * 0.55;

          // base silver
          vec3 base = vec3(0.27,0.275,0.285);
          vec3 col = mix(base, env, 0.70 + 0.22*fres);
          col += ndl * 0.06;

          // roughness reduces spec
          float specAmt = mix(0.95, 0.35, clamp(uRoughness, 0.0, 1.0));
          col += spec * specAmt;

          // micro shading from height (subtle)
          col += vec3(0.010,0.010,0.014) * (h - 0.55);

          // grain
          float g = grain(uv, uTime);
          col += g * (uGrain * 0.25);

          // exposure / gamma
          col *= uExposure;
          col = clamp(col, 0.0, 1.0);
          col = pow(col, vec3(0.92));

          // vignette
          float vgn = smoothstep(0.98, 0.25, length(vUv - 0.5));
          col *= 0.93 + 0.07 * vgn;

          gl_FragColor = vec4(col, 1.0);
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
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: false
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0c);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    this.camera.position.z = 50;

    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.bg = new LiquidBackground(this);
    this.bg.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.resize();
    this.container.appendChild(this.renderer.domElement);

    this.bg.init();
    this.bindEvents();
    this.tick();
  }

  get width() { return this.container.clientWidth; }
  get height() { return this.container.clientHeight; }

  getViewSize() {
    const fov = (this.camera.fov * Math.PI) / 180;
    const h = Math.abs(this.camera.position.z * Math.tan(fov / 2) * 2);
    return { width: h * this.camera.aspect, height: h };
  }

  bindEvents() {
    const hero = this.container.closest('.liquid-hero') || this.container;

    const inHero = (x, y) => {
      const r = hero.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const push = (clientX, clientY) => {
      const r = hero.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = 1 - (clientY - r.top) / r.height;
      this.touchTexture.addTouch({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y))
      });
    };

    // Важно: слушаем на window, чтобы не терять события над canvas/video
    window.addEventListener('pointermove', (e) => {
      if (!inHero(e.clientX, e.clientY)) {
        this.touchTexture.resetLast();
        return;
      }
      push(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (!inHero(e.clientX, e.clientY)) return;
      this.touchTexture.resetLast();
      push(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      if (!inHero(t.clientX, t.clientY)) {
        this.touchTexture.resetLast();
        return;
      }
      push(t.clientX, t.clientY);
    }, { passive: true });

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.bg.onResize();
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.touchTexture.update();
    this.bg.update(delta);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }
}

// Start
(function initLiquid() {
  const mount = document.getElementById('liquid-bg');
  if (!mount) return;
  if (!window.THREE) return;

  // Prevent double init (if hot reload)
  if (mount.__liquidApp) return;
  mount.__liquidApp = new LiquidApp(mount);
})();
