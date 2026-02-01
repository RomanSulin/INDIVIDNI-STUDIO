/* global THREE */

class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d", { alpha: false });

    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.texture = new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;
  }

  addTouch(point) {
    let force = 0;
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
      force = Math.min(dd * 20000, 2.0);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPoint(p) {
    const pos = { x: p.x * this.width, y: (1 - p.y) * this.height };

    let intensity = 1;
    if (p.age < this.maxAge * 0.3) {
      intensity = Math.sin((p.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (p.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= p.force;

    const radius = this.radius;
    const offset = this.size * 5;

    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)"; // не видно, это “карта” для искажений
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.clear();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const f = p.force * this.speed * (1 - p.age / this.maxAge);

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

class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;

    this.uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(1, 1) },

    uColor1: { value: new THREE.Vector3(0.060, 0.062, 0.068) }, // #0f1011
    uColor2: { value: new THREE.Vector3(0.105, 0.110, 0.122) }, // #1b1c1f
    uColor3: { value: new THREE.Vector3(0.185, 0.192, 0.210) }, // #2f3136
    uColor4: { value: new THREE.Vector3(0.310, 0.325, 0.350) }, // #4f5359
    uColor5: { value: new THREE.Vector3(0.520, 0.540, 0.575) }, // #858a92
    uColor6: { value: new THREE.Vector3(0.720, 0.740, 0.785) }, // #b8bdc8

  // ВАЖНО: один раз и не синий
    uDarkNavy: { value: new THREE.Vector3(0.055, 0.058, 0.070) }, // deep silver shadow

    uSpeed: { value: 1.15 },
    uIntensity: { value: 1.22 },       // ниже контраст, больше "металл"
  uTouchTexture: { value: null },
    uGrainIntensity: { value: 0.035 },

    uGradientSize: { value: 0.62 },
  uGradientCount: { value: 12.0 },
    uColor1Weight: { value: 0.9 },
    uColor2Weight: { value: 1.1 }
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

        uniform vec3 uDarkNavy;
        uniform float uGradientSize;
        uniform float uGradientCount;
        uniform float uColor1Weight;
        uniform float uColor2Weight;

        varying vec2 vUv;

        float grain(vec2 uv, float time) {
          vec2 gUv = uv * uResolution * 0.5;
          float g = fract(sin(dot(gUv + time, vec2(12.9898, 78.233))) * 43758.5453);
          return g * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          float r = uGradientSize;

          vec2 c1 = vec2(0.5 + sin(time*uSpeed*0.40)*0.40, 0.5 + cos(time*uSpeed*0.50)*0.40);
          vec2 c2 = vec2(0.5 + cos(time*uSpeed*0.60)*0.50, 0.5 + sin(time*uSpeed*0.45)*0.50);
          vec2 c3 = vec2(0.5 + sin(time*uSpeed*0.35)*0.45, 0.5 + cos(time*uSpeed*0.55)*0.45);
          vec2 c4 = vec2(0.5 + cos(time*uSpeed*0.50)*0.40, 0.5 + sin(time*uSpeed*0.40)*0.40);
          vec2 c5 = vec2(0.5 + sin(time*uSpeed*0.70)*0.35, 0.5 + cos(time*uSpeed*0.60)*0.35);
          vec2 c6 = vec2(0.5 + cos(time*uSpeed*0.45)*0.50, 0.5 + sin(time*uSpeed*0.65)*0.50);

          float i1 = 1.0 - smoothstep(0.0, r, length(uv - c1));
          float i2 = 1.0 - smoothstep(0.0, r, length(uv - c2));
          float i3 = 1.0 - smoothstep(0.0, r, length(uv - c3));
          float i4 = 1.0 - smoothstep(0.0, r, length(uv - c4));
          float i5 = 1.0 - smoothstep(0.0, r, length(uv - c5));
          float i6 = 1.0 - smoothstep(0.0, r, length(uv - c6));

          vec3 col = vec3(0.0);
          col += uColor1 * i1 * (0.55 + 0.45 * sin(time*uSpeed)) * uColor1Weight;
          col += uColor2 * i2 * (0.55 + 0.45 * cos(time*uSpeed*1.2)) * uColor2Weight;
          col += uColor3 * i3 * (0.55 + 0.45 * sin(time*uSpeed*0.8)) * uColor1Weight;
          col += uColor4 * i4 * (0.55 + 0.45 * cos(time*uSpeed*1.3)) * uColor2Weight;
          col += uColor5 * i5 * (0.55 + 0.45 * sin(time*uSpeed*1.1)) * uColor1Weight;
          col += uColor6 * i6 * (0.55 + 0.45 * cos(time*uSpeed*0.9)) * uColor2Weight;

          col = clamp(col, vec3(0.0), vec3(1.0)) * uIntensity;

          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(lum), col, 0.78);
          col = pow(col, vec3(1.06));

          float b = length(col);
          float mixF = max(b * 1.2, 0.15);
          col = mix(uDarkNavy, col, mixF);

          return clamp(col, vec3(0.0), vec3(1.0));
        }

        void main() {
          vec2 uv = vUv;

          vec4 touch = texture2D(uTouchTexture, uv);
          float vx = -(touch.r * 2.0 - 1.0);
          float vy = -(touch.g * 2.0 - 1.0);
          float inten = touch.b;

          uv.x += vx * 0.8 * inten;
          uv.y += vy * 0.8 * inten;

          vec2 center = vec2(0.5);
          float dist = length(uv - center);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.018 * inten;
          float wave   = sin(dist * 15.0 - uTime * 2.0) * 0.014 * inten;
          uv += vec2(ripple + wave);

          // base (multi-sample) to get a softer, more "liquid" look
vec3 c0 = getGradientColor(uv, uTime);
vec3 c1 = getGradientColor(uv + vec2( 0.004, -0.003), uTime);
vec3 c2 = getGradientColor(uv + vec2(-0.003,  0.004), uTime);
vec3 color = (c0 + c1 + c2) / 3.0;

// pseudo-normal from luminance for metallic highlights
float h  = dot(color, vec3(0.3333));
float hx = dot(getGradientColor(uv + vec2(0.006, 0.000), uTime), vec3(0.3333));
float hy = dot(getGradientColor(uv + vec2(0.000, 0.006), uTime), vec3(0.3333));
vec3 n = normalize(vec3((h - hx) * 4.2, (h - hy) * 4.2, 1.0));

vec3 v = vec3(0.0, 0.0, 1.0);
vec3 l = normalize(vec3(-0.35, 0.55, 0.75));
vec3 hdir = normalize(l + v);

float diff = clamp(dot(n, l), 0.0, 1.0);
float spec = pow(clamp(dot(n, hdir), 0.0, 1.0), 72.0);
float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

// build "silver liquid metal" response (less contrast, more chrome)
vec3 base = mix(vec3(0.20, 0.21, 0.23), color, 0.70);
vec3 metal = base + diff * 0.11 + spec * 0.28 + fres * 0.07;

// soft tonemapping + contrast compression
metal = metal / (metal + vec3(1.05));
metal = mix(metal, vec3(dot(metal, vec3(0.3333))), 0.38); // push to silver
metal = 0.5 + (metal - 0.5) * 0.72;

float g = grain(uv, uTime);
metal += g * uGrainIntensity;

gl_FragColor = vec4(clamp(metal, 0.0, 1.0), 1.0);
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

    this.resize();
    this.container.appendChild(this.renderer.domElement);

    this.gradient.init();
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
    const hero = this.container.closest(".liquid-hero") || this.container;

    const onMove = (clientX, clientY) => {
      const r = hero.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = 1 - (clientY - r.top) / r.height;
      this.touchTexture.addTouch({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y))
      });
    };

    hero.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), { passive: true });
    hero.addEventListener("touchmove", (e) => {
      if (!e.touches || !e.touches[0]) return;
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener("resize", () => this.resize());
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

    this.touchTexture.update();
    this.gradient.update(delta);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }
}

// Start
(function initLiquid() {
  const mount = document.getElementById("liquid-bg");
  if (!mount) return;

  // если three.js не загрузился — не падаем
  if (!window.THREE) return;

  new LiquidApp(mount);
})();
