/* global THREE */

/**
 * IMPORTANT: photoreal liquid metal like your refs is almost impossible to get
 * from pure noise without real reflections. This implementation supports:
 * 1) BEST LOOK (recommended): use a short seamless video loop as a texture:
 *    ./assets/ui/liquid_metal_loop.mp4  (muted loop, 3–6s, studio chrome render)
 *    The shader adds interactive "finger drag" displacement on top.
 * 2) Fallback: analytic chrome shading (no video) – still usable, but less real.
 */

class TouchTexture {
  constructor() {
    this.size = 128;
    this.width = this.height = this.size;
    this.maxAge = 150;
    this.radius = 0.42 * this.size;
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
    let force = 0.25;
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const dd = dx * dx + dy * dy;

      // keep some force even for slow movement
      force = Math.min(0.25 + dd * 14000, 1.6);

      const d = Math.sqrt(dd) || 1;
      vx = dx / d;
      vy = dy / d;
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

    // smooth age curve
    const t = p.age / this.maxAge;
    const fadeIn = Math.min(1, t / 0.12);
    const fadeOut = 1 - Math.max(0, (t - 0.15) / 0.85);
    let intensity = fadeIn * fadeOut;
    intensity *= p.force;

    const radius = this.radius;
    const offset = this.size * 3;

    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.36 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.clear();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];

      // slight advection along the velocity
      const drift = 0.0022 * p.force * (1 - p.age / this.maxAge);
      p.x += p.vx * drift;
      p.y += p.vy * drift;

      p.age++;

      if (p.age > this.maxAge) this.trail.splice(i, 1);
      else this.drawPoint(p);
    }

    this.texture.needsUpdate = true;
  }
}

class LiquidMetalApp {
  constructor(container) {
    this.container = container;
    this.hero = container.closest(".liquid-hero") || container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: false,
    });
    this.renderer.setClearColor(0x0b0c0f, 1);

    this.scene = new THREE.Scene();

    // ortho is simpler for full-screen plane
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();

    // video texture (best look)
    this.video = null;
    this.videoTexture = null;
    this.hasVideo = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTouchTexture: { value: this.touchTexture.texture },
      uTouchStrength: { value: 0.22 },  // interactive drag
      uIdleMotion: { value: 0.020 },     // subtle idle
      uSpecular: { value: 2.1 },
      uRoughness: { value: 0.07 },
      uMetalness: { value: 0.98 },
      uHasVideo: { value: 0.0 },
      uVideo: { value: null },
      uGrain: { value: 0.05 },
    };

    const geo = new THREE.PlaneGeometry(2, 2, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;

        uniform sampler2D uTouchTexture;
        uniform float uTouchStrength;
        uniform float uIdleMotion;

        uniform float uSpecular;
        uniform float uRoughness;
        uniform float uMetalness;

        uniform float uHasVideo;
        uniform sampler2D uVideo;

        uniform float uGrain;

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

        float grain(vec2 uv, float t){
          vec2 gUv = uv * uResolution * 0.35;
          float g = fract(sin(dot(gUv + t*11.17, vec2(12.9898, 78.233))) * 43758.5453);
          return g * 2.0 - 1.0;
        }

        // analytic "studio" environment: softboxes + stripes
        vec3 envColor(vec3 r){
          float sky = smoothstep(-0.25, 0.95, r.y*0.5 + 0.5);
          vec3 base = mix(vec3(0.06,0.065,0.075), vec3(0.92,0.93,0.95), sky);

          float strip1 = exp(-pow((r.y - 0.52) * 10.0, 2.0)) * smoothstep(0.95, 0.18, abs(r.x));
          float strip2 = exp(-pow((r.y + 0.05) * 16.0, 2.0)) * smoothstep(0.80, 0.12, abs(r.x + 0.35));
          float strip3 = exp(-pow((r.y - 0.74) * 18.0, 2.0)) * smoothstep(0.70, 0.16, abs(r.x - 0.42));

          base += strip1 * 0.70;
          base += strip2 * 0.45;
          base += strip3 * 0.40;

          return base;
        }

        vec3 chromeFallback(vec2 uv, vec2 tvec, float tI){
          // large-scale flowing height (no thresholds!)
          float time = uTime * 0.10;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // idle flow
          vec2 flow = vec2(
            fbm(p*1.4 + vec2(time, 0.0)) - 0.5,
            fbm(p*1.4 + vec2(0.0, time)) - 0.5
          );
          uv += flow * (uIdleMotion);

          // interactive drag
          uv += tvec * (uTouchStrength * tI);

          float h  = fbm((uv-0.5) * vec2(aspect,1.0) * 2.4 + vec2(time, -time*0.8));
          h += fbm((uv-0.5) * vec2(aspect,1.0) * 6.2 - vec2(time*0.9, time*0.55)) * 0.35;
          h += tI * 0.55;
          // keep it smooth
          h = h*0.9;

          // normal from derivatives
          float dx = dFdx(h);
          float dy = dFdy(h);
          vec3 n = normalize(vec3(-dx*8.0, -dy*8.0, 1.0));

          vec3 vDir = vec3(0.0, 0.0, 1.0);
          vec3 lDir = normalize(vec3(-0.25, 0.35, 0.86));

          float ndl  = clamp(dot(n, lDir), 0.0, 1.0);
          vec3 r = reflect(-vDir, n);
          vec3 env = envColor(r);

          float fres = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 4.0);
          float spec = pow(clamp(dot(reflect(-lDir, n), vDir), 0.0, 1.0), mix(40.0, 120.0, 1.0 - uRoughness));

          vec3 base = vec3(0.22,0.225,0.235);
          vec3 col = mix(base, env, uMetalness);
          col = mix(col, env, 0.35 + 0.35*fres);
          col += ndl * 0.08;
          col += spec * (0.65 * uSpecular);

          // slight shaping
          col += (h - 0.5) * vec3(0.03,0.03,0.04);

          // film grain
          col += grain(uv, uTime) * (uGrain * 0.18);

          // simple tonemap
          col = col / (col + vec3(1.0));
          col = pow(col, vec3(0.95));
          return clamp(col, 0.0, 1.0);
        }

        void main(){
          vec2 uv = vUv;

          vec4 touch = texture2D(uTouchTexture, uv);
          vec2 tvec = (touch.rg * 2.0 - 1.0);
          float tI = clamp(touch.b, 0.0, 1.0);

          if (uHasVideo > 0.5){
            // video-based liquid chrome: realistic base + interactive distortion
            vec2 uvd = uv;

            // subtle idle warp so it's not frozen if video is subtle
            float time = uTime * 0.12;
            float n = fbm((uv - 0.5) * 3.2 + vec2(time, -time));
            uvd += (n - 0.5) * 0.010;

            // finger drag
            uvd += tvec * (uTouchStrength * 0.9 * tI);

            // keep inside
            uvd = clamp(uvd, vec2(0.001), vec2(0.999));

            vec3 col = texture2D(uVideo, uvd).rgb;

            // grade to "silver"
            float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = mix(vec3(l), col, 0.22);
            col = mix(col, vec3(0.86,0.87,0.89), 0.10);

            // micro spec using fallback normal (adds crisp highlights)
            vec3 extra = chromeFallback(uv, tvec, tI);
            col = mix(col, extra, 0.28);

            gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
          } else {
            vec3 col = chromeFallback(uv, tvec, tI);
            gl_FragColor = vec4(col, 1.0);
          }
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mesh);

    this.resize();
    this.container.appendChild(this.renderer.domElement);

    this.bindEvents();
    this.tryVideo(); // best look if asset exists
    this.tick();
  }

  get width() { return Math.max(1, this.container.clientWidth); }
  get height() { return Math.max(1, this.container.clientHeight); }

  bindEvents() {
    const hero = this.hero;
    const addFromClient = (clientX, clientY) => {
      const r = hero.getBoundingClientRect();
      const inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      if (!inside) return;

      const x = (clientX - r.left) / r.width;
      const y = 1 - (clientY - r.top) / r.height;

      this.touchTexture.addTouch({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      });

      // start video on first interaction if autoplay was blocked
      if (this.video && this.video.paused) {
        this.video.play().catch(() => {});
      }
    };

    window.addEventListener("pointermove", (e) => addFromClient(e.clientX, e.clientY), { passive: true });
    window.addEventListener("pointerdown", (e) => addFromClient(e.clientX, e.clientY), { passive: true });

    window.addEventListener("resize", () => this.resize());
  }

  tryVideo() {
    // You MUST provide this file for the best realism:
    // ./assets/ui/liquid_metal_loop.mp4
    const srcMp4 = "./assets/ui/liquid_metal_loop.mp4";

    const v = document.createElement("video");
    v.src = srcMp4;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.preload = "auto";

    const onReady = () => {
      // create texture only when ready
      try {
        this.videoTexture = new THREE.VideoTexture(v);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBFormat;

        this.uniforms.uVideo.value = this.videoTexture;
        this.uniforms.uHasVideo.value = 1.0;
        this.video = v;

        // muted autoplay usually works; if not, starts on first pointerdown
        v.play().catch(() => {});
      } catch (_) {}
    };

    v.addEventListener("canplay", onReady, { once: true });
    v.addEventListener("error", () => {
      // no asset -> stay in fallback mode
      this.uniforms.uHasVideo.value = 0.0;
    }, { once: true });
  }

  resize() {
    const w = this.width;
    const h = this.height;

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.uniforms.uResolution.value.set(w, h);
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.uniforms.uTime.value += delta;

    this.touchTexture.update();

    if (this.videoTexture) this.videoTexture.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }
}

// Start
(function initLiquid() {
  const mount = document.getElementById("liquid-bg");
  if (!mount) return;
  if (!window.THREE) return;

  // keep canvas behind the hero content
  mount.style.position = "absolute";
  mount.style.inset = "0";
  mount.style.zIndex = "0";

  new LiquidMetalApp(mount);
})();
