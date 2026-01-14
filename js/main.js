import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ---------------------------
   Helpers
--------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/* ---------------------------
   DOM / Sections
--------------------------- */
const canvas = document.getElementById("gl");
const sections = Array.from(document.querySelectorAll("[data-scene]"));

const playBtn = document.getElementById("playReel");
const reelVideo = document.getElementById("reelVideo");

playBtn?.addEventListener("click", () => {
  // позже подставишь файл: assets/showreel.mp4
  if (!reelVideo.querySelector("source")) {
    const s = document.createElement("source");
    s.src = "./assets/showreel.mp4";
    s.type = "video/mp4";
    reelVideo.appendChild(s);
    reelVideo.load();
  }
  reelVideo.style.display = "block";
  reelVideo.play().catch(() => {});
});

/* ---------------------------
   Three.js: Renderer / Scene / Camera
--------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setClearColor(0x07090f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07090f, 18, 120);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 1.25, 7.0);

/* Lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const blueKey = new THREE.SpotLight(0x2b6bff, 1.35, 120, Math.PI / 3.2, 0.75, 1.0);
blueKey.position.set(0, 6.2, 0);
blueKey.target.position.set(0, 1.3, 0);
scene.add(blueKey, blueKey.target);

const rim = new THREE.DirectionalLight(0xffffff, 0.18);
rim.position.set(-3, 4, -8);
scene.add(rim);

/* Floor / subtle walls */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

/* ---------------------------
   Posters cluster (hero object)
   Один “герой-объект”, который меняет состояния по разделам.
--------------------------- */
const group = new THREE.Group();
scene.add(group);

const posterGeo = new THREE.PlaneGeometry(2.1, 2.8, 1, 1);
let posterTex = null;

const mat = new THREE.MeshStandardMaterial({
  color: 0xf2f4ff,
  roughness: 0.92,
  metalness: 0.0
});

const texLoader = new THREE.TextureLoader();
texLoader.load("./assets/poster.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  posterTex = t;
  mat.map = posterTex;
  mat.needsUpdate = true;
});

function makePoster(x, y, z, ry, rz, s=1){
  const m = new THREE.Mesh(posterGeo, mat);
  m.position.set(x, y, z);
  m.rotation.set(0, ry, rz);
  m.scale.setScalar(s);
  group.add(m);
  return m;
}

// 5 плоскостей: ощущение стопки/коллекции без длинной сцены
makePoster( 0.0, 1.55, -0.2,  0.10, -0.02, 1.02);
makePoster(-0.45, 1.50, -0.35, 0.20,  0.03, 0.98);
makePoster( 0.55, 1.45, -0.55, -0.18, -0.03, 0.96);
makePoster(-0.10, 1.35, -0.85, 0.12,  0.02, 0.92);
makePoster( 0.15, 1.25, -1.10, -0.10, 0.01, 0.90);

/* ---------------------------
   Postprocessing: mild bloom
--------------------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 0.22, 0.85, 0.90);
composer.addPass(bloom);

/* ---------------------------
   Scene states (Lusion-lite)
   Не “cut сцены”, а 4 понятных состояния.
--------------------------- */
const STATES = {
  intro:    { cam: { x: 0.00, y: 1.25, z: 7.00 }, look: { x: 0.00, y: 1.35, z: 0.0 }, grp: { x:0, y:0, z:0, ry:0 } },
  reel:     { cam: { x: -0.55, y: 1.20, z: 6.40 }, look: { x: 0.20, y: 1.35, z: -0.4 }, grp: { x:0.15, y:0, z:-0.15, ry: 0.12 } },
  works:    { cam: { x: 0.55, y: 1.25, z: 6.80 }, look: { x: -0.10, y: 1.35, z: -0.7 }, grp: { x:-0.20, y:0, z:-0.25, ry:-0.10 } },
  services: { cam: { x: 0.10, y: 1.25, z: 7.20 }, look: { x: 0.00, y: 1.35, z: -0.6 }, grp: { x:0.10, y:0, z:-0.30, ry: 0.06 } },
  contact:  { cam: { x: 0.00, y: 1.25, z: 7.60 }, look: { x: 0.00, y: 1.35, z: -0.5 }, grp: { x:0.00, y:0, z:-0.35, ry: 0.00 } }
};

let activeScene = "intro";

/* choose active section near viewport center */
function pickActiveScene(){
  const mid = window.innerHeight * 0.55;
  let best = { id: "intro", d: Infinity };

  for (const s of sections) {
    const r = s.getBoundingClientRect();
    const cy = r.top + r.height * 0.5;
    const d = Math.abs(cy - mid);
    if (d < best.d) best = { id: s.dataset.scene, d };
  }
  activeScene = best.id || "intro";
}

/* ---------------------------
   Pointer parallax (дорогое ощущение “живого”)
--------------------------- */
const pointer = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive:true });

/* ---------------------------
   Resize
--------------------------- */
function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}
window.addEventListener("resize", resize, { passive:true });
window.addEventListener("scroll", pickActiveScene, { passive:true });

resize();
pickActiveScene();

/* ---------------------------
   Loop
--------------------------- */
let last = performance.now();
let cam = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
let look = { x: 0, y: 1.35, z: 0 };
let g = { x: group.position.x, y: group.position.y, z: group.position.z, ry: group.rotation.y };

function tick(now){
  const dt = Math.min(0.05, (now - last)/1000);
  last = now;

  const st = STATES[activeScene] || STATES.intro;

  // camera target + slight pointer sway
  const swayX = pointer.x * 0.18;
  const swayY = pointer.y * 0.07;

  cam.x = damp(cam.x, st.cam.x + swayX, 6.5, dt);
  cam.y = damp(cam.y, st.cam.y + swayY, 6.5, dt);
  cam.z = damp(cam.z, st.cam.z + Math.abs(swayX)*0.06, 6.5, dt);

  look.x = damp(look.x, st.look.x, 7.0, dt);
  look.y = damp(look.y, st.look.y, 7.0, dt);
  look.z = damp(look.z, st.look.z, 7.0, dt);

  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(look.x, look.y, look.z);

  // group target
  g.x = damp(g.x, st.grp.x, 7.0, dt);
  g.y = damp(g.y, st.grp.y, 7.0, dt);
  g.z = damp(g.z, st.grp.z, 7.0, dt);
  g.ry = damp(g.ry, st.grp.ry, 7.0, dt);

  group.position.set(g.x, g.y, g.z);
  group.rotation.y = g.ry + pointer.x * 0.035; // микро-жизнь

  // light “breathing” super subtle
  blueKey.intensity = 1.25 + Math.sin(now * 0.0012) * 0.07;

  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
