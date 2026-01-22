/* global THREE, gsap, ScrollTrigger */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return;

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image") || section.querySelector(".tvfly__image-container img");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");

  if (!wrapper || !img || !canvas || !video) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) return;

  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // ТВ у тебя уже “лицом” — оставь свой рабочий угол
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // ===== video =====
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.volume = 1;

  function toggleSound() {
    video.muted = !video.muted;
    video.play().catch(() => {});
  }

  // ===== renderer =====
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
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ===== CanvasTexture (оригинал 1:1, без кропа/полос) =====
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

  let videoAR = 5 / 4; // дефолт
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) {
      videoAR = video.videoWidth / video.videoHeight;
      // если экран уже создан — подстроим геометрию
      if (screenPlane) {
        const w = screenPlane.geometry.parameters.width;
        screenPlane.geometry.dispose();
        screenPlane.geometry = new THREE.PlaneGeometry(w, w / videoAR);
      }
    }
  }, { once: true });

  function updateVideoTexture() {
    if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) return;

    if (vCanvas.width !== video.videoWidth || vCanvas.height !== video.videoHeight) {
      vCanvas.width = video.videoWidth;
      vCanvas.height = video.videoHeight;
    }

    vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
    canvasTex.needsUpdate = true;
  }

  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, side: THREE.DoubleSide });
  screenMat.toneMapped = false;
  // рамка телека перекрывает края
  screenMat.depthTest = true;
  screenMat.depthWrite = false;
  screenMat.polygonOffset = true;
  screenMat.polygonOffsetFactor = -1;
  screenMat.polygonOffsetUnits = -1;

  // ===== TV body textures =====
  const texLoader = new THREE.TextureLoader();
  const texBase = texLoader.load("./assets/models/retro_tv/textures/basecolor.png");
  const texNormal = texLoader.load("./assets/models/retro_tv/textures/normal.png");
  const texRough = texLoader.load("./assets/models/retro_tv/textures/roughness.png");
  const texMetal = texLoader.load("./assets/models/retro_tv/textures/metallic.png");
  texBase.encoding = THREE.sRGBEncoding;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: texBase,
    normalMap: texNormal,
    roughnessMap: texRough,
    metalnessMap: texMetal,
    roughness: 0.9,
    metalness: 0.08,
    color: 0xffffff
  });

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  let model = null;
  let screenPlane = null;

  // ===== BUTTON on TV (3D plane + glow) =====
  const buttonTex = texLoader.load("./assets/png/sound.png");
  buttonTex.encoding = THREE.sRGBEncoding;

  const buttonMat = new THREE.MeshBasicMaterial({
    map: buttonTex,
    transparent: true,
    alphaTest: 0.25
  });
  buttonMat.depthTest = true;
  buttonMat.depthWrite = false;
  buttonMat.polygonOffset = true;
  buttonMat.polygonOffsetFactor = -2;
  buttonMat.polygonOffsetUnits = -2;

  const glowMat = new THREE.MeshBasicMaterial({
    map: buttonTex,
    transparent: true,
    alphaTest: 0.25,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(1, 0.15, 0.15),
    opacity: 0.0
  });
  glowMat.depthTest = true;
  glowMat.depthWrite = false;
  glowMat.polygonOffset = true;
  glowMat.polygonOffsetFactor = -3;
  glowMat.polygonOffsetUnits = -3;

  let soundButton = null;
  let soundGlow = null;

  // raycaster for clicks on the TV button
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function setupButtonOnTV() {
    if (!model || soundButton) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // размеры кнопки (подгони по вкусу)
    const bw = size.x * (isMobile ? 0.16 : 0.14);
    const bh = bw * 0.45; // кнопка-таблетка по твоей png

    const geo = new THREE.PlaneGeometry(bw, bh);

    soundButton = new THREE.Mesh(geo, buttonMat);
    soundButton.name = "SOUND_BTN";
    soundButton.renderOrder = 20;

    soundGlow = new THREE.Mesh(new THREE.PlaneGeometry(bw * 1.18, bh * 1.18), glowMat);
    soundGlow.name = "SOUND_GLOW";
    soundGlow.renderOrder = 19;

    // Позиция кнопки: низ справа на панели (как на скрине)
    // Эти коэффициенты можно быстро подогнать:
    const x = size.x * 0.23;
    const y = -size.y * 0.33;
    const z = box.max.z + size.z * 0.01; // чуть ВПЕРЁД // слегка "внутрь", чтобы рамка не перекрывала

    soundButton.position.set(x, y, z);
    soundGlow.position.set(x, y, z - size.z * 0.001);

    model.add(soundGlow);
    model.add(soundButton);
  }

  function setCursorFromHover(e) {
    if (!soundButton) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObject(soundButton, true);
    canvas.style.cursor = hit.length ? "pointer" : "default";
  }

  canvas.addEventListener("pointermove", setCursorFromHover);

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundButton) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(soundButton, true);

    if (hits.length) {
      toggleSound();
    }
  });

  // ===== camera fit =====
  let camBase = { maxDim: 1, dist: 3 };

  function fitCameraTo(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const fov = camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2) * (isMobile ? 2.3 : 2.0);

    camera.position.set(0, maxDim * 0.10, dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 200;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    camBase = { maxDim, dist };
  }

  function ensureScreenPlane() {
    if (!model || screenPlane) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // ширина в пределах рамки
    const w = size.x * (isMobile ? 0.70 : 0.80);
    const h = w / videoAR; // <-- под твоё видео

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screenPlane.renderOrder = 2;
    screenPlane.frustumCulled = false;

    // внутрь рамки, чтобы края не вылезали при увеличении
    screenPlane.position.set(0, size.y * 0.10, box.max.z - size.z * 0.01);

    model.add(screenPlane);
  }

  // ===== load FBX =====
  const loader = new THREE.FBXLoader();
  loader.load("./assets/models/retro_tv/tv.fbx", (fbx) => {
    model = fbx;

    // базовый scale (а зум делаем tvRoot'ом)
    const b0 = new THREE.Box3().setFromObject(model);
    const s0 = b0.getSize(new THREE.Vector3());
    const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
    model.scale.setScalar(1.0 / max0);

    model.rotation.set(0, FORCE_ROT_Y, 0);

    // центр после поворота
    const b1 = new THREE.Box3().setFromObject(model);
    const c1 = b1.getCenter(new THREE.Vector3());
    model.position.sub(c1);

    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = bodyMat;
    });

    tvRoot.add(model);

    fitCameraTo(tvRoot);
    ensureScreenPlane();
    setupButtonOnTV();

    // стартовый размер
    tvRoot.scale.setScalar(0.45);
  });

  // ===== render + GSAP =====
  let active = false;
  let raf = 0;
  let progress = 0;

  function render() {
    if (!active) return;

    updateVideoTexture();

    // glow logic
    if (soundGlow) {
      const time = performance.now() * 0.001;
      if (video.muted) {
        // muted: мягко переливается
        soundGlow.material.opacity = 0.12 + 0.10 * (0.5 + 0.5 * Math.sin(time * 2.6));
      } else {
        // on: ярко красным
        soundGlow.material.opacity = 0.35;
      }
      soundGlow.material.needsUpdate = true;
    }

    // синхронный зум телека (как у тебя было “прилипание”)
    const t = progress;
    const startScale = isMobile ? 0.55 : 0.45;
    const endScale = isMobile ? 1.00 : 1.10;
    tvRoot.scale.setScalar(startScale + (endScale - startScale) * t);

    camera.position.z = camBase.dist + (camBase.maxDim * 0.35) * (1 - t);
    camera.position.y = (camBase.maxDim * 0.10) - (camBase.maxDim * 0.03) * t;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

function start() {
  if (active) return;
  active = true;

  // форсим первый кадр, чтобы текстура не была чёрной
  video.play().catch(() => {});
  video.currentTime = Math.min(video.currentTime, 0.03);

  raf = requestAnimationFrame(render);
}

  function stop() {
    active = false;
    video.pause();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: "top top",
      end: "+=160%",
      pin: true,
      scrub: true,
      onEnter: start,
      onEnterBack: start,
      onLeave: stop,
      onLeaveBack: stop,
      onUpdate: (self) => { progress = self.progress; }
    }
  })
  .to(img, { scale: 2.2, z: 650, transformOrigin: "center center", ease: "power1.inOut" })
  .to(img, { opacity: 0, ease: "power1.out" }, 0.55);
})();
