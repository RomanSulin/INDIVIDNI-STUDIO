/* global THREE */

class TouchTexture {
  constructor() {
    this.size = 128;
    this.width = this.height = this.size;
    this.maxAge = 120;
    this.radius = 0.34 * this.size;
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
      force = Math.min(dd * 12000, 1.25);
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
    const offset = this.size * 3;

    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.34 * intensity})`;

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
  uniform float uSpeed;
  uniform float uIntensity;
  uniform sampler2D uTouchTexture;
  uniform float uGrainIntensity;

  varying vec2 vUv;

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

  vec2 curl(vec2 p){
    float e = 0.0025;
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

  void main(){
    vec2 uv = vUv;

    vec4 touch = texture2D(uTouchTexture, uv);
    vec2 v = (touch.rg * 2.0 - 1.0);
    float inten = clamp(touch.b * 1.65, 0.0, 1.0);

    float t = uTime * (0.18 * uSpeed);

    vec2 p = uv * 2.35;
    vec2 flow = curl(p + t);
    uv += flow * 0.025;
    uv += v * (0.12 * inten);

    vec2 q = uv;
    q = rot(q - 0.5, 0.35 * sin(t*1.3)) + 0.5;

    float h = fbm(q*3.25 + vec2(0.0, t));
    h += fbm(q*7.8 - vec2(t*0.85, t*0.55)) * 0.34;
    h += inten * 0.75;
    h = smoothstep(0.20, 0.86, h);

    float dx = dFdx(h);
    float dy = dFdy(h);
    vec3 n = normalize(vec3(-dx*7.2, -dy*7.2, 1.0));

    vec3 vDir = vec3(0.0, 0.0, 1.0);
    vec3 lDir = normalize(vec3(-0.24, 0.42, 0.86));

    float ndl  = clamp(dot(n, lDir), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-lDir, n), vDir), 0.0, 1.0), 72.0);
    float fres = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 4.6);

    vec3 r = reflect(-vDir, n);
    float sky = smoothstep(-0.25, 0.95, r.y*0.5 + 0.5);
    vec3 env = mix(vec3(0.16,0.165,0.175), vec3(0.86,0.88,0.90), sky);

    float stripY = exp(-pow((r.y - 0.55) * 7.5, 2.0));
    float stripX = smoothstep(0.95, 0.15, abs(r.x));
    env += (stripY * stripX) * 0.52;

    vec3 base = vec3(0.26,0.265,0.275);
    vec3 col = mix(base, env, 0.72 + 0.18*fres);
    col += ndl * 0.10;
    col += spec * 0.82;

    float g = grain(uv, uTime);
    col += g * (uGrainIntensity * 0.24);
    col += vec3(0.012, 0.012, 0.016) * (h - 0.5);

    col = mix(vec3(dot(col, vec3(0.333))), col, 0.90);
    col = clamp(col, 0.0, 1.0);
    col = pow(col, vec3(0.92));
    col *= (0.95 + 0.08 * uIntensity);

    float vgn = smoothstep(0.98, 0.25, length(vUv - 0.5));
    col *= 0.92 + 0.08 * vgn;

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
