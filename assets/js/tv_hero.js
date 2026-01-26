/* global THREE */

/**
 * HERO TV (Liquid + TV in same hero)
 * - No GSAP
 * - No window.png overlay (tvfly__image)
 * - Keeps your working mountScreenAndButton logic (screen + sound button)
 * - Desktop: rotate with cursor (TV faces camera on load)
 * - Mobile: fixed (no rotation)
 */

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
  let lastVideoAR = 0;

  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) {
      videoAR = video.videoWidth / video.videoHeight;
      lastVideoAR = videoAR;
      if (model) mountScreenAndButton();
    }
  }, { once: true });

  const toggleSound = () => {
    video.muted = !video.muted;
    video.play().catch(() => {});
  };

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

  // -------------------------
  // Video -> CanvasTexture
  // -------------------------
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  function drawFallback() {
    if (vCanvas.width !== 512 || vCanvas.height !== 288) {
      vCanvas.width = 512;
      vCanvas.height = 288;
    }
    vCtx.fillStyle = "#000";
    vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);
    vCtx.fillStyle = "rgba(255,255,255,0.65)";
    vCtx.font = "24px Arial";
    vCtx.fillText("SHOWREEL", 24, 52);
    vCtx.font = "14px Arial";
    vCtx.fillStyle = "rgba(255,255,255,0.45)";
    vCtx.fillText("loading…", 26, 80);
  }

  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

  function updateVideoTexture() {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      const ar = video.videoWidth / video.videoHeight;
      if (Number.isFinite(ar) && model && Math.abs(ar - lastVideoAR) > 0.0001) {
        videoAR = ar;
        lastVideoAR = ar;
        mountScreenAndButton();
      }

      if (vCanvas.width !== video.videoWidth || vCanvas.height !== video.videoHeight) {
        vCanvas.width = video.videoWidth;
        vCanvas.height = video.videoHeight;
      }

      vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
      canvasTex.needsUpdate = true;
      return true;
    }

    drawFallback();
    canvasTex.needsUpdate = true;
    return false;
  }

  const screenMat = new THREE.MeshBasicMaterial({
    map: canvasTex,
    side: THREE.DoubleSide,
    transparent: false
  });
  screenMat.depthTest = false;
  screenMat.depthWrite = false;
  screenMat.toneMapped = false;

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

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);
  let model = null;
  let screenAnchor = null;
  // -------------------------
  // 3D sound button (texture)
  // -------------------------
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

  let screenPlane = null;
  let screenW = 0;
  let soundBtn3D = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveringBtn = false;

  function pointerToNDC(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  function setPlaneSize(mesh, w, h) {
  const g = mesh.geometry;
  const curW = g?.parameters?.width;
  const curH = g?.parameters?.height;

  if (curW && curH && Math.abs(curW - w) < 1e-4 && Math.abs(curH - h) < 1e-4) return;

  const pos = mesh.position.clone();
  const quat = mesh.quaternion.clone();

  mesh.geometry?.dispose?.();
  mesh.geometry = new THREE.PlaneGeometry(w, h);
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
}

  function findScreenCandidate(root) {
  root.updateWorldMatrix(true, true);

  let best = null;
  let bestScore = -Infinity;

  const size = new THREE.Vector3();
  const scl  = new THREE.Vector3();

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;

    const name = (o.name || "").toLowerCase();
    const isScreenLike =
      name.includes("screen") || name.includes("display") || name.includes("monitor") || name.includes("glass");

    if (!isScreenLike) return;

    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    o.geometry.boundingBox.getSize(size);
    o.getWorldScale(scl);

    // площадь в "своих" осях + scale (НЕ зависит от поворота)
    const area = Math.abs((size.x * scl.x) * (size.y * scl.y));

    // приоритет: screen/display выше, glass ниже
    const bonus =
      (name.includes("screen") ? 3 : 0) +
      (name.includes("display") ? 2 : 0) +
      (name.includes("monitor") ? 1 : 0) +
      (name.includes("glass") ? -1 : 0);

    const score = area * 1000 + bonus; // area доминирует, bonus решает спорные случаи

    if (area > 0.0005 && score > bestScore) {
      bestScore = score;
      best = o;
    }
  });

  // маленький дебаг (можешь убрать потом)
  if (best) console.log("[tvhero] screen anchor:", best.name);

  return best;
}

  function getOrientedMetrics(mesh){
  mesh.updateWorldMatrix(true, false);

  const geom = mesh.geometry;
  if (!geom) return null;
  if (!geom.boundingBox) geom.computeBoundingBox();

  const bb = geom.boundingBox;

  const quatW = mesh.getWorldQuaternion(new THREE.Quaternion());
  const right = new THREE.Vector3(1,0,0).applyQuaternion(quatW).normalize();
  const up    = new THREE.Vector3(0,1,0).applyQuaternion(quatW).normalize();
  const norm  = new THREE.Vector3(0,0,1).applyQuaternion(quatW).normalize();

  const corners = [
    new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z),
    new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z),
    new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z),
    new THREE.Vector3(bb.min.x, bb.max.y, bb.max.z),
    new THREE.Vector3(bb.max.x, bb.min.y, bb.min.z),
    new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z),
    new THREE.Vector3(bb.max.x, bb.max.y, bb.min.z),
    new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z),
  ].map(v => mesh.localToWorld(v));

  const rangeOn = (axis) => {
    let mn = Infinity, mx = -Infinity;
    for (const p of corners){
      const d = p.dot(axis);
      if (d < mn) mn = d;
      if (d > mx) mx = d;
    }
    return [mn, mx];
  };

  const [r0, r1] = rangeOn(right);
  const [u0, u1] = rangeOn(up);
  const [n0, n1] = rangeOn(norm);

  const sizeW = new THREE.Vector3(r1 - r0, u1 - u0, n1 - n0);

  const centerLocal = bb.getCenter(new THREE.Vector3());
  const centerW = mesh.localToWorld(centerLocal.clone());

  return { centerW, sizeW, quatW };
}
  
  function mountScreenAndButton() {
    if (!model) return;

    if (!screenAnchor) screenAnchor = findScreenCandidate(model);
    const anchor = screenAnchor;

    let centerW, sizeW, quatW;
   if (anchor && anchor.isMesh && anchor.geometry) {
  const m = getOrientedMetrics(anchor);
  if (m) {
    centerW = m.centerW;
    sizeW   = m.sizeW;
    quatW   = m.quatW;
  } else {
    const boxW = new THREE.Box3().setFromObject(anchor);
    centerW = boxW.getCenter(new THREE.Vector3());
    sizeW   = boxW.getSize(new THREE.Vector3());
    quatW   = anchor.getWorldQuaternion(new THREE.Quaternion());
  }
} else if (anchor) {
  const boxW = new THREE.Box3().setFromObject(anchor);
  centerW = boxW.getCenter(new THREE.Vector3());
  sizeW   = boxW.getSize(new THREE.Vector3());
  quatW   = anchor.getWorldQuaternion(new THREE.Quaternion());
} else {
  const boxW = new THREE.Box3().setFromObject(model);
  centerW = boxW.getCenter(new THREE.Vector3());
  sizeW   = boxW.getSize(new THREE.Vector3());
  quatW   = model.getWorldQuaternion(new THREE.Quaternion());
}


    tvRoot.updateMatrixWorld(true);

    const tvScale = tvRoot.getWorldScale(new THREE.Vector3());
    const invS = 1 / (tvScale.x || 1);

    const center = tvRoot.worldToLocal(centerW.clone());
    const size   = sizeW.clone().multiplyScalar(invS);

    const tvInvQuat = tvRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
    const axisFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const quatLocal = tvInvQuat.clone().multiply(quatW).multiply(axisFix);

    const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(quatLocal).normalize();
    const up      = new THREE.Vector3(0, 1, 0).applyQuaternion(quatLocal).normalize();
    const normalV = new THREE.Vector3(0, 0, 1).applyQuaternion(quatLocal).normalize();

    const SCREEN_UP_K = 0.11;
    const SCREEN_X_K  = 0.00;
    const BTN_DOWN_K  = 0.57;
    const BTN_X_K     = 0.40;
    const eps = Math.max(size.z, 0.01) * 0.02;

    screenW = Math.max(0.05, size.x * (isMobile ? 0.95 : 1.00));
    const screenH = screenW / videoAR;

    const screenPos = center.clone()
      .add(right.clone().multiplyScalar(screenW * SCREEN_X_K))
      .add(up.clone().multiplyScalar(size.y * SCREEN_UP_K))
      .add(normalV.clone().multiplyScalar(eps));

    if (!screenPlane) {
      screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
      screenPlane.renderOrder = 10;
      tvRoot.add(screenPlane);
    } else {
      setPlaneSize(screenPlane, screenW, screenH);
    }
    screenPlane.position.copy(screenPos);
    screenPlane.quaternion.copy(quatLocal);

    // BUTTON
    const bw = screenW * 0.16;
    const bh = bw * 0.45;

    const btnPos = center.clone()
      .add(right.clone().multiplyScalar(screenW * BTN_X_K))
      .add(up.clone().multiplyScalar(-screenH * BTN_DOWN_K))
      .add(normalV.clone().multiplyScalar(eps * 1.6));

    if (!soundBtn3D) {
      soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
      soundBtn3D.renderOrder = 1000;
      tvRoot.add(soundBtn3D);
    } else {
      soundBtn3D.geometry.dispose();
      soundBtn3D.geometry = new THREE.PlaneGeometry(bw, bh);
    }
    soundBtn3D.position.copy(btnPos);
    soundBtn3D.quaternion.copy(quatLocal);
  }

  // hover/click sound button
  canvas.addEventListener("pointermove", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D].filter(Boolean), true);
    hoveringBtn = hit.length > 0;
    canvas.style.cursor = hoveringBtn ? "pointer" : (isMobile ? "default" : "grab");
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D].filter(Boolean), true);
    if (hit.length) toggleSound();
  });

  // -------------------------
  // Desktop rotation with cursor
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
      if (hoveringBtn) return; // не мешаем нажимать кнопку
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;

      targetRotY = nx * 0.45;    // ~25°
      targetRotX = -ny * 0.12;   // лёгкий наклон
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

  let frame = 0;
  function updateGlow() {
    // редко считаем (чтобы не грузить)
    if ((frame++ % 6) !== 0) return;

    try {
      bCtx.drawImage(video, 0, 0, bCanvas.width, bCanvas.height);
      const data = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height).data;

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        // luma
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      const avg = sum / (data.length / 4) / 255; // 0..1

      // немного усиливаем + добавляем “реакцию на скролл”
      const hero = document.querySelector(".hero-tv");
      let scrollK = 0;
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const h = Math.max(1, rect.height);
        scrollK = Math.min(1, Math.max(0, -rect.top / h));
      }

      const glow = Math.min(0.65, Math.max(0.10, 0.12 + avg * 0.45 + scrollK * 0.18));
      stage.style.setProperty("--tvGlow", glow.toFixed(3));
    } catch (_) {
      // ignore
    }
  }

  // -------------------------
  // FBX load (same model path as your working setup)
  // -------------------------
  const loader = new THREE.FBXLoader(manager);

  loader.load(
    "./assets/models/retro_tv/tv.fbx",
    (fbx) => {
      model = fbx;

      // твой рабочий базовый поворот (НЕ трогаем)
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

      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = bodyMat;
      });

      tvRoot.add(model);
      screenAnchor = findScreenCandidate(model);
      // camera fit
      const box = new THREE.Box3().setFromObject(tvRoot);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (camera.fov * Math.PI) / 180;
      const dist = (maxDim / 2) / Math.tan(fov / 2) * (isMobile ? 2.2 : 2.0);

      camera.position.set(0, maxDim * 0.10, dist);
      camera.updateProjectionMatrix();

      // fixed base scale
      tvRoot.scale.setScalar(isMobile ? 1.05 : 1.15);

      mountScreenAndButton();
      video.play().catch(() => {}); // muted autoplay
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
let poseTick = 0;

function render() {
  if (!active) return;

  updateVideoTexture();
  updateGlow();

  // smooth rotation
  tvRoot.rotation.y += (targetRotY - tvRoot.rotation.y) * 0.08;
  tvRoot.rotation.x += (targetRotX - tvRoot.rotation.x) * 0.08;

  // ВАЖНО: чтобы шоурил и кнопка следовали экрану при вращении
  if (!isMobile && model) {
    if ((poseTick++ % 2) === 0) mountScreenAndButton(); // можно %3 если тяжело
  }

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

// pause when not visible
const io = new IntersectionObserver((entries) => {
  const ok = entries.some((e) => e.isIntersecting);
  if (ok) start();
  else stop();
}, { threshold: 0.05 });

io.observe(stage);
})();
