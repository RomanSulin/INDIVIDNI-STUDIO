/* global THREE, gsap, ScrollTrigger */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return;

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image") || section.querySelector(".tvfly__image-container img");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");
  const soundBtn = section.querySelector("#tvflySound");
  const volume = section.querySelector("#tvflyVolume");

  if (!wrapper || !img || !canvas || !video || !soundBtn) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) return;

  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // ===== video =====
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.volume = 0.8;

  function setBtnLabel() {
    const on = !video.muted && video.volume > 0;
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    soundBtn.textContent = on ? "ВЫКЛ" : "ВКЛ";
  }

  soundBtn.addEventListener("click", () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.8;
    } else {
      video.muted = true;
    }
    video.play().catch(() => {});
    if (volume) volume.value = String(Math.round(video.volume * 100));
    setBtnLabel();
  });

  if (volume) {
    volume.addEventListener("input", () => {
      const v = Math.min(1, Math.max(0, Number(volume.value) / 100));
      video.volume = v;
      video.muted = v === 0;
      video.play().catch(() => {});
      setBtnLabel();
    });
    if (isMobile) volume.style.display = "none";
  }

  setBtnLabel();

  // ===== three =====
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
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

  // ===== CanvasTexture (cover to 16:9) =====
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

function updateVideoTexture() {
  if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) return;

  // canvas = размер видео, чтобы было 1:1
  if (vCanvas.width !== video.videoWidth || vCanvas.height !== video.videoHeight) {
    vCanvas.width = video.videoWidth;
    vCanvas.height = video.videoHeight;
  }

  // рисуем полный кадр без кропа/contain
  vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
  canvasTex.needsUpdate = true;
}


  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, side: THREE.DoubleSide });
  screenMat.toneMapped = false;
  screenMat.depthTest = true;     // рамка сможет перекрывать края
  screenMat.depthWrite = false;   // но не будет ломать глубину
  screenMat.polygonOffset = true; // чтобы не было z-fighting
  screenMat.polygonOffsetFactor = -1;
  screenMat.polygonOffsetUnits = -1;

  // TV textures
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
let videoAR = 5 / 4;
video.addEventListener("loadedmetadata", () => {
  if (video.videoWidth && video.videoHeight) videoAR = video.videoWidth / video.videoHeight;
}, { once: true });

    function ensureScreenPlane() {
    if (!model || screenPlane) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    const w = size.x * (isMobile ? 0.70 : 0.80);  // было 0.86 — слишком широко
    const h = w / videoAR;

screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
screenPlane.renderOrder = 2;
screenPlane.frustumCulled = false;

// ВАЖНО: не “перед” телеком, а чуть ВНУТРИ рамки (минус, а не плюс)
screenPlane.position.set(0, size.y * 0.10, box.max.z - size.z * 0.01);

tvRoot.add(screenPlane);
  }

  const loader = new THREE.FBXLoader();
  loader.load("./assets/models/retro_tv/tv.fbx", (fbx) => {
    model = fbx;

    const b0 = new THREE.Box3().setFromObject(model);
    const s0 = b0.getSize(new THREE.Vector3());
    const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
    model.scale.setScalar(1.0 / max0);

    model.rotation.set(0, FORCE_ROT_Y, 0);

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
    tvRoot.scale.setScalar(0.55);
  });

  // ===== render + gsap sync =====
  let active = false;
  let raf = 0;
  let progress = 0;

  function render() {
    if (!active) return;

    updateVideoTexture();

    const t = progress;

    // синхронизируем телик с зумом картинки
    tvRoot.scale.setScalar((isMobile ? 0.55 : 0.45) + (isMobile ? 0.40 : 0.60) * t);
    camera.position.z = camBase.dist + (camBase.maxDim * 0.35) * (1 - t);
    camera.position.y = (camBase.maxDim * 0.10) - (camBase.maxDim * 0.03) * t;
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
      onUpdate: (self) => { progress = self.progress; }
    }
  })
  .to(img, { scale: 2.2, z: 650, transformOrigin: "center center", ease: "power1.inOut" })
  .to(img, { opacity: 0, ease: "power1.out" }, 0.55);
})();
