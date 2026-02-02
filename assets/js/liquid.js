/* global THREE */

// Liquid chrome background for the HERO
// - studio-like reflections (softboxes)
// - strong, "finger drag" interaction via a touch texture
// - pointer tracking is window-level, so overlays won't break it

class TouchTexture {
  constructor() {
    this.size = 256;
    this.width = this.height = this.size;

    // How long the trail lives (frames).
    this.maxAge = 130;
    this.speed = 1 / this.maxAge;
    this.radius = 0.40 * this.size;

    this.trail = [];
    this.last = null;
    this.isDown = false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.texture = new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;
  }

  setPointerDown(v) {
    this.isDown = !!v;
    if (!v) this.last = null; // prevents long jumps when re-entering
  }

  resetLast() {
    this.last = null;
  }

  addTouch(point) {
    let force = 0.22; // floor so slow movement still shows
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const dd = dx * dx + dy * dy;
      if (dd < 1e-9) return;

      const d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;

      // Stable force: based on distance, not dd*huge. Clamp to [0..1].
      force = Math.min(1.0, Math.max(0.22, d * 10.0));
    }

    if (this.isDown) force = Math.min(1.0, force * 1.35);

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPoint(p) {
    const pos = { x: p.x * this.width, y: p.y * this.height };

    // Ease in/out for better "viscous" look.
    let intensity = 1;
    if (p.age < this.maxAge * 0.25) {
      intensity = Math.sin((p.age / (this.maxAge * 0.25)) * (Math.PI / 2));
    } else {
      const t = 1 - (p.age - this.maxAge * 0.25) / (this.maxAge * 0.75);
      intensity = -t * (t - 2);
    }
    intensity *= p.force;

    const radius = this.radius;
    const offset = this.size * 2.2;

    // Encode velocity (rg) + intensity (b) into the "shadow" color.
    const r = ((p.vx + 1) / 2) * 255;
    const g = ((p.vy + 1) / 2) * 255;
    const b = intensity * 255;
    const color = `${r}, ${g}, ${b}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.42 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255,0,0,1)'; // not visible; only writes to the shadow
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.clear();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const f = p.force * this.speed * (1 - p.age / this.maxAge);

      // A small "follow" makes it feel viscous
      p.x += p.vx * f * 0.65;
      p.y += p.vy * f * 0.65;
      p.age++;

      if (p.age > this.maxAge) this.trail.splice(i, 1);
      else this.drawPoint(p);
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
      uTouchTexture: { value: null },

      // Tuning
      uIdleMotion: { value: 0.022 },  // 0.0..0.06
      uTouchStrength: { value: 0.38 }, // 0.15..0.55
      uRoughness: { value: 0.075 },   // lower = sharper reflections
      uSpecular: { value: 2.05 },     // higher = brighter softboxes
      uGrain: { value: 0.020 }
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
        uniform float uTime;
        uniform vec2 uResolution;
        uniform sampler2D uTouchTexture;

        uniform float uIdleMotion;
        uniform float uTouchStrength;
        uniform float uRoughness;
        uniform float uSpecular;
        uniform float uGrain;

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
          for(int i=0;i<4;i++){
            v += a * noise(p);
            p = m * p;
            a *= 0.55;
          }
          return v;
        }

        vec2 curl(vec2 p){
          float e = 0.002;
          float n1 = fbm(p + vec2(0.0, e));
          float n2 = fbm(p - vec2(0.0, e));
          float a  = (n1 - n2) / (2.0 * e);
          float n3 = fbm(p + vec2(e, 0.0));
          float n4 = fbm(p - vec2(e, 0.0));
          float b  = (n3 - n4) / (2.0 * e);
          return vec2(a, -b);
        }

        float softRect(vec2 p, vec2 c, vec2 s, float blur){
          vec2 d = abs(p - c) - s;
          float outside = length(max(d, 0.0));
          float inside = min(max(d.x, d.y), 0.0);
          return 1.0 - smoothstep(0.0, blur, outside + inside);
        }

        vec3 envColor(vec3 r){
          // Project to 2D "environment plane" (studio wall)
          vec2 p = r.xy / (abs(r.z) + 0.65);

          // Base studio gradient
          float sky = smoothstep(-0.55, 0.95, r.y);
          vec3 base = mix(vec3(0.05,0.05,0.055), vec3(0.70,0.72,0.76), sky);

          // Softboxes (big white reflections)
          float sb1 = softRect(p, vec2(-0.10, 0.22), vec2(0.85, 0.11), 0.08);
          float sb2 = softRect(p, vec2( 0.30, 0.04), vec2(0.60, 0.07), 0.06);
          float sb3 = softRect(p, vec2(-0.05,-0.30), vec2(0.90, 0.18), 0.12);

          // Thin strip highlight (photostudio tube)
          float strip = softRect(p, vec2(0.35, 0.44), vec2(0.70, 0.03), 0.06);

          vec3 lights = vec3(0.0);
          lights += vec3(1.0) * sb1 * 1.00;
          lights += vec3(1.0) * sb2 * 0.70;
          lights += vec3(1.0) * sb3 * 0.26;
          lights += vec3(1.0) * strip * 0.90;

          base += lights;
          return clamp(base, 0.0, 2.0);
        }

        float filmGrain(vec2 uv, float t){
          vec2 g = uv * uResolution * 0.35;
          float n = fract(sin(dot(g + t*11.7, vec2(12.9898, 78.233))) * 43758.5453);
          return n * 2.0 - 1.0;
        }

        void main(){
          vec2 uv = vUv;
          float t = uTime * 0.18;

          // Touch map encodes velocity and intensity
          vec4 touch = texture2D(uTouchTexture, uv);
          vec2 dir = (touch.rg * 2.0 - 1.0);
          float inten = clamp(touch.b, 0.0, 1.0);

          // A very small idle flow (so it doesn't feel "alive" when you don't touch)
          vec2 flow = curl(uv * 2.2 + t);
          uv += flow * uIdleMotion;

          // Interaction displacement
          uv += dir * (inten * uTouchStrength * 0.18);

          // Height field (continuous => no "islands")
          float h  = fbm(uv * 2.0 + vec2(0.0, t));
          h += fbm(uv * 5.0 - vec2(t*0.6, t*0.35)) * 0.22;
          h += inten * 0.55;

          // Screen-space normal from height derivatives
          float dx = dFdx(h);
          float dy = dFdy(h);
          vec3 n = normalize(vec3(-dx * 10.0, -dy * 10.0, 1.0));

          vec3 vDir = vec3(0.0, 0.0, 1.0);
          vec3 r = reflect(-vDir, n);

          // Fresnel for metallic edges
          float ndv = clamp(dot(n, vDir), 0.0, 1.0);
          float fres = pow(1.0 - ndv, 4.5);

          // Environment (studio reflections)
          vec3 env = envColor(r);

          // Specular highlight from a key light
          vec3 lDir = normalize(vec3(-0.35, 0.55, 0.72));
          float specPow = mix(50.0, 180.0, 1.0 - uRoughness);
          float spec = pow(clamp(dot(reflect(-lDir, n), vDir), 0.0, 1.0), specPow);

          // Base metal (dark) + reflections
          vec3 base = vec3(0.06, 0.06, 0.065);
          vec3 col = mix(base, env, 0.78 + 0.18 * fres);
          col += spec * uSpecular;

          // Subtle shading from height (gives depth without looking "cotton")
          col += (h - 0.5) * vec3(0.08, 0.08, 0.10);

          // Grain
          float g = filmGrain(vUv, uTime);
          col += g * uGrain;

          // Gentle tone mapping & gamma-ish
          col = col / (1.0 + col);
          col = pow(clamp(col, 0.0, 1.0), vec3(0.92));

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
    const hero = this.container.closest('.liquid-hero') || this.container;

    const insideHero = (clientX, clientY) => {
      const r = hero.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = (clientY - r.top) / r.height;
      return {
        ok: x >= 0 && x <= 1 && y >= 0 && y <= 1,
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y))
      };
    };

    // Window-level pointer tracking (so TV canvas / overlays can't break it)
    const onPointerMove = (e) => {
      const p = insideHero(e.clientX, e.clientY);
      if (!p.ok) return;
      this.touchTexture.addTouch({ x: p.x, y: p.y });
    };

    const onPointerDown = () => this.touchTexture.setPointerDown(true);
    const onPointerUp = () => this.touchTexture.setPointerDown(false);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    // If the pointer leaves the hero, reset last to avoid long jumps.
    hero.addEventListener('pointerleave', () => this.touchTexture.resetLast(), { passive: true });

    window.addEventListener('resize', () => this.resize());
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
  const mount = document.getElementById('liquid-bg');
  if (!mount) return;
  if (!window.THREE) return;
  new LiquidApp(mount);
})();
