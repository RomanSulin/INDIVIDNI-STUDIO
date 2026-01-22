/* global THREE, gsap, ScrollTrigger */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return;

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");
  const soundBtn = section.querySelector("#tvflySound");

  if (!wrapper || !img || !canvas || !video || !soundBtn) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) return;

  gsap.registerPlugin(ScrollTrigger);

  // Поворот телика (оставь свой рабочий)
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // video
  video.muted = true;
  video.loop = true;

  function syncSound() {
    const on = !video.muted;
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    soundBtn.setAttribute("aria-label", on ? "Выключить звук" : "Включить звук");
  }
  soundBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    video.play().catch(() => {});
    syncSound();
  });
  syncSound();

  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  // light (контрастно, без “молока”)
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

  // CanvasTexture (вместо VideoTexture)
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

  function updateVideoTexture() {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      if (vCanvas.width !== video.videoWidth) {
        vCanvas.width = video.videoWidth;
        vCanvas.height = video.videoHeight;
      }
      vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
      canvasTex.needsUpdate = true;
    }
  }

  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, side: THREE.DoubleSide });
  screenMat.toneMapped = false;
  screenMat.depthTest = false;
  screenMat.depthWrite = false;

  // TV body textures
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

  function fitCameraTo(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const fov = camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.8;

    camera.position.set(0, maxDim * 0.10, dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 200;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  }

  function ensureScreenPlane() {
    if (!model || screenPlane) return;

    const box = new THREE.Box3().setFromObject(tvRoot);
    const size = box.getSize(new THREE.Vector3());

    const w = size.x * 0.36;
    const h = w * 9 / 16;

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screenPlane.renderOrder = 999;
    screenPlane.frustumCulled = false;
    tvRoot.add(screenPlane);
  }

  function updateScreenPlane() {
    if (!screenPlane || !model) return;

    const box = new THREE.Box3().setFromObject(tvRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // ставим экран перед телеком со стороны камеры
    const dir = new THREE.Vector3().subVectors(camera.position, center).normalize();
    const pos = center.clone()
      .add(dir.multiplyScalar(size.z * 0.55))
      .add(new THREE.Vector3(0, size.y * 0.06, 0));

    screenPlane.position.copy(pos);
    screenPlane.lookAt(camera.position);
  }

  // load FBX
  const loader = new THREE.FBXLoader();
  loader.load("./assets/models/retro_tv/tv.fbx", (fbx) => {
    model = fbx;

    // scale
    const box0 = new THREE.Box3().setFromObject(model);
    const size0 = box0.getSize(new THREE.Vector3());
    const max0 = Math.max(size0.x, size0.y, size0.z) || 1;
    model.scale.setScalar(1.2 / max0);

    // rotate
    model.rotation.set(0, FORCE_ROT_Y, 0);

    // center AFTER rotate
    const box1 = new THREE.Box3().setFromObject(model);
    const c1 = box1.getCenter(new THREE.Vector3());
    model.position.sub(c1);

    // materials
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = bodyMat;
    });

    tvRoot.add(model);
    ensureScreenPlane();
    fitCameraTo(tvRoot);
    // ===== FIXED SCREEN PLANE (создаём 1 раз и больше не двигаем) =====
const tvBox = new THREE.Box3().setFromObject(tvRoot);
const tvSize = tvBox.getSize(new THREE.Vector3());
const tvCenter = tvBox.getCenter(new THREE.Vector3());

// размеры “экрана”
const screenW = tvSize.x * 0.36;
const screenH = screenW * 9 / 16;

// плоскость с материалом видео (screenMat)
const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
screenPlane.renderOrder = 999;
screenPlane.frustumCulled = false;

// ставим чуть выше центра и чуть перед “лицом” телека
// ВАЖНО: используем направление “к камере”, но позицию задаём ОДИН РАЗ
const toCam = new THREE.Vector3().subVectors(camera.position, tvCenter).normalize();

screenPlane.position.copy(tvCenter)
  .add(toCam.multiplyScalar(tvSize.z * 0.55))
  .add(new THREE.Vector3(0, tvSize.y * 0.06, 0));

// плоскость всегда смотрит в камеру
screenPlane.lookAt(camera.position);

// добавляем в tvRoot, чтобы оставалось по центру вместе с моделью
tvRoot.add(screenPlane);
  });

  // GSAP fly-through + render loop
  let active = false;
  let raf = 0;
  let scrollP = 0;

  function render() {
    if (!active) return;

    updateVideoTexture();
    updateScreenPlane();

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

  function start() {
    if (active) return;
    active = true;
    video.play().catch(() => {});
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
      onUpdate: (self) => { scrollP = self.progress; }
    }
  })
  .to(img, { scale: 2, z: 350, transformOrigin: "center center", ease: "power1.inOut" })
  .to(img, { opacity: 0, ease: "power1.out" }, 0.55);
})();
