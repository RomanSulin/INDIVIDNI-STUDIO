import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ---------------- Menu ---------------- */
const menu = document.getElementById("menu");
const btnMenu = document.getElementById("btnMenu");

function openMenu(){
  menu.classList.add("isOpen");
  menu.setAttribute("aria-hidden","false");
}
function closeMenu(){
  menu.classList.remove("isOpen");
  menu.setAttribute("aria-hidden","true");
}
btnMenu?.addEventListener("click", () => {
  menu.classList.contains("isOpen") ? closeMenu() : openMenu();
});
menu?.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

/* ---------------- Red stroke scroll draw ---------------- */
const strokePath = document.getElementById("strokePath");
const studio = document.getElementById("studio");
const reel = document.getElementById("reel");

let strokeLen = 100;
if (strokePath){
  // pathLength="100" already. We'll animate dashoffset 100→0
  strokePath.style.strokeDasharray = `${strokeLen}`;
  strokePath.style.strokeDashoffset = `${strokeLen}`;
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function updateStroke(){
  if (!strokePath || !studio || !reel) return;

  const a = studio.getBoundingClientRect();
  const b = reel.getBoundingClientRect();

  // start when studio enters, end when reel is half passed
  const start = window.innerHeight * 0.75;
  const end = window.innerHeight * 0.20;

  const total = (a.height + (b.top - a.top));
  const y = (start - a.top);
  const t = clamp(y / (total * 0.9), 0, 1);

  strokePath.style.strokeDashoffset = `${strokeLen * (1 - t)}`;
}
window.addEventListener("scroll", updateStroke, { passive:true });
window.addEventListener("resize", updateStroke, { passive:true });

/* ---------------- Reel expand + autoplay on scroll ---------------- */
const reelFrame = document.getElementById("reelFrame");
const reelBtn = document.getElementById("reelBtn");
const reelVideo = document.getElementById("reelVideo");
let reelArmed = false;

function setReelReady(){
  if (!reelFrame || !reelVideo) return;
  reelFrame.classList.add("isReady");
}

reelVideo?.addEventListener("canplay", setReelReady);

function playReel(){
  if (!reelFrame || !reelVideo) return;
  reelFrame.classList.add("isPlaying");
  reelVideo.muted = true;
  reelVideo.play().catch(()=>{});
}
reelBtn?.addEventListener("click", () => {
  reelArmed = true;
  playReel();
});

function updateReel(){
  if (!reelFrame) return;

  const r = reelFrame.getBoundingClientRect();
  const vh = window.innerHeight;

  // progress 0..1 while passing center area
  const t = clamp((vh * 0.85 - r.top) / (vh * 0.65), 0, 1);

  // раскрытие: scale + radius
  const scale = 1 + t * 0.08;
  const radius = 28 - t * 14;
  reelFrame.style.transform = `scale(${scale})`;
  reelFrame.style.borderRadius = `${radius}px`;

  // автозапуск, когда почти раскрылся
  if (!reelArmed && t > 0.72){
    reelArmed = true;
    playReel();
  }
}
window.addEventListener("scroll", () => { updateStroke(); updateReel(); }, { passive:true });
window.addEventListener("resize", () => { updateStroke(); updateReel(); }, { passive:true });

/* ---------------- Works hover wave + tilt ---------------- */
const cards = Array.from(document.querySelectorAll(".workCard"));

function getFilter(card){
  const idx = Number(card.dataset.w || 0);
  return document.querySelector(`#disp${idx} feDisplacementMap`);
}
function getTurb(card){
  const idx = Number(card.dataset.w || 0);
  return document.querySelector(`#disp${idx} feTurbulence`);
}

cards.forEach((card) => {
  const thumb = card.querySelector(".thumb");
  if (!thumb) return;

  const idx = Number(card.dataset.w || 0);
  thumb.style.filter = `url(#disp${idx})`;

  const disp = getFilter(card);
  const turb = getTurb(card);

  function onMove(e){
    const r = card.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;

    // tilt
    const rx = (0.5 - my) * 8;
    const ry = (mx - 0.5) * 10;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;

    // wave strength
    if (disp) disp.setAttribute("scale", String(18));
    if (turb) turb.setAttribute("baseFrequency", `${0.006 + mx*0.010} ${0.010 + my*0.012}`);
  }

  function onEnter(){
    card.classList.add("isHover");
    if (disp) disp.setAttribute("scale", "18");
  }
  function onLeave(){
    card.classList.remove("isHover");
    card.style.transform = "";
    if (disp) disp.setAttribute("scale", "0");
    if (turb) turb.setAttribute("baseFrequency", "0.008");
  }

  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseenter", onEnter);
  card.addEventListener("mouseleave", onLeave);
});

/* ---------------- 3D Hero (курсором двигается как у Lusion) ---------------- */
const canvas = document.getElementById("hero3d");
if (canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
  renderer.setClearColor(0x101522, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.2, 6.4);

  // Environment for glossy look
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // Lights
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 4, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x2b49ff, 1.2);
  fill.position.set(-4, 1, 2);
  scene.add(fill);

  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  // Cross-like object (not copy): build from cylinders
  const matBlue = new THREE.MeshPhysicalMaterial({ color:0x2b49ff, roughness:0.15, metalness:0.05, clearcoat:1, clearcoatRoughness:0.12 });
  const matWhite = new THREE.MeshPhysicalMaterial({ color:0xe9ebf3, roughness:0.18, metalness:0.04, clearcoat:1, clearcoatRoughness:0.12 });
  const matBlack = new THREE.MeshPhysicalMaterial({ color:0x0b0e14, roughness:0.22, metalness:0.03, clearcoat:1, clearcoatRoughness:0.14 });

  function makeCross(material){
    const g = new THREE.Group();
    const cyl = new THREE.CylinderGeometry(0.32, 0.32, 1.5, 28);
    const part1 = new THREE.Mesh(cyl, material);
    part1.rotation.z = Math.PI/2;
    g.add(part1);

    const part2 = new THREE.Mesh(cyl, material);
    g.add(part2);

    // little caps (holes feel)
    const hole = new THREE.CylinderGeometry(0.10, 0.10, 0.4, 18);
    const cap1 = new THREE.Mesh(hole, matBlack);
    cap1.position.set(0.75, 0, 0);
    cap1.rotation.z = Math.PI/2;
    g.add(cap1);

    const cap2 = cap1.clone();
    cap2.position.set(-0.75, 0, 0);
    g.add(cap2);

    const cap3 = cap1.clone();
    cap3.position.set(0, 0.75, 0);
    cap3.rotation.z = 0;
    g.add(cap3);

    const cap4 = cap3.clone();
    cap4.position.set(0, -0.75, 0);
    g.add(cap4);

    return g;
  }

  const root = new THREE.Group();
  scene.add(root);

  // Create cluster
  const mats = [matBlue, matWhite, matBlack, matWhite, matBlue, matBlack];
  for (let i=0; i<34; i++){
    const m = mats[i % mats.length];
    const obj = makeCross(m);

    obj.position.set(
      (Math.random()-0.5)*4.8,
      (Math.random()-0.5)*2.8,
      (Math.random()-0.5)*2.4
    );
    obj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    const s = 0.75 + Math.random()*0.55;
    obj.scale.setScalar(s);
    root.add(obj);
  }

  // pointer parallax
  const pointer = { x:0, y:0 };
  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    pointer.x = (x - 0.5) * 2;
    pointer.y = (y - 0.5) * 2;
  }, { passive:true });

  function resize(){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive:true });
  resize();

  let t = 0;
  function tick(){
    t += 0.01;

    // slow drift + pointer influence
    root.rotation.y = t*0.18 + pointer.x * 0.18;
    root.rotation.x = t*0.12 - pointer.y * 0.12;

    // slight camera sway
    camera.position.x = pointer.x * 0.35;
    camera.position.y = 0.2 - pointer.y * 0.20;
    camera.lookAt(0,0,0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* Init */
updateStroke();
updateReel();
