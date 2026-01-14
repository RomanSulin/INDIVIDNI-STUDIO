import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const canvas = document.getElementById("c");
const spacer = document.getElementById("scroll-spacer");

// Overlay refs
const overlay = document.getElementById("overlay");
const caseType = document.getElementById("caseType");
const caseTitle = document.getElementById("caseTitle");
const caseLine = document.getElementById("caseLine");
const caseTask = document.getElementById("caseTask");
const caseSolution = document.getElementById("caseSolution");
const caseResult = document.getElementById("caseResult");

// Minimal cases (заглушки — потом заменишь)
const CASES = Array.from({ length: 12 }).map((_, i) => ({
  type: ["Реклама", "Имидж", "Интервью", "Event"][i % 4],
  title: `Кейс №${String(i + 1).padStart(2, "0")}`,
  line: "Короткая строка: что сняли / для кого / формат.",
  task: "Задача клиента одной фразой.",
  solution: "Как мы собрали кадр, свет, ритм, звук.",
  result: "Итог: что получил бренд / аудитория / канал."
}));

// Scene
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setClearColor(0x07090f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07090f, 8, 38);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 1.35, 8.5);

// Lights (black / blue / red feel)
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const blueKey = new THREE.SpotLight(0x2b6bff, 1.3, 50, Math.PI / 6, 0.55, 1.0);
blueKey.position.set(0, 6, 6);
blueKey.target.position.set(0, 1.2, 0);
scene.add(blueKey, blueKey.target);

const rim = new THREE.DirectionalLight(0xffffff, 0.22);
rim.position.set(-2, 4, -6);
scene.add(rim);

// Environment geometry
const floorGeo = new THREE.PlaneGeometry(400, 40);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1, metalness: 0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.position.z = 0;
scene.add(floor);

const wallGeo = new THREE.PlaneGeometry(400, 10);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0c13, roughness: 1, metalness: 0 });
const wallLeft = new THREE.Mesh(wallGeo, wallMat);
wallLeft.position.set(0, 3, -2.6);
scene.add(wallLeft);

const wallRight = new THREE.Mesh(wallGeo, wallMat);
wallRight.position.set(0, 3, 2.6);
wallRight.rotation.y = Math.PI; // facing inward
scene.add(wallRight);

// Posters
const posters = [];
const posterWidth = 1.7;
const posterHeight = 2.25;
const posterGap = 2.3; // distance along the wall (x axis)
const leftZ = -1.9;
const rightZ = 1.9;

// Load single placeholder texture
const texLoader = new THREE.TextureLoader();
let posterTexture = null;

function makePosterMaterial() {
  // Fallback if texture not loaded
  if (!posterTexture) {
    return new THREE.MeshStandardMaterial({
      color: 0xf2f4ff,
      roughness: 0.85,
      metalness: 0.0
    });
  }
  return new THREE.MeshStandardMaterial({
    map: posterTexture,
    roughness: 0.9,
    metalness: 0.0
  });
}

function buildPosters() {
  // cleanup
  for (const p of posters) scene.remove(p.mesh);
  posters.length = 0;

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const count = isMobile ? 10 : 14;

  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(posterWidth, posterHeight);
    const mat = makePosterMaterial();
    const mesh = new THREE.Mesh(geo, mat);

    const x = i * posterGap;
    const sideLeft = i % 2 === 0;

    mesh.position.set(x, 1.6, sideLeft ? leftZ : rightZ);
    mesh.rotation.y = sideLeft ? 0.12 : -0.12;

    // slight random tilt for life (controlled)
    mesh.rotation.z = (sideLeft ? 1 : -1) * 0.015 * (i % 3);

    mesh.userData.caseIndex = i % CASES.length;
    mesh.userData.sideLeft = sideLeft;

    scene.add(mesh);
    posters.push({ mesh });
  }

  // Set scroll height based on length
  const lengthX = (count - 1) * posterGap;
  const scrollPx = Math.max(4200, Math.floor(lengthX * 520));
  spacer.style.height = `${scrollPx + window.innerHeight}px`;

  // Set walls length visually by scaling (already large enough, but keep centered)
  wallLeft.position.x = lengthX / 2;
  wallRight.position.x = lengthX / 2;
  floor.position.x = lengthX / 2;

  // Store route
  route.startX = -0.6;
  route.endX = lengthX + 0.6;
}

texLoader.load(
  "./assets/poster.jpg",
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    posterTexture = tex;

    // update materials
    for (const p of posters) {
      p.mesh.material.map = posterTexture;
      p.mesh.material.needsUpdate = true;
    }
  },
  undefined,
  () => {
    // ok: fallback material will be used
  }
);

// Camera route & smooth motion
const route = { startX: 0, endX: 20 };
let targetCamX = 0;
let targetLookX = 1;
let focusMode = false;
let focusPoster = null;

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

// Interaction: raycast
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;

function setHovered(mesh) {
  if (hovered === mesh) return;
  // reset previous
  if (hovered && hovered.material) {
    hovered.material.emissive?.setHex?.(0x000000);
    hovered.material.emissiveIntensity = 0;
  }
  hovered = mesh;
  if (hovered && hovered.material) {
    if (!hovered.material.emissive) hovered.material.emissive = new THREE.Color(0x000000);
    hovered.material.emissive.setHex(0x2b6bff);
    hovered.material.emissiveIntensity = 0.22;
  }
}

function onPointerMove(e){
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  pointer.x = x * 2 - 1;
  pointer.y = -(y * 2 - 1);
}
window.addEventListener("pointermove", onPointerMove, { passive: true });

function openCase(mesh) {
  const idx = mesh.userData.caseIndex ?? 0;
  const c = CASES[idx];

  caseType.textContent = c.type;
  caseTitle.textContent = c.title;
  caseLine.textContent = c.line;
  caseTask.textContent = c.task;
  caseSolution.textContent = c.solution;
  caseResult.textContent = c.result;

  overlay.hidden = false;

  focusMode = true;
  focusPoster = mesh;

  // Camera nudge toward poster (small “in depth” dive)
  targetCamX = mesh.position.x - 0.25;
  targetLookX = mesh.position.x + 0.55;

  // Move spotlight target
  blueKey.target.position.set(mesh.position.x, 1.4, mesh.position.z);
}

function closeCase() {
  overlay.hidden = true;
  focusMode = false;
  focusPoster = null;
}

window.addEventListener("click", (e) => {
  if (!overlay.hidden) return; // prevent clicks through overlay

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(posters.map(p => p.mesh), false);
  if (hits.length) {
    openCase(hits[0].object);
  }
});

overlay.addEventListener("click", (e) => {
  const closeEl = e.target.closest("[data-close]");
  if (closeEl) closeCase();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) closeCase();
});

// Resize
function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // pixel ratio (mobile friendly)
  const pr = Math.min(1.75, window.devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", () => {
  resize();
  buildPosters();
}, { passive: true });

// Scroll mapping
function getScrollT() {
  const max = Math.max(1, spacer.offsetHeight - window.innerHeight);
  return clamp(window.scrollY / max, 0, 1);
}

// Build
resize();
buildPosters();

// Render loop
let last = performance.now();
function tick(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // hover detection only when not in overlay focus
  if (overlay.hidden) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(posters.map(p => p.mesh), false);
    setHovered(hits.length ? hits[0].object : null);
  } else {
    setHovered(null);
  }

  // Determine target camera position from scroll
  if (!focusMode) {
    const t = getScrollT();
    targetCamX = lerp(route.startX, route.endX, t);
    targetLookX = targetCamX + 1.1;

    // keep spotlight generally ahead (blue mood)
    blueKey.target.position.set(targetLookX, 1.4, 0);
  }

  camera.position.x = damp(camera.position.x, targetCamX, 6.5, dt);
  camera.lookAt(
    damp(camera.getWorldDirection(new THREE.Vector3()).x + camera.position.x, targetLookX, 6.5, dt),
    1.35,
    0
  );

  // subtle “breathing” of blue light
  blueKey.intensity = 1.15 + Math.sin(now * 0.0012) * 0.10;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
