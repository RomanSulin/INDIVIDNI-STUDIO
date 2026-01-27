/* global THREE */

(() => {
  const stage = document.querySelector("[data-tv-hero]");
  if (!stage) return;

  const canvas = document.getElementById("tvHeroCanvas");
  const video  = document.getElementById("tvHeroVideo");

  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // --------------------
  // THREE BASICS
  // --------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 3, 3);
  scene.add(key);

  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // --------------------
  // VIDEO TEXTURE
  // --------------------
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.play().catch(()=>{});

  const videoTex = new THREE.VideoTexture(video);
  videoTex.colorSpace = THREE.SRGBColorSpace;

  // --------------------
  // ROOT
  // --------------------
  const tvRoot = new THREE.Group();
  scene.add(tvRoot);

  let screenMesh = null;

  // --------------------
  // LOAD MODEL
  // --------------------
  const loader = new THREE.FBXLoader();

  loader.load("./assets/models/retro_tv/tv.fbx", fbx => {

    fbx.rotation.y = -Math.PI/2;

    // normalize scale
    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const s = 1 / Math.max(size.x, size.y, size.z);
    fbx.scale.setScalar(s);

    // center
    const c = box.getCenter(new THREE.Vector3());
    fbx.position.sub(c);

    // materials
    fbx.traverse(o=>{
      if (!o.isMesh) return;
      o.frustumCulled = false;
    });

    tvRoot.add(fbx);

    // find SCREEN
    screenMesh = findScreenMesh(fbx);
    if (!screenMesh) {
      console.error("SCREEN NOT FOUND");
      return;
    }

    // kill original screen material
    screenMesh.material.transparent = true;
    screenMesh.material.opacity = 0;

    // inject video plane
    attachVideoToScreen(screenMesh);

    // camera fit
    const bb = new THREE.Box3().setFromObject(tvRoot);
    const sz = bb.getSize(new THREE.Vector3());
    const dist = Math.max(sz.x,sz.y,sz.z) * 2;
    camera.position.set(0, sz.y*0.1, dist);
    camera.lookAt(0,0,0);

    animate();
  });

  // --------------------
  // SCREEN FINDER
  // --------------------
  function findScreenMesh(root) {
    let best = null;
    let bestScore = 0;

    root.traverse(o=>{
      if (!o.isMesh) return;
      const g = o.geometry;
      if (!g) return;

      g.computeBoundingBox();
      const b = g.boundingBox;
      const s = b.getSize(new THREE.Vector3());

      const dims = [s.x, s.y, s.z].map(Math.abs).sort((a,b)=>a-b);
      const flatness = dims[2] / dims[0];   // big & flat
      const area = dims[1] * dims[2];

      const name = (o.name||"").toLowerCase();
      const bonus = (name.includes("screen") || name.includes("glass")) ? 5 : 0;

      const score = area * flatness + bonus*1000;

      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    });

    console.log("SCREEN:", best?.name);
    return best;
  }

  // --------------------
  // VIDEO PLANE
  // --------------------
  function attachVideoToScreen(mesh) {
    const g = mesh.geometry;
    g.computeBoundingBox();
    const b = g.boundingBox;
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());

    // find thin axis
    const dims = [s.x,s.y,s.z];
    const depth = Math.min(...dims);
    const depthAxis = dims.indexOf(depth);

    let w,h;
    let rot = new THREE.Euler();

    if (depthAxis === 2) { w=s.x; h=s.y; }
    if (depthAxis === 1) { w=s.x; h=s.z; rot.x=-Math.PI/2; }
    if (depthAxis === 0) { w=s.z; h=s.y; rot.y=Math.PI/2; }

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(w,h),
      new THREE.MeshBasicMaterial({ map: videoTex })
    );

    plane.position.copy(c);
    plane.rotation.copy(rot);

    // push forward slightly
    if (depthAxis === 2) plane.position.z += depth*0.51;
    if (depthAxis === 1) plane.position.y += depth*0.51;
    if (depthAxis === 0) plane.position.x += depth*0.51;

    mesh.add(plane);
  }

  // --------------------
  // ROTATION
  // --------------------
  let tx=0, ty=0;

  if (!isMobile) {
    canvas.addEventListener("pointermove", e=>{
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX-r.left)/r.width*2-1;
      const ny = (e.clientY-r.top)/r.height*2-1;
      ty = nx * 0.4;
      tx = -ny * 0.15;
    });
  }

  function animate(){
    tvRoot.rotation.y += (ty - tvRoot.rotation.y)*0.08;
    tvRoot.rotation.x += (tx - tvRoot.rotation.x)*0.08;

    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }

})();
