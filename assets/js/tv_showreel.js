/* global THREE, gsap, ScrollTrigger */

(function () {
  const section = document.querySelector('.tvfly');
  if (!section) return;

  const wrapper = section.querySelector('.tvfly__wrapper');
  const img = section.querySelector('.tvfly__image');
  const canvas = section.querySelector('#tvflyCanvas');
  const video = section.querySelector('#tvflyVideo');
  const soundBtn = section.querySelector('#tvflySound');

  if (!wrapper || !img || !canvas || !video || !soundBtn) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger) return;
  if (!THREE.FBXLoader) {
    console.warn('[tvfly] FBXLoader missing (check script order + fflate)');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ===== Video =====
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  function syncSoundBtn() {
    const on = !video.muted;
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }

  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
    syncSoundBtn();
  });
  syncSoundBtn();

  // ===== Three =====
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0.15, 3.0);

  // Свет (чтобы текстуры не были “в туманке”)
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
  window.addEventListener('resize', resize);
  resize();

  // VideoTexture
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.flipY = false;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.generateMipmaps = false;

  const screenMat = new THREE.MeshBasicMaterial({
    map: videoTex,
    side: THREE.DoubleSide
  });
  screenMat.toneMapped = false;

  // Textures
  const texLoader = new THREE.TextureLoader();
  const texBase = texLoader.load('./assets/models/retro_tv/textures/basecolor.png');
  const texNormal = texLoader.load('./assets/models/retro_tv/textures/normal.png');
  const texRough = texLoader.load('./assets/models/retro_tv/textures/roughness.png');
  const texMetal = texLoader.load('./assets/models/retro_tv/textures/metallic.png');
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
  let screenMesh = null;
  let fallbackPlane = null;

  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

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

    return { maxDim, dist };
  }

  function scoreMeshAsScreen(mesh, rootBox) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => a - b);
    const thickness = dims[0];
    const area = dims[1] * dims[2];
    const flat = thickness / (dims[2] + 1e-6);

    if (flat > 0.12 || area < 0.02) return -1e9;

    const aspect = dims[2] / (dims[1] + 1e-6);
    const aspectDist = Math.min(Math.abs(aspect - 1.333), Math.abs(aspect - 1.777));

    // “на переднем плане” — ближе к камере (камера по +Z, смотрит на 0)
    const frontness = (center.z - rootBox.min.z) / ((rootBox.max.z - rootBox.min.z) + 1e-6);

    // экран обычно примерно в центре по Y
    const yMid = (rootBox.min.y + rootBox.max.y) * 0.5;
    const yDist = Math.abs(center.y - yMid) / ((rootBox.max.y - rootBox.min.y) + 1e-6);

    // итоговый скор
    return (area * 2.0) + (frontness * 0.8) - (aspectDist * 1.0) - (yDist * 0.6);
  }

  function findBestScreen(root) {
    const rootBox = new THREE.Box3().setFromObject(root);

    // 1) по имени (быстро)
    let named = null;
    root.traverse((o) => {
      if (named || !o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      const mn = (o.material?.name || '').toLowerCase();
      if (n.includes('screen') || n.includes('display') || n.includes('monitor') ||
          mn.includes('screen') || mn.includes('display')) {
        named = o;
      }
    });
    if (named) return named;

    // 2) скор по “плоскости”
    let best = null;
    let bestScore = -1e9;
    root.traverse((o) => {
      if (!o.isMesh) return;
      const s = scoreMeshAsScreen(o, rootBox);
      if (s > bestScore) { bestScore = s; best = o; }
    });

    return best;
  }

  function attachFallbackScreenPlane(root) {
    // ставим плоскость перед моделью, чтобы шоу-рилл был В ЛЮБОМ СЛУЧАЕ
    const rootBox = new THREE.Box3().setFromObject(root);
    const size = rootBox.getSize(new THREE.Vector3());
    const center = rootBox.getCenter(new THREE.Vector3());

    const planeW = size.x * 0.38;
    const planeH = planeW * 9 / 16;

    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const plane = new THREE.Mesh(geo, screenMat);

    // позиция: чуть выше центра и чуть ближе к камере
    const worldPos = new THREE.Vector3(center.x, center.y + size.y * 0.06, rootBox.max.z + size.z * 0.01);
    // в локальные координаты модели
    root.updateMatrixWorld(true);
    root.worldToLocal(worldPos);

    plane.position.copy(worldPos);
    plane.renderOrder = 10;
    plane.name = 'TV_SCREEN_FALLBACK';

    root.add(plane);
    return plane;
  }

  // ===== Load FBX =====
  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // 1) Масштабируем до разумного размера
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = box0.getSize(new THREE.Vector3());
      const max0 = Math.max(size0.x, size0.y, size0.z) || 1;
      const target = 1.2; // меньше — чтобы не был “гигант”
      model.scale.setScalar(target / max0);

      // 2) Центрируем (никаких жёстких -0.28!)
      const box1 = new THREE.Box3().setFromObject(model);
      const c1 = box1.getCenter(new THREE.Vector3());
      model.position.sub(c1);

// РУЧНОЙ поворот (выбери нужный угол)
const FORCE_ROT_Y = (3 * Math.PI) / 2;
// варианты: 0, Math.PI/2, Math.PI, 3*Math.PI/2

model.rotation.set(0, FORCE_ROT_Y, 0);

// после поворота — заново ищем экран
screenMesh = findBestScreen(model);

      // 4) Материалы
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = (screenMesh && o === screenMesh) ? screenMat : bodyMat;
      });

      // 5) Если экран не найден или он оказался “не тем”, ставим фолбэк-плоскость
      if (!screenMesh) {
        fallbackPlane = attachFallbackScreenPlane(model);
      }

      tvRoot.add(model);

      // 6) Подгоняем камеру под размер модели
      fitCameraTo(tvRoot);

      console.log('[tvfly] loaded. rotationY=', bestRot, 'screen=', screenMesh?.name || 'fallback');
    },
    undefined,
    (err) => console.error('[tvfly] FBX load error', err)
  );

  // ===== Render + GSAP =====
  let active = false;
  let raf = 0;
  let scrollP = 0;

  function render() {
    if (!active) return;

    const t = easeOutCubic(scrollP);

    // лёгкий “киношный” поворот, без уезда из центра
    tvRoot.rotation.y = (t - 0.5) * 0.22;

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
      start: 'top top',
      end: '+=160%',
      pin: true,
      scrub: true,
      markers: false,
      onEnter: start,
      onEnterBack: start,
      onLeave: stop,
      onLeaveBack: stop,
      onUpdate: (self) => { scrollP = clamp01(self.progress); }
    }
  })
  .to(img, {
    scale: 2,
    z: 350,
    transformOrigin: 'center center',
    ease: 'power1.inOut'
  })
  .to(img, {
    opacity: 0,
    ease: 'power1.out'
  }, 0.55);

})();
