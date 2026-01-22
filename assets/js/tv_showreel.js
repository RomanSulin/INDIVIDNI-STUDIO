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
    console.warn('[tvfly] FBXLoader missing (check fflate + loader order)');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ====== ТУТ ПОВОРОТ ТЕЛЕКА (твоя настройка) ======
  // варианты: 0, Math.PI/2, Math.PI, 3*Math.PI/2
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // ====== Video ======
  video.muted = true;
  video.loop = true;

  function syncSoundBtn() {
    const on = !video.muted;
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }

  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    video.play().catch(() => {});
    syncSoundBtn();
  });
  syncSoundBtn();

  // ====== Three ======
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

  // Свет без “молока”
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
// ===== CanvasTexture вместо VideoTexture (гарантированно) =====
const vCanvas = document.createElement('canvas');
const vCtx = vCanvas.getContext('2d', { alpha: false });

const canvasTex = new THREE.CanvasTexture(vCanvas);
canvasTex.encoding = THREE.sRGBEncoding;
canvasTex.minFilter = THREE.LinearFilter;
canvasTex.magFilter = THREE.LinearFilter;
canvasTex.generateMipmaps = false;

const screenMat = new THREE.MeshBasicMaterial({
  map: canvasTex,
  side: THREE.DoubleSide
});
screenMat.toneMapped = false;
  screenMat.side = THREE.DoubleSide;
screenMat.depthTest = false;
screenMat.depthWrite = false;

// функция обновления кадра
function updateVideoTexture() {
  // когда есть кадры
  if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
    // один раз под размер видео
    if (vCanvas.width !== video.videoWidth) {
      vCanvas.width = video.videoWidth;
      vCanvas.height = video.videoHeight;
    }
    vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
    canvasTex.needsUpdate = true;
  }
}

  
  screenMat.toneMapped = false;
  // чтобы видео всегда рисовалось поверх
  screenMat.depthTest = false;
  screenMat.depthWrite = false;

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
  let raf = 0;
  let active = false;
  let scrollP = 0;

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

  // Поиск экрана (по имени + эвристика)
  function findScreenMesh(root) {
    let byName = null;
    root.traverse((o) => {
      if (byName || !o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      const mn = (o.material?.name || '').toLowerCase();
      if (n.includes('screen') || n.includes('display') || n.includes('monitor') ||
          mn.includes('screen') || mn.includes('display')) {
        byName = o;
      }
    });
    if (byName) return byName;

    const rootBox = new THREE.Box3().setFromObject(root);
    let best = null;
    let bestScore = -1e9;

    root.traverse((o) => {
      if (!o.isMesh) return;

      const b = new THREE.Box3().setFromObject(o);
      const s = b.getSize(new THREE.Vector3());
      const c = b.getCenter(new THREE.Vector3());

      const dims = [Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)].sort((a, b) => a - b);
      const thickness = dims[0];
      const area = dims[1] * dims[2];
      const flat = thickness / (dims[2] + 1e-6);
      if (flat > 0.12 || area < 0.02) return;

      const aspect = dims[2] / (dims[1] + 1e-6);
      const aspectDist = Math.min(Math.abs(aspect - 1.333), Math.abs(aspect - 1.777));
      const frontness = (c.z - rootBox.min.z) / ((rootBox.max.z - rootBox.min.z) + 1e-6);

      const score = (area * 2.0) + (frontness * 0.8) - (aspectDist * 1.0);
      if (score > bestScore) { bestScore = score; best = o; }
    });

    return best;
  }

  // Фолбэк: плоскость с видео прямо перед телеком (шоурилл будет всегда)
  function addFallbackPlane(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());

    const w = size.x * 0.38;
    const h = w * 9 / 16;

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    plane.name = 'TV_FALLBACK_SCREEN';
    plane.renderOrder = 10;

    // Локальная позиция относительно root (root пока не в сцене — это ок)
    // ставим чуть выше центра и ближе к камере (box.max.z)
    plane.position.set(0, size.y * 0.06, box.max.z + size.z * 0.01);

    root.add(plane);
    return plane;
  }

  // ====== Load FBX ======
  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // 1) scale до адекватного размера
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = box0.getSize(new THREE.Vector3());
      const max0 = Math.max(size0.x, size0.y, size0.z) || 1;

      const target = 1.2; // если всё ещё слишком большой/маленький — меняй тут (1.0..1.4)
      model.scale.setScalar(target / max0);

      // 2) ПОВОРОТ
      model.rotation.set(0, FORCE_ROT_Y, 0);

      // 3) КРИТИЧНО: центрируем ПОСЛЕ поворота
      const box1 = new THREE.Box3().setFromObject(model);
      const center1 = box1.getCenter(new THREE.Vector3());
      model.position.sub(center1);

      // 4) ищем экран
      const screen = findScreenMesh(model);

      // 5) материалы
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = (screen && o === screen) ? screenMat : bodyMat;
      });

      // 6) ФОЛБЭК экран всегда (даже если screen найден, оставляем — он не мешает)
      addFallbackPlane(model);

      tvRoot.add(model);
      // ===== ALWAYS-VISIBLE VIDEO PLANE (over the TV) =====
const tvBox = new THREE.Box3().setFromObject(model);
const tvSize = tvBox.getSize(new THREE.Vector3());

// размер “экрана” (подгоняется, но начнём с адекватных)
const planeW = tvSize.x * 0.36;
const planeH = planeW * 9 / 16;

const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), screenMat);
plane.renderOrder = 999;
plane.frustumCulled = false;

// ставим чуть выше центра и немного “перед” передней гранью TV
plane.position.set(0, tvSize.y * 0.06, tvBox.max.z + tvSize.z * 0.02);

// добавляем как child модели, чтобы ехал вместе с ней
model.add(plane);

      // --- Fallback screen: гарантированно видно видео поверх телика ---
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());

// размеры экрана (подгонишь потом)
const w = size.x * 0.38;
const h = w * 9 / 16;

const fallback = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
fallback.renderOrder = 999;
fallback.frustumCulled = false;

// ставим чуть впереди передней грани телика
// (если будет “слишком наружу/внутрь” — меняй множитель 0.03)
fallback.position.set(0, size.y * 0.06, box.max.z + size.z * 0.03);

// если у тебя телик повернут — плоскость всё равно будет вместе с моделью
model.add(fallback);


      // 7) камера по модели
      fitCameraTo(tvRoot);

      console.log('[tvfly] loaded. screen:', screen ? (screen.name || '(no name)') : 'not found (fallback ok)');
    },
    undefined,
    (err) => console.error('[tvfly] FBX load error', err)
  );

  // ====== Render ======
  function render() {
    if (!active) return;

    const t = easeOutCubic(scrollP);

    // ВАЖНО: не крутим tvRoot, пока центрируем (иначе кажется “не по центру”)
    tvRoot.rotation.y = 0;

    camera.lookAt(0, 0, 0);
    updateVideoTexture();
    if (video.readyState >= 2) videoTex.needsUpdate = true;
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
