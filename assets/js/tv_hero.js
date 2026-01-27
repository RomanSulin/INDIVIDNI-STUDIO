/* global THREE */

(() => {
  const stage = document.querySelector("[data-tv-hero]");
  if (!stage) return console.error("[tvhero] stage not found");

  const canvas = stage.querySelector("#tvHeroCanvas");
  const video  = stage.querySelector("#tvHeroVideo");
  if (!canvas || !video) return console.error("[tvhero] canvas/video not found");

  if (!window.THREE || !THREE.FBXLoader) {
    return console.error("[tvhero] missing THREE / FBXLoader");
  }

  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // -------------------------
  // VIDEO
  // -------------------------
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  let videoAR = 16 / 9;

  // -------------------------
  // RENDERER / SCENE
  // -------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 3, 2);
  scene.add(key);

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // -------------------------
  // TV ROOT (rotate this)
  // -------------------------
  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  // cursor rotation (desktop only)
  let targetRotY = 0;
  let targetRotX = 0;
  let hoveringBtn = false;

  if (!isMobile) {
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointermove", (e) => {
      if (hoveringBtn) return;
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      const isLaptop = window.matchMedia("(max-height: 900px)").matches;
      targetRotY = nx * (isLaptop ? 0.34 : 0.45);
      targetRotX = -ny * (isLaptop ? 0.09 : 0.12);
    });
    canvas.addEventListener("pointerleave", () => {
      targetRotY = 0;
      targetRotX = 0;
    });
  }

  // -------------------------
  // TEXTURES / LOADING MANAGER
  // -------------------------
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const file = decodeURIComponent(url).split(/[\\/]/).pop();
    const f = (file || "").toLowerCase();
    const remap = {
      "retro_tv 1 basecolor.png": "./assets/models/retro_tv/textures/basecolor.png",
      "retro_tv 1 normal.png": "./assets/models/retro_tv/textures/normal.png",
      "retro_tv 1 roughness.png": "./assets/models/retro_tv/textures/roughness.png",
      "retro_tv 1 metallic.png": "./assets/models/retro_tv/textures/metallic.png",
      "retro_tv_1_basecolor.png": "./assets/models/retro_tv/textures/basecolor.png",
      "retro_tv_1_normal.png": "./assets/models/retro_tv/textures/normal.png",
      "retro_tv_1_roughness.png": "./assets/models/retro_tv/textures/roughness.png",
      "retro_tv_1_metallic.png": "./assets/models/retro_tv/textures/metallic.png",
    };
    return remap[f] || url;
  });

  const texLoader = new THREE.TextureLoader(manager);

  const base   = texLoader.load("./assets/models/retro_tv/textures/basecolor.png");
  const normal = texLoader.load("./assets/models/retro_tv/textures/normal.png");
  const rough  = texLoader.load("./assets/models/retro_tv/textures/roughness.png");
  const metal  = texLoader.load("./assets/models/retro_tv/textures/metallic.png");

  base.encoding = THREE.sRGBEncoding;

  // VideoTexture (обновляется сама — никаких updateVideoTexture не нужно)
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.generateMipmaps = false;
  videoTex.wrapS = videoTex.wrapT = THREE.ClampToEdgeWrapping;

  // -------------------------
  // SCREEN UV RECT (из твоего basecolor атласа)
  // -------------------------
  // px bbox: x[36..432], y[524..1036] on 2048x2048
  // converted to UV (three.js vUv: origin bottom-left)
  const U0 = 0.017578125;
  const U1 = 0.2109375;
  const V0 = 0.494140625;
  const V1 = 0.744140625;

  // -------------------------
  // MATERIAL: base + lighting, but screen UV gets video
  // -------------------------
  const bodyMat = new THREE.MeshStandardMaterial({
    map: base,
    normalMap: normal,
    roughnessMap: rough,
    metalnessMap: metal,
    roughness: 0.9,
    metalness: 0.08,
    color: 0xffffff,
  });

  bodyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uVideoMap = { value: videoTex };
    shader.uniforms.uVideoAR  = { value: videoAR };
    shader.uniforms.uRect     = { value: new THREE.Vector4(U0, V0, U1, V1) };

    // keep reference for later updates
    bodyMat.userData.shader = shader;

    // inject uniforms + helper
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      uniform sampler2D uVideoMap;
      uniform float uVideoAR;
      uniform vec4 uRect; // (u0, v0, u1, v1)

      float rectMask(vec2 uv, vec4 r){
        float edge = 0.003; // мягкая граница
        float mx = smoothstep(r.x, r.x + edge, uv.x) * smoothstep(r.z, r.z - edge, uv.x);
        float my = smoothstep(r.y, r.y + edge, uv.y) * smoothstep(r.w, r.w - edge, uv.y);
        return mx * my;
      }

      vec2 coverUV(vec2 uv01, float srcAR, float dstAR){
        vec2 uv = uv01;
        if (srcAR > dstAR) {
          float s = dstAR / srcAR;
          uv.x = (uv.x - 0.5) * s + 0.5;
        } else {
          float s = srcAR / dstAR;
          uv.y = (uv.y - 0.5) * s + 0.5;
        }
        return uv;
      }
      `
    );

    // after base map is applied, mix in video ONLY in screen rect
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #include <map_fragment>

      float m = rectMask(vUv, uRect);
      if (m > 0.0001) {
        vec2 rectSize = vec2(uRect.z - uRect.x, uRect.w - uRect.y);
        float screenAR = rectSize.x / rectSize.y;

        vec2 uv01 = (vUv - uRect.xy) / rectSize;
        uv01 = coverUV(uv01, 1.0 / uVideoAR, screenAR);
        vec2 uvRot = vec2(uv01.y, 1.0 - uv01.x);
        vec3 vid = texture2D(uVideoMap, uvRot).rgb;

        // заменяем цвет в зоне экрана
        diffuseColor.rgb = mix(diffuseColor.rgb, vid, m);

        // чуть эмиссии, чтобы экран выглядел “живым”
        // (не лезем в totalEmissiveRadiance, чтобы не зависеть от версии чанков)
        diffuseColor.rgb += vid * (m * 0.10);
      }
      `
    );
  };

  // update videoAR when metadata ready
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) {
      videoAR = video.videoWidth / video.videoHeight;
      const sh = bodyMat.userData.shader;
      if (sh && sh.uniforms && sh.uniforms.uVideoAR) sh.uniforms.uVideoAR.value = videoAR;
    }
  }, { once: true });

  // -------------------------
  // 3D BUTTON: pin by UV (bottom-right on screen)
  // -------------------------
  const soundTex = texLoader.load("./assets/png/sound.png");
  soundTex.encoding = THREE.sRGBEncoding;

  const btnMat = new THREE.MeshBasicMaterial({
    map: soundTex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  btnMat.depthTest = false;
  btnMat.depthWrite = false;

  let soundBtn3D = null;

  function pointInTri2D(p, a, b, c) {
    // barycentric in 2D
    const v0 = new THREE.Vector2(c.x - a.x, c.y - a.y);
    const v1 = new THREE.Vector2(b.x - a.x, b.y - a.y);
    const v2 = new THREE.Vector2(p.x - a.x, p.y - a.y);

    const dot00 = v0.dot(v0);
    const dot01 = v0.dot(v1);
    const dot02 = v0.dot(v2);
    const dot11 = v1.dot(v1);
    const dot12 = v1.dot(v2);

    const invDen = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDen;
    const v = (dot00 * dot12 - dot01 * dot02) * invDen;

    return (u >= -1e-5) && (v >= -1e-5) && (u + v <= 1.00001);
  }

  function barycentricWeights(p, a, b, c) {
    const v0 = new THREE.Vector2(b.x - a.x, b.y - a.y);
    const v1 = new THREE.Vector2(c.x - a.x, c.y - a.y);
    const v2 = new THREE.Vector2(p.x - a.x, p.y - a.y);

    const d00 = v0.dot(v0);
    const d01 = v0.dot(v1);
    const d11 = v1.dot(v1);
    const d20 = v2.dot(v0);
    const d21 = v2.dot(v1);

    const denom = d00 * d11 - d01 * d01;
    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;
    return { u, v, w };
  }

  function findPointByUV(root, targetUv) {
    let hit = null;

    root.traverse((o) => {
      if (hit || !o.isMesh) return;

      const g = o.geometry;
      const posA = g?.attributes?.position;
      const uvA  = g?.attributes?.uv;
      if (!g || !posA || !uvA) return;

      const idx = g.index ? g.index.array : null;
      const pos = posA.array;
      const uv  = uvA.array;

      const getV2 = (i) => new THREE.Vector2(uv[i * 2], uv[i * 2 + 1]);
      const getV3 = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);

      const triCount = idx ? (idx.length / 3) : (pos.length / 9);

      for (let t = 0; t < triCount; t++) {
        const i0 = idx ? idx[t * 3] : (t * 3);
        const i1 = idx ? idx[t * 3 + 1] : (t * 3 + 1);
        const i2 = idx ? idx[t * 3 + 2] : (t * 3 + 2);

        const a = getV2(i0), b = getV2(i1), c = getV2(i2);
        if (!pointInTri2D(targetUv, a, b, c)) continue;

        const w = barycentricWeights(targetUv, a, b, c);

        const p0 = getV3(i0), p1 = getV3(i1), p2 = getV3(i2);
        const p = new THREE.Vector3()
          .addScaledVector(p0, w.u)
          .addScaledVector(p1, w.v)
          .addScaledVector(p2, w.w);

        // normal
        let n = new THREE.Vector3();
        const nA = g.attributes.normal;
        if (nA) {
          const na = nA.array;
          const n0 = new THREE.Vector3(na[i0 * 3], na[i0 * 3 + 1], na[i0 * 3 + 2]);
          const n1 = new THREE.Vector3(na[i1 * 3], na[i1 * 3 + 1], na[i1 * 3 + 2]);
          const n2 = new THREE.Vector3(na[i2 * 3], na[i2 * 3 + 1], na[i2 * 3 + 2]);
          n.addScaledVector(n0, w.u).addScaledVector(n1, w.v).addScaledVector(n2, w.w).normalize();
        } else {
          // face normal
          const e1 = p1.clone().sub(p0);
          const e2 = p2.clone().sub(p0);
          n.copy(e1.cross(e2).normalize());
        }

        hit = { mesh: o, pos: p, n };
        break;
      }
    });

    return hit;
  }

  function buildSoundButtonOnScreen(root) {
    // button uv near bottom-right INSIDE the screen rect
    const u = U1 - 0.020;
    const v = V0 + 0.055;
    const pt = findPointByUV(root, new THREE.Vector2(u, v));
    if (!pt) {
      console.warn("[tvhero] sound button UV point not found");
      return;
    }

    // estimate screen width using two UV points (left/right mid)
    const vMid = (V0 + V1) * 0.5;
    const pL = findPointByUV(root, new THREE.Vector2(U0 + 0.01, vMid));
    const pR = findPointByUV(root, new THREE.Vector2(U1 - 0.01, vMid));
    const screenW = (pL && pR) ? pL.pos.distanceTo(pR.pos) : 0.25;

    const bw = screenW * 0.18;
    const bh = bw * 0.45;

    soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
    soundBtn3D.renderOrder = 9999;

    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      pt.n.clone().normalize()
    );
    soundBtn3D.quaternion.copy(q);

    const eps = bw * 0.02;
    soundBtn3D.position.copy(pt.pos).add(pt.n.clone().normalize().multiplyScalar(eps));

    // attach to the mesh that owns those UVs (so it rotates perfectly)
    pt.mesh.add(soundBtn3D);
  }

  // -------------------------
  // RAYCAST FOR BUTTON
  // -------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pointerToNDC(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  canvas.addEventListener("pointermove", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(soundBtn3D, true);
    hoveringBtn = hit.length > 0;
    canvas.style.cursor = hoveringBtn ? "pointer" : (isMobile ? "default" : "grab");
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(soundBtn3D, true);
    if (!hit.length) return;

    video.muted = !video.muted;
    video.play().catch(() => {});
  });

  // -------------------------
  // GLOW from VIDEO (CSS var)
  // -------------------------
  const bCanvas = document.createElement("canvas");
  bCanvas.width = 32;
  bCanvas.height = 18;
  const bCtx = bCanvas.getContext("2d", { willReadFrequently: true });

  let glowFrame = 0;
  function updateGlow() {
    if ((glowFrame++ % 6) !== 0) return;
    try {
      bCtx.drawImage(video, 0, 0, bCanvas.width, bCanvas.height);
      const data = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height).data;

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      const avg = sum / (data.length / 4) / 255;

      const hero = document.querySelector(".hero-tv");
      let scrollK = 0;
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const h = Math.max(1, rect.height);
        scrollK = Math.min(1, Math.max(0, -rect.top / h));
      }

      const glow = Math.min(0.65, Math.max(0.10, 0.12 + avg * 0.45 + scrollK * 0.18));
      stage.style.setProperty("--tvGlow", glow.toFixed(3));
    } catch (_) {}
  }

  // -------------------------
  // LOAD FBX
  // -------------------------
  const loader = new THREE.FBXLoader(manager);

  loader.load(
    "./assets/models/retro_tv/tv.fbx",
    (fbx) => {
      // base rotation as before
      fbx.rotation.y = -Math.PI / 2;

      // normalize scale
      let b0 = new THREE.Box3().setFromObject(fbx);
      const s0 = b0.getSize(new THREE.Vector3());
      const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
      fbx.scale.setScalar(1.0 / max0);

      // recenter after scaling
      b0 = new THREE.Box3().setFromObject(fbx);
      const c0 = b0.getCenter(new THREE.Vector3());
      fbx.position.sub(c0);

      // apply our material (with video injection)
      fbx.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = bodyMat;
      });

      tvRoot.add(fbx);

      // camera fit
      const box = new THREE.Box3().setFromObject(tvRoot);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (camera.fov * Math.PI) / 180;
      const zoomK = isMobile ? 1.10 : 1.20; // мобилка меньше, ПК как тебе норм
      const dist = (maxDim / 2) / Math.tan(fov / 2) * (isMobile ? 2.2 : 2.0) / zoomK;



      camera.position.set(0, maxDim * 0.10, dist);
      camera.updateProjectionMatrix();

      tvRoot.scale.setScalar(isMobile ? 1.05 : 1.15);

      // build button pinned by UV
      // buildSoundButtonOnScreen(fbx);

      // play video
      video.play().catch(() => {});

      start();
    },
    undefined,
    (err) => console.error("[tvhero] FBX load error", err)
  );

  // -------------------------
  // RENDER LOOP (paused when offscreen)
  // -------------------------
  let active = false;
  let raf = 0;

  function render() {
    if (!active) return;

    updateGlow();

    tvRoot.rotation.y += (targetRotY - tvRoot.rotation.y) * 0.08;
    tvRoot.rotation.x += (targetRotX - tvRoot.rotation.x) * 0.08;

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    raf = requestAnimationFrame(render);
  }

  function start() {
    if (active) return;
    active = true;
    raf = requestAnimationFrame(render);
  }

  function stop() {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const io = new IntersectionObserver((entries) => {
    const ok = entries.some((e) => e.isIntersecting);
    if (ok) start();
    else stop();
  }, { threshold: 0.05 });

  io.observe(stage);
})();
