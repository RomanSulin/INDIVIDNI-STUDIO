/* global THREE */

(() => {
  const stage = document.querySelector("[data-tv-hero]");
  if (!stage) return console.error("[tvhero] [data-tv-hero] not found");

  const canvas = stage.querySelector("#tvHeroCanvas");
  const video  = stage.querySelector("#tvHeroVideo");
  if (!canvas || !video) return console.error("[tvhero] missing canvas/video");

  if (!window.THREE || !THREE.FBXLoader) {
    return console.error("[tvhero] missing libs", {
      THREE: !!window.THREE,
      FBXLoader: !!(window.THREE && THREE.FBXLoader)
    });
  }

  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // -------------------------
  // Video
  // -------------------------
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";

  let videoAR = 16 / 9;

  // -------------------------
  // Renderer / scene (transparent over Liquid)
  // -------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-3, 1.2, -2.5);
  scene.add(fill);

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

  const toggleSound = () => {
    video.muted = !video.muted;
    video.play().catch(() => {});
  };

  // -------------------------
  // LoadingManager (texture remap)
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
      "retro_tv_1_metallic.png": "./assets/models/retro_tv/textures/metallic.png"
    };

    return remap[f] || url;
  });

  const texLoader = new THREE.TextureLoader(manager);

  const base   = texLoader.load("./assets/models/retro_tv/textures/basecolor.png");
  const normal = texLoader.load("./assets/models/retro_tv/textures/normal.png");
  const rough  = texLoader.load("./assets/models/retro_tv/textures/roughness.png");
  const metal  = texLoader.load("./assets/models/retro_tv/textures/metallic.png");
  base.encoding = THREE.sRGBEncoding;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: base,
    normalMap: normal,
    roughnessMap: rough,
    metalnessMap: metal,
    roughness: 0.9,
    metalness: 0.08,
    color: 0xffffff
  });

  // Sound button texture
  const soundTex = texLoader.load("./assets/png/sound.png");
  soundTex.encoding = THREE.sRGBEncoding;

  const btnMat = new THREE.MeshBasicMaterial({
    map: soundTex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });
  btnMat.depthWrite = false;
  btnMat.toneMapped = false;

  // -------------------------
  // TV root
  // -------------------------
  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  let model = null;

  // Screen overlay objects (now attached in local coords of screen mesh)
  let screenMesh = null;
  let screenGroup = null;
  let screenPlane = null;
  let soundBtn3D = null;

  // Video texture (native, no canvas-bridge)
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.generateMipmaps = false;

  function applyCoverCrop(planeW, planeH) {
    const planeAR = planeW / planeH;
    const ar = videoAR || (16 / 9);

    if (ar > planeAR) {
      // crop left/right
      const rx = planeAR / ar; // < 1
      videoTex.repeat.set(rx, 1);
      videoTex.offset.set((1 - rx) * 0.5, 0);
    } else {
      // crop top/bottom
      const ry = ar / planeAR; // < 1
      videoTex.repeat.set(1, ry);
      videoTex.offset.set(0, (1 - ry) * 0.5);
    }
    videoTex.needsUpdate = true;
  }

  // Pick screen mesh robustly: prefer names, plus "flat big plane"
  function pickScreenMesh(root) {
    let best = null;
    let bestScore = -Infinity;

    const size = new THREE.Vector3();

    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;

      const name = (o.name || "").toLowerCase();

      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      o.geometry.boundingBox.getSize(size);

      const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)];
      const sorted = [...dims].sort((a, b) => a - b);

      const minDim = sorted[0];
      const a1 = sorted[1];
      const a2 = sorted[2];
      const area = a1 * a2;              // two largest dims
      const flatness = (a2 > 0) ? (1 - (minDim / a2)) : 0; // closer to 1 => flat

      const bonus =
        (name.includes("screen") ? 4 : 0) +
        (name.includes("display") ? 3 : 0) +
        (name.includes("monitor") ? 2 : 0) +
        (name.includes("glass") ? 1 : 0);

      // area dominates, then name bonus, then flatness
      const score = area * 1000 + bonus * 10 + flatness;

      // фильтр: не брать микромеши
      if (area > 0.0005 && score > bestScore) {
        bestScore = score;
        best = o;
      }
    });

    if (best) console.log("[tvhero] screen mesh:", best.name);
    return best;
  }

  function buildScreenOverlay() {
    if (!screenMesh || !screenMesh.geometry) return;

    const geom = screenMesh.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();

    const bb = geom.boundingBox;
    const size = bb.getSize(new THREE.Vector3());
    const center = bb.getCenter(new THREE.Vector3());

    // detect "depth axis" (smallest dimension)
    const dims = [size.x, size.y, size.z].map(Math.abs);
    const minVal = Math.min(dims[0], dims[1], dims[2]);
    const depthAxis = dims.indexOf(minVal);

    // width/height in screen local axes
    let w, h;
    const rot = new THREE.Euler(0, 0, 0);

    // PlaneGeometry is XY facing +Z
    if (depthAxis === 2) {
      // thin in Z => plane is XY already
      w = Math.abs(size.x);
      h = Math.abs(size.y);
      rot.set(0, 0, 0);
    } else if (depthAxis === 0) {
      // thin in X => plane should face +X : rotate +90 around Y
      w = Math.abs(size.z);
      h = Math.abs(size.y);
      rot.set(0, Math.PI / 2, 0);
    } else {
      // thin in Y => plane should face +Y : rotate -90 around X
      w = Math.abs(size.x);
      h = Math.abs(size.z);
      rot.set(-Math.PI / 2, 0, 0);
    }

    // group in screenMesh LOCAL space
    screenGroup = new THREE.Group();
    screenGroup.position.copy(center);
    screenGroup.rotation.copy(rot);

    // small offset forward in group's +Z
    const eps = Math.max(w, h) * 0.002;

    // material for video plane
    const vidMat = new THREE.MeshBasicMaterial({
      map: videoTex,
      side: THREE.DoubleSide
    });
    vidMat.toneMapped = false;
    vidMat.depthWrite = false;
    vidMat.polygonOffset = true;
    vidMat.polygonOffsetFactor = -1;
    vidMat.polygonOffsetUnits = -1;

    // plane + crop
    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), vidMat);
    screenPlane.position.set(0, 0, eps);
    screenPlane.renderOrder = 50;
    screenGroup.add(screenPlane);

    applyCoverCrop(w, h);

    // sound button plane (same group => always glued)
    const BTN_X_K = 0.40;
    const BTN_DOWN_K = 0.57;

    const bw = w * 0.16;
    const bh = bw * 0.45;

    soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
    soundBtn3D.position.set(w * BTN_X_K, -h * BTN_DOWN_K, eps * 1.8);
    soundBtn3D.renderOrder = 60;
    screenGroup.add(soundBtn3D);

    // Ensure screen faces camera at start (flip if needed)
    screenGroup.updateWorldMatrix(true, false);
    const centerW = screenGroup.getWorldPosition(new THREE.Vector3());
    const normalW = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(screenGroup.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const toCam = camera.position.clone().sub(centerW).normalize();
    if (normalW.dot(toCam) < 0) {
      screenGroup.rotation.y += Math.PI;
    }

    screenMesh.add(screenGroup);
  }

  // Update crop when video metadata is ready
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) {
      videoAR = video.videoWidth / video.videoHeight;
      if (screenPlane) {
        const g = screenPlane.geometry;
        const w = g?.parameters?.width || 1;
        const h = g?.parameters?.height || 1;
        applyCoverCrop(w, h);
      }
    }
  }, { once: true });

  // -------------------------
  // Hover / click on 3D button
  // -------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveringBtn = false;

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

    if (!isMobile) canvas.style.cursor = hoveringBtn ? "pointer" : "grab";
    else canvas.style.cursor = hoveringBtn ? "pointer" : "default";
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;

    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(soundBtn3D, true);
    if (hit.length) toggleSound();
  });

  // -------------------------
  // Desktop rotation with cursor (TV only)
  // -------------------------
  let targetRotY = 0;
  let targetRotX = 0;

  function resetRotation() {
    targetRotY = 0;
    targetRotX = 0;
  }

  if (!isMobile) {
    canvas.style.cursor = "grab";

    canvas.addEventListener("pointermove", (e) => {
      if (hoveringBtn) return;

      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;

      targetRotY = nx * 0.45;
      targetRotX = -ny * 0.12;
    });

    canvas.addEventListener("pointerleave", resetRotation);
  }

  // -------------------------
  // Light from TV (average luminance -> CSS var)
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
  // FBX load
  // -------------------------
  const loader = new THREE.FBXLoader(manager);

  loader.load(
    "./assets/models/retro_tv/tv.fbx",
    (fbx) => {
      model = fbx;

      // keep your working base rotation
      model.rotation.y = -Math.PI / 2;

      // normalize scale
      const b0 = new THREE.Box3().setFromObject(model);
      const s0 = b0.getSize(new THREE.Vector3());
      const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
      model.scale.setScalar(1.0 / max0);

      // center
      const b1 = new THREE.Box3().setFromObject(model);
      const c1 = b1.getCenter(new THREE.Vector3());
      model.position.sub(c1);

      // assign body material to all meshes
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = bodyMat;
      });

      tvRoot.add(model);

      // camera fit
      const box = new THREE.Box3().setFromObject(tvRoot);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (camera.fov * Math.PI) / 180;
      const dist = (maxDim / 2) / Math.tan(fov / 2) * (isMobile ? 2.2 : 2.0);

      camera.position.set(0, maxDim * 0.10, dist);
      camera.updateProjectionMatrix();

      tvRoot.scale.setScalar(isMobile ? 1.05 : 1.15);

      // pick screen mesh ONCE and build overlay in its LOCAL space
      screenMesh = pickScreenMesh(model);
      if (!screenMesh) console.warn("[tvhero] screen mesh not found — overlay skipped");
      else buildScreenOverlay();

      // play (muted autoplay)
      video.play().catch(() => {});
      start();
    },
    undefined,
    (err) => console.error("[tvhero] FBX load error", err)
  );

  // -------------------------
  // Render loop (pause when hero offscreen)
  // -------------------------
  let active = false;
  let raf = 0;

  function render() {
    if (!active) return;

    updateGlow();

    // rotate TV root smoothly
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
