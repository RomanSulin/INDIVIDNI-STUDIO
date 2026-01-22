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

  // ====== ориентация телека (твоя настройка) ======
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // ====== video ======
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

  // ====== three ======
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

  // ===== CanvasTexture (надёжнее VideoTexture в твоём кейсе) =====
  const vCanvas = document.createElement('canvas');
  const vCtx = vCanvas.getContext('2d', { alpha: false });

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

  const screenMat = new THREE.MeshBasicMaterial({
    map: canvasTex,
    side: THREE.DoubleSide
  });
  screenMat.toneMapped = false;
  // чтобы “экран” не перекрывался стеклом/пластиком модели
  screenMat.depthTest = false;
  screenMat.depthWrite = false;

  // ===== textures body =====
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

  function addSingleScreenPlane(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());

    const w = size.x * 0.36;
    const h = w * 9 / 16;

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    plane.name = 'TV_SCREEN_PLANE';
    plane.renderOrder = 999;
    plane.frustumCulled = false;

    // по центру, чуть выше, и слегка перед фронтом
    plane.position.set(0, size.y * 0.06, box.max.z + size.z * 0.03);

    root.add(plane);
    return plane;
  }

  // ===== load FBX =====
  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // scale до адекватного размера
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = box0.getSize(new THREE.Vector3());
      const max0 = Math.max(size0.x, size0.y, size0.z) || 1;
      const target = 1.2;
      model.scale.setScalar(target / max0);

      // поворот
      model.rotation.set(0, FORCE_ROT_Y, 0);

      // центрирование ПОСЛЕ поворота
      const box1 = new THREE.Box3().setFromObject(model);
      const center1 = box1.getCenter(new THREE.Vector3());
      model.position.sub(center1);

      // материалы корпуса
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = bodyMat;
      });

      // один-единственный экран
      addSingleScreenPlane(model);

      tvRoot.add(model);
      fitCameraTo(tvRoot);

      console.log('[tvfly] loaded ok');
    },
    undefined,
    (err) => console.error('[tvfly] FBX load error', err)
  );

  function render() {
    if (!active) return;

    updateVideoTexture();      // <-- вот это двигает картинку на “экране”
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
