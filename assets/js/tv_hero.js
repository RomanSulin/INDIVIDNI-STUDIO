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
  btnMat.depthTest = false;
  btnMat.depthWrite = false;
  btnMat.toneMapped = false;

  // -------------------------
  // TV root
  // -------------------------
  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  // Video texture (native)
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.generateMipmaps = false;
  videoTex.wrapS = videoTex.wrapT = THREE.ClampToEdgeWrapping;

  function applyCoverCrop(planeW, planeH) {
    const planeAR = planeW / planeH;
    const ar = videoAR || (16 / 9);

    if (ar > planeAR) {
      const rx = planeAR / ar;
      videoTex.repeat.set(rx, 1);
      videoTex.offset.set((1 - rx) * 0.5, 0);
    } else {
      const ry = ar / planeAR;
      videoTex.repeat.set(1, ry);
      videoTex.offset.set(0, (1 - ry) * 0.5);
    }
    videoTex.needsUpdate = true;
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
  // Screen overlay attached to screenMesh (local coords)
  // -------------------------
  let model = null;
  let screenMesh = null;
  let screenPlane = null;
  let soundBtn3D = null;

  function setMaterialTransparent(mesh) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      if (!m) return;
      m.transparent = true;
      m.opacity = 0.0;       // IMPORTANT: иначе "стекло" перекрывает видео
      m.depthWrite = false;
    });
  }

  function computeAverageNormalLocal(mesh) {
    const geom = mesh.geometry;
    if (!geom || !geom.attributes || !geom.attributes.position) return new THREE.Vector3(0, 0, 1);

    const pos = geom.attributes.position.array;
    const idx = geom.index ? geom.index.array : null;

    let nx = 0, ny = 0, nz = 0;

    function addTri(i0, i1, i2) {
      const p0x = pos[i0 * 3], p0y = pos[i0 * 3 + 1], p0z = pos[i0 * 3 + 2];
      const p1x = pos[i1 * 3], p1y = pos[i1 * 3 + 1], p1z = pos[i1 * 3 + 2];
      const p2x = pos[i2 * 3], p2y = pos[i2 * 3 + 1], p2z = pos[i2 * 3 + 2];

      const v1x = p1x - p0x, v1y = p1y - p0y, v1z = p1z - p0z;
      const v2x = p2x - p0x, v2y = p2y - p0y, v2z = p2z - p0z;

      const cx = v1y * v2z - v1z * v2y;
      const cy = v1z * v2x - v1x * v2z;
      const cz = v1x * v2y - v1y * v2x;

      nx += cx; ny += cy; nz += cz;
    }

    if (idx) {
      for (let i = 0; i < idx.length; i += 3) addTri(idx[i], idx[i + 1], idx[i + 2]);
    } else {
      for (let i = 0; i < pos.length / 3; i += 3) addTri(i, i + 1, i + 2);
    }

    const n = new THREE.Vector3(nx, ny, nz);
    if (n.lengthSq() < 1e-10) return new THREE.Vector3(0, 0, 1);
    return n.normalize();
  }

  // выбираем самый плоский/большой фронтальный меш (названий в FBX может не быть)
  function pickScreenMesh(root) {
    let best = null;
    let bestScore = -Infinity;

    const size = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();

    root.updateWorldMatrix(true, true);

    root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes?.position) return;

      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      o.geometry.boundingBox.getSize(size);

      const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => a - b);
      const minDim = dims[0], a1 = dims[1], a2 = dims[2];
      const area = a1 * a2;
      const flat = (minDim > 0) ? (a2 / minDim) : 0;

      if (area < 0.0002 || flat < 15) return;

      const nLocal = computeAverageNormalLocal(o);
      o.getWorldQuaternion(q);
      const nW = nLocal.clone().applyQuaternion(q).normalize();
      o.getWorldPosition(p);
      const toCam = camera.position.clone().sub(p).normalize();
      const facing = Math.max(0, nW.dot(toCam));

      const score = area * flat * (0.35 + 0.65 * facing);

      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    });

    console.log("[tvhero] screenMesh =", best?.name || "(no name)");
    return best;
  }

  function buildOverlayOnScreen(mesh) {
    const geom = mesh.geometry;
    const pos = geom.attributes.position.array;

    // local normal
    let normalL = computeAverageNormalLocal(mesh);

    // flip normal to face camera
    const qW = mesh.getWorldQuaternion(new THREE.Quaternion());
    const pW = mesh.getWorldPosition(new THREE.Vector3());
    const nW = normalL.clone().applyQuaternion(qW).normalize();
    const toCam = camera.position.clone().sub(pW).normalize();
    if (nW.dot(toCam) < 0) normalL.multiplyScalar(-1);

    // right/up basis in LOCAL space
    let upCand = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normalL.dot(upCand)) > 0.9) upCand = new THREE.Vector3(1, 0, 0);

    const rightL = new THREE.Vector3().crossVectors(upCand, normalL).normalize();
    const upL = new THREE.Vector3().crossVectors(normalL, rightL).normalize();

    // project vertices to find bounds
    let rMin = Infinity, rMax = -Infinity;
    let uMin = Infinity, uMax = -Infinity;
    let nMin = Infinity, nMax = -Infinity;

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      const r = x * rightL.x + y * rightL.y + z * rightL.z;
      const u = x * upL.x + y * upL.y + z * upL.z;
      const n = x * normalL.x + y * normalL.y + z * normalL.z;

      if (r < rMin) rMin = r; if (r > rMax) rMax = r;
      if (u < uMin) uMin = u; if (u > uMax) uMax = u;
      if (n < nMin) nMin = n; if (n > nMax) nMax = n;
    }

    const w = Math.max(0.001, rMax - rMin);
    const h = Math.max(0.001, uMax - uMin);

    const eps = Math.max(w, h) * 0.01;
    const rMid = (rMin + rMax) * 0.5;
    const uMid = (uMin + uMax) * 0.5;
    const nFront = nMax + eps;

    const centerL = new THREE.Vector3()
      .addScaledVector(rightL, rMid)
      .addScaledVector(upL, uMid)
      .addScaledVector(normalL, nFront);

    const basis = new THREE.Matrix4().makeBasis(rightL, upL, normalL);
    const quatL = new THREE.Quaternion().setFromRotationMatrix(basis);

    const vidMat = new THREE.MeshBasicMaterial({ map: videoTex, side: THREE.DoubleSide });
    vidMat.depthTest = false;
    vidMat.depthWrite = false;
    vidMat.toneMapped = false;

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), vidMat);
    screenPlane.position.copy(centerL);
    screenPlane.quaternion.copy(quatL);
    screenPlane.renderOrder = 999;

    applyCoverCrop(w, h);

    // sound button
    const bw = w * 0.18;
    const bh = bw * 0.45;

    soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
    soundBtn3D.position.copy(centerL)
      .addScaledVector(rightL, w * 0.42)
      .addScaledVector(upL, -h * 0.52)
      .addScaledVector(normalL, eps * 2.0);
    soundBtn3D.quaternion.copy(quatL);
    soundBtn3D.renderOrder = 1000;

    mesh.add(screenPlane);
    mesh.add(soundBtn3D);
  }

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
    canvas.style.cursor = hoveringBtn ? "pointer" : (isMobile ? "default" : "grab");
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(soundBtn3D, true);
    if (hit.length) toggleSound();
  });

  // -------------------------
  // Desktop rotation with cursor
  // -------------------------
  let targetRotY = 0;
  let targetRotX = 0;

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
    canvas.addEventListener("pointerleave", () => { targetRotY = 0; targetRotX = 0; });
  }

  // -------------------------
  // TV glow from video
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

      model.rotation.y = -Math.PI / 2;

      // normalize scale
      let b0 = new THREE.Box3().setFromObject(model);
      const s0 = b0.getSize(new THREE.Vector3());
      const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
      model.scale.setScalar(1.0 / max0);

      // recenter after scaling
      b0 = new THREE.Box3().setFromObject(model);
      const c0 = b0.getCenter(new THREE.Vector3());
      model.position.sub(c0);

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

      // pick screen & build overlay
      screenMesh = pickScreenMesh(model);
      if (!screenMesh) {
        console.warn("[tvhero] screen mesh not found — TV will render without video");
      } else {
        setMaterialTransparent(screenMesh);
        buildOverlayOnScreen(screenMesh);
      }

      // play (muted autoplay)
      video.play().catch(() => {});

      start();
    },
    undefined,
    (err) => console.error("[tvhero] FBX load error", err)
  );

  // -------------------------
  // Render loop
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
