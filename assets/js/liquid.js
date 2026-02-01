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

  uColor1: { value: new THREE.Vector3(0, 0, 0) }, // #000000
  uColor2: { value: new THREE.Vector3(0, 0, 0) }, // #000000
  uColor3: { value: new THREE.Vector3(0, 0, 0) }, // #000000
  uColor4: { value: new THREE.Vector3(0.1412, 0.1412, 0.1412) }, // #242424
  uColor5: { value: new THREE.Vector3(0.2824, 0.2784, 0.2784) }, // #484747
  uColor6: { value: new THREE.Vector3(0, 0, 0) }, // #000000

  // ВАЖНО: один раз и не синий
  uDarkNavy: { value: new THREE.Vector3(0.02, 0.02, 0.03) }, // ≈ #050507

  uSpeed: { value: 1.5 },
  uIntensity: { value: 1.6 },       // можно 1.4–1.8
  uTouchTexture: { value: null },
  uGrainIntensity: { value: 0.08 },

  uGradientSize: { value: 0.45 },
  uGradientCount: { value: 12.0 },
  uColor1Weight: { value: 0.5 },
  uColor2Weight: { value: 1.8 }
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

        // -------------------- noise / fbm --------------------
        float hash(vec2 p){
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++){
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

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
          col = mix(vec3(lum), col, 1.35);
          col = pow(col, vec3(0.92));

          float b = length(col);
          float mixF = max(b * 1.2, 0.15);
          col = mix(uDarkNavy, col, mixF);

          return clamp(col, vec3(0.0), vec3(1.0));
        }

        // -------------------- liquid silver / metal shading --------------------
        vec3 silverMetal(vec2 uv, float time, float inten){
          // большие "потоки" + мелкая детализация
          vec2 p = uv * 2.8;
          p += vec2(0.12 * sin(time * 0.25), 0.10 * cos(time * 0.22));

          float n1 = fbm(p + time * 0.08);
          float n2 = fbm(p * 1.7 - time * 0.06);
          float h  = (n1 * 0.65 + n2 * 0.35);
          h += inten * 0.55;

          vec2 e = vec2(1.0 / max(uResolution.x, 1.0), 1.0 / max(uResolution.y, 1.0));
          float hx1 = fbm((uv + vec2(e.x, 0.0)) * 2.8 + time * 0.08);
          float hx2 = fbm((uv + vec2(e.x, 0.0)) * 2.8 * 1.7 - time * 0.06);
          float hy1 = fbm((uv + vec2(0.0, e.y)) * 2.8 + time * 0.08);
          float hy2 = fbm((uv + vec2(0.0, e.y)) * 2.8 * 1.7 - time * 0.06);
          float hx  = (hx1 * 0.65 + hx2 * 0.35) + inten * 0.55;
          float hy  = (hy1 * 0.65 + hy2 * 0.35) + inten * 0.55;

          // нормаль из "высоты"
          vec3 normal = normalize(vec3((h - hx) * 5.2, (h - hy) * 5.2, 1.0));

          vec3 lightDir = normalize(vec3(0.35, 0.55, 1.0));
          vec3 viewDir  = vec3(0.0, 0.0, 1.0);

          float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(clamp(dot(normal, halfDir), 0.0, 1.0), 120.0);
          float fres = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.0);

          // фейковое окружение (чтобы было похоже на "хром")
          vec3 refl = reflect(-viewDir, normal);
          float envT = smoothstep(-0.18, 0.80, refl.y);
          vec3 envCol = mix(vec3(0.10, 0.10, 0.11), vec3(0.96, 0.96, 0.98), envT);

          // виньетка, чтобы края уходили в тёмный
          float vign = smoothstep(0.98, 0.30, length(uv - vec2(0.52, 0.52)));

          vec3 col = envCol * (0.52 + 0.70 * diff);
          col += spec * vec3(1.40);
          col += fres * 0.28;
          col = mix(vec3(0.06, 0.06, 0.07), col, vign);

          // чуть контраста
          col = pow(col, vec3(0.90));
          return clamp(col, 0.0, 1.0);
        }

        void main() {
          vec2 uv = vUv;

          vec4 touch = texture2D(uTouchTexture, uv);
          float vx = -(touch.r * 2.0 - 1.0);
          float vy = -(touch.g * 2.0 - 1.0);
          float inten = touch.b;

          // touch + небольшие волны
          uv.x += vx * 0.8 * inten;
          uv.y += vy * 0.8 * inten;

          vec2 center = vec2(0.5);
          float dist = length(uv - center);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * inten;
          float wave   = sin(dist * 15.0 - uTime * 2.0) * 0.03 * inten;
          uv += vec2(ripple + wave);

          // базовый цвет (твой текущий фон)
          vec3 base = getGradientColor(uv, uTime);

          // серебряная "жидкость" сверху
          vec3 metal = silverMetal(uv, uTime, inten);

          // blend: 0.88 = практически полностью "серебро", но немного сохраняем фирменный фон
          vec3 color = mix(base, metal, 0.88);

          // зерно (слабее, чтобы не убить "хром")
          float g = grain(uv, uTime);
          color += g * (uGrainIntensity * 0.35);

          // почти монохром, но с живостью
          float l = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(l), color, 0.08);

          gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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
