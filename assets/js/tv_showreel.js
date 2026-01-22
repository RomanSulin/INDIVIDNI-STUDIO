/* global THREE, gsap, ScrollTrigger */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return;

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image") || section.querySelector(".tvfly__image-container img");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");
  const soundBtn = section.querySelector("#tvflySound");

  if (!wrapper || !img || !canvas || !video || !soundBtn) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) return;

  gsap.registerPlugin(ScrollTrigger);

  // Поворот телека (оставь как у тебя “лицом”)
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

  // lights
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

  // CanvasTexture (самый стабильный способ)
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", { alpha: false });

  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

function updateVideoTexture() {
  if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) return;

  // один раз под размер видео
  if (vCanvas.width !== video.videoWidth) {
    vCanvas.width = video.videoWidth;
    vCanvas.height = video.videoHeight;
  }

  // Экран-плоскость у нас 16:9 (w/h), а видео 5:4
  // Делаем drawImage по принципу cover (без искажений)
  const targetW = vCanvas.width;
  const targetH = vCanvas.height;

  const videoAR = video.videoWidth / video.videoHeight;    // 1500/1200 = 1.25
  const screenAR = 16 / 9;                                 // 1.777...

  let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

  if (videoAR > screenAR) {
    // видео шире, чем экран -> режем по ширине
    sw = video.videoHeight * screenAR;
    sx = (video.videoWidth - sw) / 2;
  } else {
    // видео уже, чем экран -> режем по высоте
    sh = video.videoWidth / screenAR;
    sy = (video.videoHeight - sh) / 2;
  }

  vCtx.clearRect(0, 0, targetW, targetH);
  vCtx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

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

    return { size, dist };
  }

  function createScreenPlaneOnce() {
    if (!model || screenPlane) return;

    // bbox модели уже в центре (0,0,0)
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Хочешь “увеличить” — меняй 0.72 -> 0.80
    const w = size.x * 0.78;
    const h = w * 9 / 16;

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screenPlane.renderOrder = 999;
    screenPlane.frustumCulled = false;

    // Ставим ПЕРЕД телеком по локальной Z (после поворота)
    screenPlane.position.set(0, size.y * 0.10, box.max.z + size.z * 0.03);

    // Не крутим каждый кадр — не будет “улёта”
    tvRoot.add(screenPlane);
  }

  // load FBX
  const loader = new THREE.FBXLoader();
  loader.load("./assets/models/retro_tv/tv.fbx", (fbx) => {
    model = fbx;

    // scale to sane size
    const b0 = new THREE.Box3().setFromObject(model);
    const s0 = b0.getSize(new THREE.Vector3());
    const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
    model.scale.setScalar(1.2 / max0);

    // rotate
    model.rotation.set(0, FORCE_ROT_Y, 0);

    // center AFTER rotate
    const b1 = new THREE.Box3().setFromObject(model);
    const c1 = b1.getCenter(new THREE.Vector3());
    model.position.sub(c1);

    // body materials
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = bodyMat;
    });

    tvRoot.add(model);

    // Важно: сначала камера, потом экран-плоскость (чтобы не было “ребром”)
    fitCameraTo(tvRoot);
    createScreenPlaneOnce();
  });

  // render control
  let active = false;
  let raf = 0;

  function render() {
    if (!active) return;
    updateVideoTexture();
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

  // GSAP fly-through (картинка window.png)
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
      onLeaveBack: stop
    }
  })
    .to(img, { scale: 2, z: 350, transformOrigin: "center center", ease: "power1.inOut" })
    .to(img, { opacity: 0, ease: "power1.out" }, 0.55);
})();
