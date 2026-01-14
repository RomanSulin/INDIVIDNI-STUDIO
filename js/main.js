import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/* ---------- DOM refs ---------- */
const canvas = document.getElementById("c");
const spacer = document.getElementById("scroll-spacer");

const overlay = document.getElementById("overlay");
const caseType = document.getElementById("caseType");
const caseTitle = document.getElementById("caseTitle");
const caseLine = document.getElementById("caseLine");
const caseTask = document.getElementById("caseTask");
const caseSolution = document.getElementById("caseSolution");
const caseResult = document.getElementById("caseResult");

/* ---------- Data (заглушки) ---------- */
const CASES = Array.from({ length: 12 }).map((_, i) => ({
  type: ["Реклама", "Имидж", "Интервью", "Event"][i % 4],
  title: `Кейс №${String(i + 1).padStart(2, "0")}`,
  line: "Коротко: что сделали / формат / площадка.",
  task: "Задача одной фразой.",
  solution: "Свет, ритм, звук — собрали сцену.",
  result: "Итог одной фразой."
}));

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setClearColor(0x07090f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

/* ---------- Scene / Camera ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07090f, 22, 110);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);
camera.position.set(0, 1.35, 7.2);

/* ---------- Lights (Black / Blue / Red) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.60));

const blueKey = new THREE.SpotLight(0x2b6bff, 2.2, 140, Math.PI / 3.3, 0.75, 1.0);
blueKey.position.set(0, 6.5, 0);
blueKey.target.position.set(0, 1.4, 0);
scene.add(blueKey, blueKey.target);

const rim = new THREE.DirectionalLight(0xffffff, 0.18);
rim.position.set(-3, 4, -8);
scene.add(rim);

const redKick = new THREE.PointLight(0xff2b3a, 0.25, 18);
redKick.position.set(0, 1.0, 0);
scene.add(redKick);

/* ---------- World geometry ---------- */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(700, 70),
  new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x0a0c13,
  roughness: 0.98,
  metalness: 0.0
});

const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(700, 10), wallMat);
wallLeft.position.set(0, 3, -2.6);
scene.add(wallLeft);

const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(700, 10), wallMat);
wallRight.position.set(0, 3, 2.6);
wallRight.rotation.y = Math.PI;
scene.add(wallRight);

/* ---------- Posters ---------- */
const posters = [];
const texLoader = new THREE.TextureLoader();
let posterTexture = null;

const posterWidth = 1.7;
const posterHeight = 2.25;
const posterGap = 2.35;
const leftZ = -1.9;
const rightZ = 1.9;

function makePosterMaterial() {
  return new THREE.MeshStandardMaterial({
    map: posterTexture || null,
    color: posterTexture ? 0xffffff : 0xf2f4ff,
    roughness: 0.92,
    metalness: 0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
}

const route = { startX: 0, endX: 20 };
let stations = []; // будет заполнено после build

function buildPosters() {
  for (const p of posters) scene.remove(p.mesh);
  posters.length = 0;

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const count = isMobile ? 10 : 14;

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(posterWidth, posterHeight),
      makePosterMaterial()
    );

    const x = i * posterGap;
    const sideLeft = i % 2 === 0;

    mesh.position.set(x, 1.6, sideLeft ? leftZ : rightZ);
    mesh.rotation.y = sideLeft ? 0.13 : -0.13;

    // микро-жизнь, но контролируемо
    mesh.rotation.z = (sideLeft ? 1 : -1) * 0.012 * ((i % 3) - 1);

    mesh.userData.caseIndex = i % CASES.length;
    scene.add(mesh);
    posters.push({ mesh });
  }

  const lengthX = (count - 1) * posterGap;
  route.startX = -0.6;
  route.endX = lengthX + 0.6;

  // центрируем мир
  const centerX = lengthX / 2;
  wallLeft.position.x = centerX;
  wallRight.position.x = centerX;
  floor.position.x = centerX;

  // Станции (режиссура)
  // 0: старт, 1: “избранные”, 2: “стена кейсов”, 3: финал/контакт (потом)
  stations = [
    route.startX,
    route.startX + lengthX * 0.20,
    route.startX + lengthX * 0.55,
    route.endX
  ];

  // scroll height
  const scrollPx = Math.max(4200, Math.floor(lengthX * 560));
  spacer.style.height = `${scrollPx + window.innerHeight}px`;

  // разместим красный kick ближе к середине
  redKick.position.x = route.startX + lengthX * 0.35;
}

// грузим один постер-плейсхолдер
texLoader.load(
  "./assets/poster.jpg",
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    posterTexture = tex;
    for (const p of posters) {
      p.mesh.material.map = posterTexture;
      p.mesh.material.needsUpdate = true;
    }
  },
  undefined,
  () => {}
);

/* ---------- Postprocessing (киношность) ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.75, 0.86);
// strength, radius, threshold — деликатно, чтобы не было “неона”
composer.addPass(bloom);

// Лёгкая виньетка + микро-зерно (внутри WebGL)
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.02 },     // зерно
    vignette: { value: 0.18 }     // виньетка
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    uniform float vignette;
    varying vec2 vUv;

    float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main(){
      vec4 col = texture2D(tDiffuse, vUv);

      // vignette
      vec2 p = vUv - 0.5;
      float v = smoothstep(0.78, 0.25, dot(p,p));
      col.rgb *= mix(1.0 - vignette, 1.0, v);

      // grain (тонко)
      float n = rand(vUv * (1200.0 + time * 10.0)) - 0.5;
      col.rgb += n * amount;

      gl_FragColor = col;
    }
  `
};
const filmPass = new ShaderPass(FilmShader);
composer.addPass(filmPass);

/* ---------- Interaction ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(10, 10); // старт вне экрана
let hovered = null;

function setHovered(mesh) {
  if (hovered === mesh) return;

  if (hovered) {
    hovered.material.emissive.setHex(0x000000);
    hovered.material.emissiveIntensity = 0;
  }
  hovered = mesh;

  if (hovered) {
    hovered.material.emissive.setHex(0x2b6bff);
    hovered.material.emissiveIntensity = 0.22;
  }
}

window.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
}, { passive: true });

let focusMode = false;
let focusTarget = { x: 0, z: 7.2, lookX: 1.2, lookZ: 0 };

function openCase(mesh) {
  const c = CASES[mesh.userData.caseIndex ?? 0];

  caseType.textContent = c.type;
  caseTitle.textContent = c.title;
  caseLine.textContent = c.line;
  caseTask.textContent = c.task;
  caseSolution.textContent = c.solution;
  caseResult.textContent = c.result;

  overlay.hidden = false;

  // камера “ныряет” к постеру (вглубь) — как у Lusion, но мягко
  focusMode = true;
  focusTarget.x = mesh.position.x - 0.2;
  focusTarget.z = 5.9; // ближе
  focusTarget.lookX = mesh.position.x + 0.45;
  focusTarget.lookZ = mesh.position.z * 0.15;

  blueKey.target.position.set(mesh.position.x, 1.4, mesh.position.z);
}

function closeCase() {
  overlay.hidden = true;
  focusMode = false;
}

window.addEventListener("click", () => {
  if (!overlay.hidden) return;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(posters.map(p => p.mesh), false);
  if (hits.length) openCase(hits[0].object);
});

overlay.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeCase();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) closeCase();
});

/* ---------- Resize ---------- */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);

  composer.setSize(w, h);
  bloom.setSize(w, h);
}
window.addEventListener("resize", () => {
  resize();
  buildPosters();
}, { passive: true });

/* ---------- Scroll → Camera with “station magnet” ---------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
function getScrollT() {
  const max = Math.max(1, spacer.offsetHeight - window.innerHeight);
  return clamp(window.scrollY / max, 0, 1);
}
function magnetToStations(x) {
  if (!stations.length) return x;
  let nearest = stations[0];
  let dMin = Math.abs(x - nearest);
  for (const s of stations) {
    const d = Math.abs(x - s);
    if (d < dMin) { dMin = d; nearest = s; }
  }
  // мягкий магнит: чем ближе к станции, тем сильнее подтягивает
  const strength = Math.exp(-(dMin * dMin) / 2.6); // 0..1
  return lerp(x, nearest, 0.20 * strength);
}

/* ---------- Pointer sway (живость как у Lusion) ---------- */
const sway = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  sway.x = nx;
  sway.y = ny;
}, { passive: true });

/* ---------- Init ---------- */
resize();
buildPosters();

/* ---------- Loop ---------- */
let last = performance.now();
let camX = 0;
let camZ = 7.2;
let lookX = 1;
let lookZ = 0;

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // hover только когда оверлей закрыт
  if (overlay.hidden) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(posters.map(p => p.mesh), false);
    setHovered(hits.length ? hits[0].object : null);
  } else {
    setHovered(null);
  }

  // цель камеры
  let targetX, targetZ, targetLookX, targetLookZ;

  if (focusMode) {
    targetX = focusTarget.x;
    targetZ = focusTarget.z;
    targetLookX = focusTarget.lookX;
    targetLookZ = focusTarget.lookZ;
  } else {
    const t = getScrollT();
    const rawX = lerp(route.startX, route.endX, t);
    const magX = magnetToStations(rawX);

    targetX = magX;
    targetZ = 7.2;
    targetLookX = magX + 1.1;
    targetLookZ = 0;

    // свет едет “вперёд” по маршруту
    blueKey.target.position.set(targetLookX, 1.4, 0);
  }

  // добавим лёгкий sway (живость)
  const swayX = sway.x * 0.18;
  const swayY = sway.y * 0.08;

  camX = damp(camX, targetX + swayX, 6.8, dt);
  camZ = damp(camZ, targetZ + Math.abs(swayX) * 0.05, 6.8, dt);
  lookX = damp(lookX, targetLookX, 7.2, dt);
  lookZ = damp(lookZ, targetLookZ, 7.2, dt);

  camera.position.set(camX, 1.35 + swayY, camZ);
  camera.lookAt(lookX, 1.35, lookZ);

  // “дыхание” света
  blueKey.intensity = 1.18 + Math.sin(now * 0.0012) * 0.09;
  filmPass.uniforms.time.value = now * 0.001;

  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
