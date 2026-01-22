/* global THREE, gsap, ScrollTrigger */

(function () {
  const section = document.querySelector('.tvfly');
  if (!section) return;

  const wrapper = section.querySelector('.tvfly__wrapper');
  const img = section.querySelector('.tvfly__image'); 
  const canvas = section.querySelector('#tvflyCanvas');
  const video = section.querySelector('#tvflyVideo');
  const soundBtn = section.querySelector('#tvflySound');

  if (!wrapper || !img || !canvas || !video || !soundBtn) {
    console.warn('[tvfly] Missing DOM nodes');
    return;
  }
  if (!window.THREE) {
    console.warn('[tvfly] THREE missing');
    return;
  }
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn('[tvfly] GSAP/ScrollTrigger missing');
    return;
  }
  if (!THREE.FBXLoader) {
    console.warn('[tvfly] FBXLoader missing');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---- Sound toggle ----
  video.muted = true;
  video.loop = true;

  function syncSoundBtn() {
    const on = !video.muted;
    soundBtn.classList.toggle('is-on', on);
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }

  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (video.paused) video.play().catch(() => {});
    syncSoundBtn();
  });
  syncSoundBtn();

  // ---- Three.js setup ----
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

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.35, 2.9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(2, 3, 2);
  scene.add(dir);

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

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  // load textures
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
    roughness: 1,
    metalness: 1
  });

  const screenMat = new THREE.MeshBasicMaterial({ map: videoTex });
  screenMat.toneMapped = false;

  let model = null;
  let screenMesh = null;

  function pickScreenMesh(root) {
    const candidates = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    root.traverse((o) => {
      if (!o.isMesh) return;
      box.setFromObject(o);
      box.getSize(size);
      box.getCenter(center);

      const dx = Math.abs(size.x);
      const dy = Math.abs(size.y);
      const dz = Math.abs(size.z);
      const dims = [dx, dy, dz].sort((a, b) => a - b);
      const thickness = dims[0];
      const maxDim = dims[2];
      const midDim = dims[1];
      const flat = thickness / (maxDim + 1e-6);
      const area = midDim * maxDim;

      // Screen is usually: thin + decent area
      if (flat < 0.12 && area > 0.02) {
        candidates.push({ o, area, z: center.z, flat });
      }
    });

    candidates.sort((a, b) => (b.area - a.area) || (b.z - a.z));
    return candidates[0] ? candidates[0].o : null;
  }

  // load FBX
  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // Scale & center
      const b = new THREE.Box3().setFromObject(model);
      const s = new THREE.Vector3();
      b.getSize(s);
      const max = Math.max(s.x, s.y, s.z) || 1;
      const scale = 1.15 / max; // target size
      model.scale.setScalar(scale);

      // re-center after scaling
      b.setFromObject(model);
      const c = new THREE.Vector3();
      b.getCenter(c);
      model.position.sub(c);
      model.position.y -= 0.28;

      // try orient to camera
      model.rotation.y = Math.PI; // flip if TV faces away

      // pick screen mesh
      screenMesh = pickScreenMesh(model);
      if (!screenMesh) {
        console.warn('[tvfly] Screen mesh not found. Printing mesh names:');
        model.traverse((o) => { if (o.isMesh) console.log('mesh:', o.name); });
      }

      // apply materials
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        o.receiveShadow = false;

        if (screenMesh && o === screenMesh) {
          o.material = screenMat;
        } else {
          o.material = bodyMat;
        }
      });

      tvRoot.add(model);
    },
    undefined,
    (err) => console.error('[tvfly] FBX load error', err)
  );

  // ---- Animation loop (only while section active) ----
  let active = false;
  let raf = 0;
  let scrollP = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function render() {
    if (!active) return;

    const t = easeOutCubic(scrollP);

    // camera push-in
    camera.position.z = 2.9 - 0.9 * t;
    camera.position.y = 0.35 - 0.05 * t;

    // subtle TV rotate
    tvRoot.rotation.y = (t - 0.5) * 0.35;
    tvRoot.rotation.x = 0.04 - 0.04 * t;

    // scale up a bit
    const s = 0.85 + 0.25 * t;
    tvRoot.scale.setScalar(s);

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

  // ---- GSAP fly-through timeline ----
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
      onUpdate: (self) => {
        scrollP = self.progress;
      }
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
