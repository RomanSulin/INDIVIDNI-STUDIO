/* global THREE, gsap, ScrollTrigger */

/**
 * TV fly-through (Three.js + GSAP ScrollTrigger)
 * Fixes:
 *  - Remap FBX-referenced textures to your actual folder to kill 404s on GitHub Pages (case-sensitive FS).
 *  - More robust screen/button placement: tries to find a mesh with name like "screen/display/monitor",
 *    otherwise falls back to model bounding box.
 *  - Safer resize using wrapper rect.
 */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return console.error("[tvfly] .tvfly not found");

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");

  if (!wrapper || !img || !canvas || !video) {
    return console.error("[tvfly] missing DOM", {
      wrapper: !!wrapper,
      img: !!img,
      canvas: !!canvas,
      video: !!video
    });
  }

  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) {
    return console.error("[tvfly] missing libs", {
      THREE: !!window.THREE,
      gsap: !!window.gsap,
      ScrollTrigger: !!window.ScrollTrigger,
      FBXLoader: !!(window.THREE && THREE.FBXLoader)
    });
  }

  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // =========================
  // Video
  // =========================
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.volume = 1;
  video.preload = "auto";

  video.addEventListener("error", () => {
    console.error("[tvfly] video error", video.error);
  });

  let videoAR = 16 / 9; // fallback
  let lastVideoAR = 0;

  video.addEventListener("loadedmetadata", () => {
  if (video.videoWidth && video.videoHeight) {
    videoAR = video.videoWidth / video.videoHeight;   // будет 1.25 для 1500x1200
    lastVideoAR = videoAR;
    if (model) mountScreenAndButton();                // важно: не только size, но и позиция кнопки
  }
  }, { once: true });

  const toggleSound = () => {
    video.muted = !video.muted;
    // user gesture → should allow play even on strict browsers
    video.play().catch(() => {});
  };

  // =========================
  // Renderer / scene
  // =========================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x000000, 1);
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
    const r = wrapper.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // =========================
  // CanvasTexture (video -> offscreen canvas -> texture)
  // =========================
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  // show a visible fallback while video isn't ready
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
    return;
  }
    // fallback (so ты точно видишь, что экран живой)
    drawFallback();
    canvasTex.needsUpdate = true;
  }

  const screenMat = new THREE.MeshBasicMaterial({
    map: canvasTex,
    side: THREE.DoubleSide,
    transparent: false
  });
  // screen always visible (not hidden by glass)
  screenMat.depthTest = false;
  screenMat.depthWrite = false;
  screenMat.toneMapped = false;

  // =========================
  // LoadingManager: kill 404 from FBX texture references
  // IMPORTANT: GitHub Pages is case-sensitive.
  // =========================
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

  // body textures (your folder)
  const base = texLoader.load("./assets/models/retro_tv/textures/basecolor.png");
  const normal = texLoader.load("./assets/models/retro_tv/textures/normal.png");
  const rough = texLoader.load("./assets/models/retro_tv/textures/roughness.png");
  const metal = texLoader.load("./assets/models/retro_tv/textures/metallic.png");
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

  // =========================
  // TV root
  // =========================
  const tvRoot = new THREE.Group();
  scene.add(tvRoot);
  let model = null;

  // =========================
  // 3D sound button (texture)
  // =========================
  const soundTex = texLoader.load(
    "./assets/png/sound.png",
    undefined,
    undefined,
    () => console.warn("[tvfly] sound.png not found: ./assets/png/sound.png")
  );
  soundTex.encoding = THREE.sRGBEncoding;

  const btnMat = new THREE.MeshBasicMaterial({
    map: soundTex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });
  btnMat.depthTest = false;
  btnMat.depthWrite = false;

  const glowMat = new THREE.MeshBasicMaterial({
    map: soundTex,
    transparent: true,
    alphaTest: 0.25,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(1, 0.15, 0.15),
    opacity: 0.0,
    side: THREE.DoubleSide
  });
  glowMat.depthTest = false;
  glowMat.depthWrite = false;

  let screenPlane = null;
  let screenW = 0;
  let soundBtn3D = null;
  let soundGlow3D = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pointerToNDC(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  function setPlaneSize(mesh, w, h) {
    const pos = mesh.position.clone();
    const quat = mesh.quaternion.clone();
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(w, h);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
  }

  function findScreenCandidate(root) {
    const cands = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.name || "").toLowerCase();
      // typical names in models
      if (
        name.includes("screen") ||
        name.includes("display") ||
        name.includes("monitor") ||
        name.includes("glass")
      ) {
        const b = new THREE.Box3().setFromObject(o);
        const s = b.getSize(new THREE.Vector3());
        const area = s.x * s.y;
        // ignore tiny parts
        if (area > 0.0005) cands.push({ o, area });
      }
    });
    cands.sort((a, b) => b.area - a.area);
    return cands[0] ? cands[0].o : null;
  }

function mountScreenAndButton() {
  if (!model) return;

  const anchor = findScreenCandidate(model);

  // WORLD basis
  let centerW, sizeW, quatW;
  if (anchor) {
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

  // переводим всё в LOCAL tvRoot (чтобы не было дрейфа при tvRoot.scale)
  tvRoot.updateMatrixWorld(true);

  const tvScale = tvRoot.getWorldScale(new THREE.Vector3());
  const invS = 1 / (tvScale.x || 1); // scale у тебя uniform

  const tvInvQuat = tvRoot.getWorldQuaternion(new THREE.Quaternion()).invert();

  const center = tvRoot.worldToLocal(centerW.clone());   // LOCAL
  const size   = sizeW.clone().multiplyScalar(invS);     // LOCAL

  // AXIS FIX (как у тебя сейчас “всё ок”)
  const axisFix = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 2
  );

  // WORLD -> LOCAL
  const quatLocal = tvInvQuat.clone().multiply(quatW).multiply(axisFix);

  const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(quatLocal).normalize();
  const up      = new THREE.Vector3(0, 1, 0).applyQuaternion(quatLocal).normalize();
  const normalV = new THREE.Vector3(0, 0, 1).applyQuaternion(quatLocal).normalize();

  const eps = Math.max(size.z, 0.01) * 0.06;

  // screen size (LOCAL)
  screenW = Math.max(0.05, size.x * (isMobile ? 0.95 : 0.98));
  const screenH = screenW / videoAR;

  // поднять экран выше
  const SCREEN_UP = size.y * 0.08;

  const screenPos = center
    .clone()
    .add(up.clone().multiplyScalar(SCREEN_UP))
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

  // ===== BUTTON (LOCAL) =====
  const bw = screenW * 0.22;
  const bh = bw * 0.45;

  const btnPos = center
    .clone()
    .add(right.clone().multiplyScalar(screenW * 0.32))
    .add(up.clone().multiplyScalar(-screenH * 0.55)) // ниже/выше кнопка
    .add(normalV.clone().multiplyScalar(eps * 1.2));

  if (!soundBtn3D) {
    soundGlow3D = new THREE.Mesh(new THREE.PlaneGeometry(bw * 1.22, bh * 1.22), glowMat);
    soundBtn3D  = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);

    soundGlow3D.renderOrder = 999;
    soundBtn3D.renderOrder  = 1000;

    tvRoot.add(soundGlow3D);
    tvRoot.add(soundBtn3D);
  } else {
    soundGlow3D.geometry.dispose();
    soundGlow3D.geometry = new THREE.PlaneGeometry(bw * 1.22, bh * 1.22);

    soundBtn3D.geometry.dispose();
    soundBtn3D.geometry = new THREE.PlaneGeometry(bw, bh);
  }

  soundGlow3D.position.copy(btnPos);
  soundBtn3D.position.copy(btnPos);

  soundGlow3D.quaternion.copy(quatLocal);
  soundBtn3D.quaternion.copy(quatLocal);
}

  canvas.addEventListener("pointermove", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    canvas.style.cursor = hit.length ? "pointer" : "default";
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    if (hit.length) toggleSound();
  });

  // =========================
  // FBX load
  // =========================
  const loader = new THREE.FBXLoader(manager);

  loader.load(
    "./assets/models/retro_tv/tv.fbx",
    (fbx) => {
      model = fbx;

      // вместо tvRoot.rotation — крутим саму модель
      model.rotation.y = -Math.PI / 2; // тот же поворот, который у тебя “правильно” работал

      // normalize scale
      const b0 = new THREE.Box3().setFromObject(model);
      const s0 = b0.getSize(new THREE.Vector3());
      const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
      model.scale.setScalar(1.0 / max0);

      // center
      const b1 = new THREE.Box3().setFromObject(model);
      const c1 = b1.getCenter(new THREE.Vector3());
      model.position.sub(c1);

      // apply our material everywhere
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
      const dist = (maxDim / 2) / Math.tan(fov / 2) * (isMobile ? 2.3 : 2.0);

      camera.position.set(0, maxDim * 0.10, dist);
      camera.updateProjectionMatrix();

      mountScreenAndButton();
    },
    undefined,
    (err) => console.error("[tvfly] FBX load error", err)
  );

  // =========================
  // GSAP + render loop
  // =========================
  let active = false;
  let raf = 0;
  let progress = 0;

  function render() {
    if (!active) return;

    updateVideoTexture();

    // glow feedback
    if (soundGlow3D) {
      const time = performance.now() * 0.001;
      soundGlow3D.material.opacity = video.muted
        ? 0.10 + 0.10 * (0.5 + 0.5 * Math.sin(time * 2.6))
        : 0.35;
      soundGlow3D.material.needsUpdate = true;
    }

    const t = progress;
    tvRoot.scale.setScalar((isMobile ? 0.55 : 0.45) + (isMobile ? 0.40 : 0.60) * t);

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    raf = requestAnimationFrame(render);
  }

  function start() {
    if (active) return;
    active = true;

    // try to start video (muted autoplay allowed)
    video.play().catch(() => {});
    raf = requestAnimationFrame(render);
  }

  function stop() {
    active = false;
    video.pause();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    canvas.style.cursor = "default";
  }

  gsap
    .timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=160%",
        pin: wrapper,
        scrub: true,
        onEnter: start,
        onEnterBack: start,
        onLeave: stop,
        onLeaveBack: stop,
        onRefresh: () => {
          resize();
          mountScreenAndButton();
        },
        onUpdate: (self) => {
          progress = self.progress;
        }
      }
    })
    .to(img, { scale: 2.2, z: 650, transformOrigin: "center center", ease: "power1.inOut" })
    .to(img, { opacity: 0, ease: "power1.out" }, 0.55);
})();
