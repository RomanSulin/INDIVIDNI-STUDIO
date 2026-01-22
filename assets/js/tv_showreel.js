/* global THREE, gsap, ScrollTrigger */

(function () {
  const section = document.querySelector('.tvfly');
  if (!section) return;

  const wrapper = section.querySelector('.tvfly__wrapper');
  const img = section.querySelector('.tvfly__image');
  const canvas = section.querySelector('#tvflyCanvas');
  const video = section.querySelector('#tvflyVideo');
  const soundBtn = section.querySelector('#tvflySound');
  const stage = section.querySelector('.tvfly__stage');

  if (!wrapper || !img || !canvas || !video || !soundBtn || !stage) return;
  if (!window.THREE || !window.gsap || !window.ScrollTrigger) return;
  if (!THREE.FBXLoader) {
    console.warn('[tvfly] FBXLoader missing: check script order in index.html');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---- On-screen status (bottom-left) ----
  const status = document.createElement('div');
  status.style.cssText = [
    'position:absolute',
    'left:12px',
    'bottom:12px',
    'z-index:6',
    'padding:10px 12px',
    'border-radius:12px',
    'background:rgba(0,0,0,.55)',
    'border:1px solid rgba(255,255,255,.12)',
    'color:rgba(255,255,255,.85)',
    'font:12px/1.35 Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
    'backdrop-filter: blur(10px)',
    'max-width: 55ch',
    'pointer-events:none'
  ].join(';');
  stage.appendChild(status);

  const setStatus = (t) => { status.textContent = t; };

  // quick fetch checks (shows 404 immediately)
  (async () => {
    try {
      const r1 = await fetch('./assets/models/retro_tv/tv.fbx', { method: 'GET', cache: 'no-store' });
      setStatus(`FBX request: ${r1.status} ${r1.ok ? '(ok)' : '(fail)'}`);
    } catch (e) {
      setStatus(`FBX request failed: ${e?.message || e}`);
    }
  })();

  // ---- Sound toggle ----
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

  // ---- Three.js ----
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
  camera.position.set(0, 0.2, 3.2);

  // lights (чтобы на черном фоне точно читалось)
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(2.5, 3, 2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-3, 1.8, -2.5);
  scene.add(rim);

  // debug cube (у тебя он уже виден — оставляем)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xff00ff })
  );
  cube.position.set(0, 0, 0);
  scene.add(cube);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // VideoTexture for TV screen
  const videoTex = new THREE.VideoTexture(video);
  videoTex.encoding = THREE.sRGBEncoding;
  videoTex.flipY = false;

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  const texLoader = new THREE.TextureLoader();

  const texBase = texLoader.load('./assets/models/retro_tv/textures/basecolor.png');
  const texNormal = texLoader.load('./assets/models/retro_tv/textures/normal.png');
  const texRough = texLoader.load('./assets/models/retro_tv/textures/roughness.png');
  const texMetal = texLoader.load('./assets/models/retro_tv/textures/metallic.png');

  texBase.encoding = THREE.sRGBEncoding;

  // корпус делаем НЕ супер-металлическим (иначе на черном он "исчезает")
  const bodyMat = new THREE.MeshStandardMaterial({
    map: texBase,
    normalMap: texNormal,
    roughnessMap: texRough,
    metalnessMap: texMetal,
    roughness: 0.95,
    metalness: 0.15,
    emissive: new THREE.Color(0x111111),
    emissiveIntensity: 0.6
  });

  const screenMat = new THREE.MeshBasicMaterial({ map: videoTex });
  screenMat.toneMapped = false;

  let model = null;
  let boxHelper = null;

  // heuristic: ищем "плоский большой" меш как экран
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

      const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => a - b);
      const thickness = dims[0];
      const area = dims[1] * dims[2];
      const flat = thickness / (dims[2] + 1e-6);

      if (flat < 0.12 && area > 0.02) {
        candidates.push({ o, area, z: center.z });
      }
    });

    candidates.sort((a, b) => (b.area - a.area) || (b.z - a.z));
    return candidates[0] ? candidates[0].o : null;
  }

  setStatus('Loading FBX…');

  const loader = new THREE.FBXLoader();
  loader.load(
    './assets/models/retro_tv/tv.fbx',
    (fbx) => {
      model = fbx;

      // центрирование + масштабирование (чтобы точно попало в кадр)
      const b = new THREE.Box3().setFromObject(model);
      const s = new THREE.Vector3();
      b.getSize(s);
      const max = Math.max(s.x, s.y, s.z) || 1;

      const target = 1.8;                 // делаем больше, чтобы увидеть 100%
      const scale = target / max;
      model.scale.setScalar(scale);

      b.setFromObject(model);
      const c = new THREE.Vector3();
      b.getCenter(c);
      model.position.sub(c);

      model.position.y -= 0.05;
      model.rotation.y = Math.PI;         // часто FBX спиной к камере

      const screenMesh = pickScreenMesh(model);

      // назначаем материалы
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.material = (screenMesh && o === screenMesh) ? screenMat : bodyMat;
      });

      tvRoot.add(model);

      // зелёный бокс вокруг модели для debug
      boxHelper = new THREE.BoxHelper(model, 0x00ff00);
      scene.add(boxHelper);

      setStatus(`FBX LOADED ✅  | Screen mesh: ${screenMesh ? (screenMesh.name || '(no name)') : 'NOT FOUND'}  | If NOT FOUND — TV still should be visible.`);
    },
    (xhr) => {
      if (xhr && xhr.total) {
        const p = Math.round((xhr.loaded / xhr.total) * 100);
        setStatus(`Loading FBX… ${p}%`);
      } else {
        setStatus(`Loading FBX…`);
      }
    },
    (err) => {
      console.error('[tvfly] FBX load error', err);
      setStatus(`FBX ERROR ❌  ${err?.message || err}`);
    }
  );

  // ---- Render loop control ----
  let active = false;
  let raf = 0;
  let scrollP = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function render() {
    if (!active) return;

    const t = easeOutCubic(scrollP);

    camera.position.z = 3.2 - 1.2 * t;
    camera.position.y = 0.2 - 0.06 * t;
    camera.lookAt(0, 0, 0);

    tvRoot.rotation.y = (t - 0.5) * 0.28;
    tvRoot.rotation.x = 0.02 - 0.02 * t;

    if (boxHelper) boxHelper.update();

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

  // ---- GSAP fly-through ----
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
