/* global THREE, gsap, ScrollTrigger */

(() => {
  const section = document.querySelector(".tvfly");
  if (!section) return console.error("[tvfly] .tvfly not found");

  const wrapper = section.querySelector(".tvfly__wrapper");
  const img = section.querySelector(".tvfly__image");
  const canvas = section.querySelector("#tvflyCanvas");
  const video = section.querySelector("#tvflyVideo");

  if (!wrapper || !img || !canvas || !video) {
    return console.error("[tvfly] missing DOM", {wrapper:!!wrapper,img:!!img,canvas:!!canvas,video:!!video});
  }
  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !THREE.FBXLoader) {
    return console.error("[tvfly] missing libs", {
      THREE: !!window.THREE,
      gsap: !!window.gsap,
      ScrollTrigger: !!window.ScrollTrigger,
      FBXLoader: !!(window.THREE && THREE.FBXLoader)
    });
  }

  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  const FORCE_ROT_Y = (3 * Math.PI) / 2;

  // video
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.volume = 1;

  const toggleSound = () => {
    video.muted = !video.muted;
    video.play().catch(()=>{});
  };

  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:"high-performance" });
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3,3,2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-3,1.2,-2.5);
  scene.add(fill);

  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // CanvasTexture full-frame
  const vCanvas = document.createElement("canvas");
  const vCtx = vCanvas.getContext("2d", {alpha:false});
  const canvasTex = new THREE.CanvasTexture(vCanvas);
  canvasTex.encoding = THREE.sRGBEncoding;
  canvasTex.minFilter = THREE.LinearFilter;
  canvasTex.magFilter = THREE.LinearFilter;
  canvasTex.generateMipmaps = false;

  let videoAR = 5/4;
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) videoAR = video.videoWidth / video.videoHeight;
  }, { once:true });

  function updateVideoTexture(){
    if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) return;
    if (vCanvas.width !== video.videoWidth || vCanvas.height !== video.videoHeight) {
      vCanvas.width = video.videoWidth;
      vCanvas.height = video.videoHeight;
    }
    vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
    canvasTex.needsUpdate = true;
  }

  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, side: THREE.DoubleSide, transparent:false });
  // сделаем экран гарантированно видимым (не перекрывается стеклом)
  screenMat.depthTest = false;
  screenMat.depthWrite = false;
  screenMat.toneMapped = false;

  // LoadingManager: ремап текстур из FBX (и пробелы, и подчёркивания)
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const file = decodeURIComponent(url).split("/").pop();

    // варианты, которые FBX реально запрашивает у тебя
    if (file === "retro_tv 1 BaseColor.png") return "./assets/models/retro_tv 1 BaseColor.png";
    if (file === "retro_tv 1 Normal.png")    return "./assets/models/retro_tv 1 Normal.png";
    if (file === "retro_tv 1 Roughness.png") return "./assets/models/retro_tv 1 Roughness.png";
    if (file === "retro_tv 1 Metallic.png")  return "./assets/models/retro_tv 1 Metallic.png";

    // на всякий — если вдруг попадётся с underscore
    if (file === "retro_tv_1_BaseColor.png") return "./assets/models/retro_tv 1 BaseColor.png";
    if (file === "retro_tv_1_Normal.png")    return "./assets/models/retro_tv 1 Normal.png";
    if (file === "retro_tv_1_Roughness.png") return "./assets/models/retro_tv 1 Roughness.png";
    if (file === "retro_tv_1_Metallic.png")  return "./assets/models/retro_tv 1 Metallic.png";

    return url;
  });

  const texLoader = new THREE.TextureLoader(manager);

  // body textures (твои новые)
  const base = texLoader.load("./assets/models/retro_tv/textures/basecolor.png");
  const normal = texLoader.load("./assets/models/retro_tv/textures/normal.png");
  const rough = texLoader.load("./assets/models/retro_tv/textures/roughness.png");
  const metal = texLoader.load("./assets/models/retro_tv/textures/metallic.png");
  base.encoding = THREE.sRGBEncoding;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: base, normalMap: normal, roughnessMap: rough, metalnessMap: metal,
    roughness: 0.9, metalness: 0.08, color: 0xffffff
  });

  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  let model = null;
  let screenPlane = null;

  // button textures
  const soundTex = texLoader.load("./assets/png/sound.png");
  soundTex.encoding = THREE.sRGBEncoding;

  const btnMat = new THREE.MeshBasicMaterial({ map: soundTex, transparent:true, alphaTest:0.25, side: THREE.DoubleSide });
  btnMat.depthTest = false; btnMat.depthWrite = false;

  const glowMat = new THREE.MeshBasicMaterial({
    map: soundTex,
    transparent:true,
    alphaTest:0.25,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(1,0.15,0.15),
    opacity: 0.0,
    side: THREE.DoubleSide
  });
  glowMat.depthTest = false; glowMat.depthWrite = false;

  let soundBtn3D = null, soundGlow3D = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pointerToNDC(e){
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  function mountScreenAndButton(){
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // ===== SCREEN =====
    if (!screenPlane) {
      const w = size.x * (isMobile ? 0.74 : 0.88);
      const h = w / videoAR;
      screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
      screenPlane.renderOrder = 10;

      // WORLD -> LOCAL
      const worldPos = new THREE.Vector3(center.x, center.y + size.y*0.10, box.max.z + size.z*0.003);
      const localPos = worldPos.clone();
      model.worldToLocal(localPos);
      screenPlane.position.copy(localPos);

      model.add(screenPlane);
    }

    // ===== BUTTON =====
    if (!soundBtn3D) {
      const bw = size.x * (isMobile ? 0.16 : 0.14);
      const bh = bw * 0.45;

      soundGlow3D = new THREE.Mesh(new THREE.PlaneGeometry(bw*1.22, bh*1.22), glowMat);
      soundGlow3D.renderOrder = 999;

      soundBtn3D = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), btnMat);
      soundBtn3D.renderOrder = 1000;

      const worldPos = new THREE.Vector3(
        center.x + size.x*0.23,
        center.y - size.y*0.33,
        box.max.z + size.z*0.006
      );
      const localPos = worldPos.clone();
      model.worldToLocal(localPos);

      soundGlow3D.position.copy(localPos);
      soundBtn3D.position.copy(localPos);

      model.add(soundGlow3D);
      model.add(soundBtn3D);
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    canvas.style.cursor = hit.length ? "pointer" : "default";
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!soundBtn3D) return;
    pointerToNDC(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([soundBtn3D, soundGlow3D].filter(Boolean), true);
    if (hit.length) toggleSound();
  });

  // FBX loader with manager
  const loader = new THREE.FBXLoader(manager);
  loader.load("./assets/models/retro_tv/tv.fbx", (fbx) => {
    model = fbx;

    // normalize scale
    const b0 = new THREE.Box3().setFromObject(model);
    const s0 = b0.getSize(new THREE.Vector3());
    const max0 = Math.max(s0.x, s0.y, s0.z) || 1;
    model.scale.setScalar(1.0 / max0);

    model.rotation.set(0, FORCE_ROT_Y, 0);

    // center after rotate
    const b1 = new THREE.Box3().setFromObject(model);
    const c1 = b1.getCenter(new THREE.Vector3());
    model.position.sub(c1);

    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = bodyMat;
    });

    tvRoot.add(model);

    // camera fit
    const box = new THREE.Box3().setFromObject(tvRoot);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = camera.fov * (Math.PI / 180);
    const dist = (maxDim/2)/Math.tan(fov/2) * (isMobile ? 2.3 : 2.0);
    camera.position.set(0, maxDim*0.10, dist);
    camera.updateProjectionMatrix();

    mountScreenAndButton();
  });

  // GSAP + render
  let active = false, raf = 0, progress = 0;

  function render(){
    if (!active) return;

    updateVideoTexture();

    // glow
    if (soundGlow3D) {
      const time = performance.now()*0.001;
      soundGlow3D.material.opacity = video.muted
        ? 0.10 + 0.10*(0.5 + 0.5*Math.sin(time*2.6))
        : 0.35;
      soundGlow3D.material.needsUpdate = true;
      soundGlow3D.lookAt(camera.position);
    }
    if (soundBtn3D) soundBtn3D.lookAt(camera.position);

    const t = progress;
    tvRoot.scale.setScalar((isMobile ? 0.55 : 0.45) + (isMobile ? 0.40 : 0.60)*t);

    camera.lookAt(0,0,0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

  function start(){
    if (active) return;
    active = true;
    video.play().catch(()=>{});
    raf = requestAnimationFrame(render);
  }
  function stop(){
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
