import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("gl");
const sections = Array.from(document.querySelectorAll("[data-scene]"));

const pre = document.getElementById("preloader");
const preBar = document.getElementById("preloaderBar");
const prePct = document.getElementById("preloaderPct");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, tar, lam, dt) => lerp(cur, tar, 1 - Math.exp(-lam * dt));

/* ---------- Three base ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x07090f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07090f, 18, 120);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 1.15, 7.2);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const blueKey = new THREE.SpotLight(0x2b6bff, 1.25, 140, Math.PI / 3.1, 0.80, 1.0);
blueKey.position.set(0, 6.4, 0);
blueKey.target.position.set(0, 1.2, 0);
scene.add(blueKey, blueKey.target);

const rim = new THREE.DirectionalLight(0xffffff, 0.16);
rim.position.set(-3, 4, -8);
scene.add(rim);

/* ---------- Hero object (не постеры): “лента/связь/ритм” ---------- */
const group = new THREE.Group();
scene.add(group);

function makeRibbon() {
  // Кривая “ленты”
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, 1.0, 0.2),
    new THREE.Vector3(-1.2, 1.6, -0.3),
    new THREE.Vector3( 0.0, 1.2, -0.9),
    new THREE.Vector3( 1.2, 1.8, -0.4),
    new THREE.Vector3( 2.2, 1.1, 0.1),
  ], false, "catmullrom", 0.35);

  const geo = new THREE.TubeGeometry(curve, 220, 0.07, 10, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf2f4ff,          // белый как “воздух”
    roughness: 0.25,
    metalness: 0.15,
    emissive: new THREE.Color(0x081224),
    emissiveIntensity: 0.35
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = -0.2;
  return mesh;
}

const ribbon = makeRibbon();
group.add(ribbon);

// “сцена” (тонкий пол, чтобы не было пустоты)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

/* ---------- Postprocessing ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.20, 0.85, 0.92);
composer.addPass(bloom);

/* ---------- States per section ---------- */
const STATES = {
  intro:    { cam:[0.00,1.15,7.20], look:[0.00,1.25,0.00], rot:[0.00, 0.00] },
  works:    { cam:[0.35,1.10,6.90], look:[-0.20,1.25,-0.30], rot:[0.10, 0.18] },
  services: { cam:[-0.30,1.15,7.10], look:[0.15,1.25,-0.35], rot:[-0.08,-0.12] },
  contact:  { cam:[0.00,1.10,7.55], look:[0.00,1.25,-0.25], rot:[0.00, 0.00] },
};

let active = "intro";

/* pick active section near viewport mid */
function pickScene() {
  const mid = window.innerHeight * 0.55;
  let best = { id: "intro", d: Infinity };
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    const cy = r.top + r.height * 0.5;
    const d = Math.abs(cy - mid);
    if (d < best.d) best = { id: s.dataset.scene, d };
  }
  active = best.id || "intro";
}
window.addEventListener("scroll", pickScene, { passive: true });

/* pointer parallax */
const ptr = { x:0, y:0 };
window.addEventListener("pointermove", (e) => {
  ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
  ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive:true });

/* resize */
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

/* ---------- Preloader (fake but clean) ---------- */
let p = 0;
const preInt = setInterval(() => {
  p = Math.min(1, p + 0.08);
  preBar.style.width = `${Math.round(p * 100)}%`;
  prePct.textContent = `${Math.round(p * 100)}%`;
  if (p >= 1) {
    clearInterval(preInt);
    pre.style.opacity = "0";
    setTimeout(() => pre.remove(), 450);
  }
}, 60);

/* ---------- Loop ---------- */
resize();
pickScene();

let last = performance.now();
let cam = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
let look = { x:0, y:1.25, z:0 };
let rot = { x:0, y:0 };

function tick(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const st = STATES[active] || STATES.intro;

  // camera target + pointer sway
  const swayX = ptr.x * 0.22;
  const swayY = ptr.y * 0.08;

  cam.x = damp(cam.x, st.cam[0] + swayX, 6.5, dt);
  cam.y = damp(cam.y, st.cam[1] + swayY, 6.5, dt);
  cam.z = damp(cam.z, st.cam[2] + Math.abs(swayX) * 0.06, 6.5, dt);

  look.x = damp(look.x, st.look[0], 7.0, dt);
  look.y = damp(look.y, st.look[1], 7.0, dt);
  look.z = damp(look.z, st.look[2], 7.0, dt);

  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(look.x, look.y, look.z);

  // object motion (subtle)
  rot.x = damp(rot.x, st.rot[0], 6.5, dt);
  rot.y = damp(rot.y, st.rot[1], 6.5, dt);
  group.rotation.x = rot.x + ptr.y * 0.03;
  group.rotation.y = rot.y + ptr.x * 0.04;

  // breathe light
  blueKey.intensity = 1.18 + Math.sin(now * 0.0012) * 0.06;

  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
