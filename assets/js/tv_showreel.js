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
    console.warn('[tvfly] FBXLoader missing (check script order)');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // === DEBUG (оставь false) ===
  const DEBUG = false;

  // ---- video sound ----
  video.muted = true;
  video.loop = true;

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

  // ---- renderer ----
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
  camera.position.set(0, 0.2, 3.2);

  // light: чтобы тёмная текстура ТВ читалась
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 3, 2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-3, 1.8, -2.5);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.55);
  scene.add(hemi);

  // debug cube (выключен)
  if (DEBUG) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    scene.add(cube);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- VideoTexture ----
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.flipY = false;

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  // ---- textures ----
  const texLoader = new THREE.TextureLoader();
  const texBase = texLoader.load('./assets/models/retro_tv/textures/basecolor.png');
  const texNormal = texLoader.load('./assets/models/retro_tv/textures/normal.png');
  const texRough = texLoader.load('./assets/models/retro_tv/textures/roughness.png');
  const texMetal = texLoader.load('./assets/models/retro_tv/textures/metallic.png');

  texBase.encoding = THREE.sRGBEncoding;

  // Текстура очень тёмная. Добавляем легкий emissive, чтобы ТВ не исчезал на black.
  const bodyMat = new THREE.MeshStandardMaterial({
    map: texBase,
    normalMap: texNormal,
    roughnessMap: texRough,
    metalnessMap: texMetal,
    roughness: 0.95,
    metalness: 0.1,
    emissive: new THREE.Color(0x222233),
    emissiveIntensity: 0.8
  });

  const screenMat = new THREE.MeshBasicMaterial({ map: videoTex });
  screenMat.toneMapped = false;

  let model = null;
  let screenMesh = null;
  let fit = { camZ: 3.2, maxDim: 1.0 };

  function fitCameraToObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const fov = camera.fov * (Math.PI / 180);
    const camZ = (maxDim / 2) / Math.tan(fov / 2) * 1.35;

    camera.position.set(0, maxDim * 0.12, camZ);
    camera.near = Math.max(0.01, camZ / 100);
    camera.far = camZ * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    return { camZ, maxDim };
  }

  // экран: сначала пытаемся найти по имени, потом по “плоскости”
  function findScreenMesh(root) {
    let byName = null;
    root.traverse((o) => {
      if (byName || !o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      const mn = (o.material?.name || '').toLowerCase();
      if (n.includes('screen') || n.includes('display') || mn.includes('screen') || mn.includes('display')) {
        byName = o;
      }
    });
    if (byName) return byName;

    const candidates = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    root.traverse((o) => {
      if (!o.isMesh) return;
      box.setFromObject(o);
      box.getSize(size);
      box.getCenter(center);

      const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => a - b);
      const thickness = dims[0];
      const area = dims[1] * dims[2];
      const flat = thickness / (dims[2] + 1e-6);

      // плоский и достаточно большой
      if (flat < 0.12 && area > 0.02) {
        const aspect = dims[2] / (dims[1] + 1e-6);
        // экран чаще около 4:3 или 16:9
        const aspectScore = Math.min(Math.abs(aspect - 1.33), Math.abs(aspect - 1.77));
        candidates.push({ o, area, aspectScore, z: center.z });
      }
    });

    candidates.sort((a, b) =>
      (a.aspectScore - b.aspectScore) || (b.area - a.area) || (b.z - a.z)
    );

    return candidates[0] ? candidates[0].o : null;
  }

  // ---- load FBX ----
  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // центрируем
      const b0 = new THREE.Box3().setFromObject(model);
      const c0 = b0.getCenter(new THREE.Vector3());
      model.position.sub(c0);

      // масштаб под “условные метры” (чтобы не было “внутри модели”)
      const s0 = b0.getSize(new THREE.Vector3());
      const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
      const targetSize = 1.6;             // итоговый габарит ТВ в сцене
      model.scale.setScalar(targetSize / max0);

      // ещё раз центрируем после scale
      const b1 = new THREE.Box3().setFromObject(model);
      const c1 = b1.getCenter(new THREE.Vector3());
      model.position.sub(c1);

      // развернём к камере (часто FBX задом)
      model.rotation.y = Math.PI;

      // ищем экран
      screenMesh = findScreenMesh(model);

      // назначаем материалы
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = (screenMesh && o === screenMesh) ? screenMat : bodyMat;
      });

      tvRoot.add(model);

      // после загрузки — подстроить камеру под модель
      fit = fitCameraToObject(tvRoot);

      console.log('[tvfly] FBX loaded. Screen mesh:', screenMesh ? (screenMesh.name || '(no name)') : 'NOT FOUND');
    },
    undefined,
    (err) => {
      console.error('[tvfly] FBX load error', err);
    }
  );

  // ---- render control + GSAP ----
  let active = false;
  let raf = 0;
  let scrollP = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function render() {
    if (!active) return;

    const t = easeOutCubic(scrollP);

    // лёгкая анимация (без “внутрь модели”)
    const baseZ = fit.camZ || 3.2;
    camera.position.z = baseZ - (fit.maxDim * 0.35) * t;
    camera.position.y = (fit.maxDim * 0.12) - (fit.maxDim * 0.03) * t;
    camera.lookAt(0, 0, 0);

    tvRoot.rotation.y = (t - 0.5) * 0.25;

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
      onUpdate: (self) => { scrollP = self.progress; }
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
