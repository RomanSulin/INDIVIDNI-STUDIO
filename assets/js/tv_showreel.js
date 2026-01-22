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

  // ТВ “лицом” (оставь свой рабочий)
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

  // ===== three renderer =====
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

  let videoAR = 5 / 4; // дефолт (1500/1200)
  let screenPlane = null;

  video.addEventListener(
    "loadedmetadata",
    () => {
      if (video.videoWidth && video.videoHeight) {
        videoAR = video.videoWidth / video.videoHeight;
        // если экран уже создан — подогнать геометрию
        if (screenPlane) {
          const w = screenPlane.geometry.parameters.width;
          screenPlane.geometry.dispose();
          screenPlane.geometry = new THREE.PlaneGeometry(w, w / videoAR);
        }
      }
    },
    { once: true }
  );

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
  screenMat.depthTest = true;
  screenMat.depthWrite = false;
  screenMat.polygonOffset = true;
  screenMat.polygonOffsetFactor = -1;
  screenMat.polygonOffsetUnits = -1;

  // ===== TV textures =====
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

    // ✅ УВЕЛИЧЕНИЕ ШОУРИЛА: меняй 0.80 -> 0.86/0.90
    const w = size.x * (isMobile ? 0.72 : 0.88);
    const h = w / videoAR;

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screenPlane.renderOrder = 2;
    screenPlane.frustumCulled = false;

    // чуть внутрь рамки, чтобы не вылезал на зуме
    screenPlane.position.set(0, size.y * 0.10, box.max.z - size.z * 0.02);

    model.add(screenPlane);
  }

  // ===== 3D SOUND BUTTON (PNG on TV) =====
  const buttonTex = texLoader.load("./assets/png/sound.png");
  buttonTex.encoding = THREE.sRGBEncoding;

  const btnMat = new THREE.MeshBasicMaterial({
    map: buttonTex,
    transparent: true,
    alphaTest: 0.25
  });
  btnMat.depthTest = false;
  btnMat.depthWrite = false;

  const glowMat = new THREE.MeshBasicMaterial({
    map: buttonTex,
    transparent: true,
    alphaTest: 0.25,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(1, 0.15, 0.15),
    opacity: 0.0
  });
  glowMat.depthTest = false;
  glowMat.depthWrite = false;

  let soundBtn3D = null;
  let soundGlow3D = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function mountSoundButtonOnTV() {
    if (!model || soundBtn3D) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const bw = size.x * (isMobile ? 0.16 : 0.14);
    const bh = bw * 0.45;

    soundGlow3D = new THREE.Mesh(new THREE.PlaneGeometry(bw * 1.22, bh * 1.22), glowMat);
    soundGlow3D.renderOrder = 999;

    soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
    soundBtn3D.name = "SOUND_BTN";
    soundBtn3D.renderOrder = 1000;

    // WORLD -> LOCAL (чтобы не улетало после поворота)
    const worldPos = new THREE.Vector3(
      center.x + size.x * 0.23,
      center.y - size.y * 0.33,
      box.max.z - size.z * 0.015
    );

    const localPos = worldPos.clone();
    model.worldToLocal(localPos);

    soundGlow3D.position.copy(localPos);
    soundBtn3D.position.copy(localPos);

    soundBtn3D.position.z += size.z * 0.002;
    soundGlow3D.position.z += size.z * 0.001;

    model.add(soundGlow3D);
    model.add(soundBtn3D);
  }

  function setCursorFromHover(e) {
    if (!soundBtn3D) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    canvas.style.cursor = hit.length ? "pointer" : "default";
  }

  canvas.addEventListener("pointermove", setCursorFromHover);

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    if (hit.length) toggleSound();
  });

  // ===== load FBX =====
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
    mountSoundButtonOnTV();

    tvRoot.scale.setScalar(0.55);
  });

  // ===== render + GSAP =====
  let active = false;
  let raf = 0;
  let progress = 0;

  function render() {
    if (!active) return;

    updateVideoTexture();

    // glow effect
    if (soundGlow3D) {
      const time = performance.now() * 0.001;
      soundGlow3D.material.opacity = video.muted
        ? 0.10 + 0.10 * (0.5 + 0.5 * Math.sin(time * 2.6))
        : 0.35;
      soundGlow3D.material.needsUpdate = true;
    }

    // button faces camera
    if (soundBtn3D) soundBtn3D.lookAt(camera.position);
    if (soundGlow3D) soundGlow3D.lookAt(camera.position);

    const t = progress;

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
    canvas.style.cursor = "default";
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
