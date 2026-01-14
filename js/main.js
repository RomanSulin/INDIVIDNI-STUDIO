import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ---------------- Menu ---------------- */
const menu = document.getElementById("menu");
const btnMenu = document.getElementById("btnMenu");

function openMenu(){ menu.classList.add("isOpen"); menu.setAttribute("aria-hidden","false"); }
function closeMenu(){ menu.classList.remove("isOpen"); menu.setAttribute("aria-hidden","true"); }

btnMenu?.addEventListener("click", () => menu.classList.contains("isOpen") ? closeMenu() : openMenu());
menu?.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeMenu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

/* ---------------- Helpers ---------------- */
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------------- Stroke draw (starts earlier, continues past reel to works) ---------------- */
const strokePath = document.getElementById("strokePath");
const introEl = document.getElementById("intro");
const worksEl = document.getElementById("works");
const strokeLen = 100;

if (strokePath){
  strokePath.style.strokeDasharray = `${strokeLen}`;
  strokePath.style.strokeDashoffset = `${strokeLen}`;
}

function updateStroke(){
  if (!strokePath || !introEl || !worksEl) return;

  const vh = window.innerHeight;
  const start = introEl.offsetTop + introEl.offsetHeight * 0.35;   // начинается раньше (ещё до studio)
  const end   = worksEl.offsetTop - vh * 0.15;                      // заканчивается у работ

  const t = clamp((window.scrollY - start) / (end - start), 0, 1);
  strokePath.style.strokeDashoffset = `${strokeLen * (1 - t)}`;
}

/* ---------------- Reel (16:9, expands to RAIL width, меньше пустоты) ---------------- */
const reelPin = document.getElementById("reelPin");
const reelSticky = document.getElementById("reelSticky");
const reelFrame = document.getElementById("reelFrame");
const reelBtn = document.getElementById("reelBtn");
const reelVideo = document.getElementById("reelVideo");

let reelPlayed = false;
function playReel(){
  if (!reelVideo || reelPlayed) return;
  reelPlayed = true;
  reelVideo.muted = true;
  reelVideo.play().catch(()=>{});
}
reelBtn?.addEventListener("click", playReel);

function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

function updateReel(){
  if (!reelPin || !reelSticky || !reelFrame) return;

  const pinTop = reelPin.offsetTop;
  const pinH = reelPin.offsetHeight;
  const vh = window.innerHeight;

  const p = clamp((window.scrollY - pinTop) / (pinH - vh), 0, 1);

  // раскрытие 0..0.65
  const e = easeOutCubic(clamp(p / 0.65, 0, 1));

  // end = ширина rail
  const railW = reelSticky.querySelector(".rail")?.clientWidth || reelSticky.clientWidth;
  const endW = railW;

  // start = маленький слева
  const startW = Math.min(860, endW * 0.60);

  // width lerp
  const w = startW + (endW - startW) * e;

  // 16:9
  const h = Math.min(w * 9/16, vh * 0.66);

  const r = 28 - e * 14;
  const ty = (1 - e) * 10;

  const ov = 1 - clamp((p - 0.48) / 0.18, 0, 1);
  const vid = clamp((p - 0.58) / 0.18, 0, 1);

  reelFrame.style.setProperty("--w", `${w.toFixed(1)}px`);
  reelFrame.style.setProperty("--h", `${h.toFixed(1)}px`);
  reelFrame.style.setProperty("--r", `${r.toFixed(1)}px`);
  reelFrame.style.setProperty("--ty", `${ty.toFixed(1)}px`);
  reelFrame.style.setProperty("--ov", ov.toFixed(3));
  reelFrame.style.setProperty("--vid", vid.toFixed(3));

  if (!reelPlayed && p > 0.62) playReel();
}

/* ---------------- Works hover: wave only on hover + micro blur flash ---------------- */
const cards = Array.from(document.querySelectorAll(".workCard"));
function dispNode(i){ return document.querySelector(`#disp${i} feDisplacementMap`); }
function turbNode(i){ return document.querySelector(`#disp${i} feTurbulence`); }

let hoverIdx = -1;
let hoverMX = 0.5;
let hoverMY = 0.5;
let tWave = 0;

cards.forEach((card) => {
  const idx = Number(card.dataset.w || 0);
  const img = card.querySelector(".workImg");
  if (!img) return;

  card.addEventListener("mouseenter", () => {
    hoverIdx = idx;

    // flash blur на 100мс
    card.classList.add("isFlash");
    setTimeout(() => card.classList.remove("isFlash"), 110);

    // wave filter включаем только на hover
    img.style.filter = `url(#disp${idx})`;

    // стартовая сила
    const disp = dispNode(idx);
    if (disp) disp.setAttribute("scale","18");
  });

  card.addEventListener("mouseleave", () => {
    const disp = dispNode(idx);
    const turb = turbNode(idx);

    if (disp) disp.setAttribute("scale","0");
    if (turb) turb.setAttribute("baseFrequency","0.010");

    // полностью убрать filter → никаких “залипаний”
    img.style.filter = "";
    card.style.transform = "";
    card.classList.remove("isFlash");

    hoverIdx = -1;
  });

  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    hoverMX = (e.clientX - r.left) / r.width;
    hoverMY = (e.clientY - r.top) / r.height;

    const rx = (0.5 - hoverMY) * 6;
    const ry = (hoverMX - 0.5) * 8;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  });
});

function tickWave(){
  tWave += 0.012;
  if (hoverIdx >= 0){
    const turb = turbNode(hoverIdx);
    const disp = dispNode(hoverIdx);

    if (turb){
      const fx = 0.008 + hoverMX * 0.010 + Math.sin(tWave) * 0.0010;
      const fy = 0.010 + hoverMY * 0.012 + Math.cos(tWave*1.2) * 0.0010;
      turb.setAttribute("baseFrequency", `${fx.toFixed(4)} ${fy.toFixed(4)}`);
    }
    if (disp){
      const sc = 16 + (Math.sin(tWave*2.0)*7);
      disp.setAttribute("scale", String(sc.toFixed(1)));
    }
  }
  requestAnimationFrame(tickWave);
}
tickWave();

/* ---------------- 3D Hero (чуть сильнее реакция, крупнее объект) ---------------- */
const canvas = document.getElementById("hero3d");
if (canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
  renderer.setClearColor(0x101522, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100); // чуть меньше FOV -> крупнее
  camera.position.set(0, 0.2, 5.6); // ближе -> крупнее

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 4, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x2b49ff, 1.5);
  fill.position.set(-4, 1, 2);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  const matBlue = new THREE.MeshPhysicalMaterial({ color:0x2b49ff, roughness:0.12, metalness:0.06, clearcoat:1, clearcoatRoughness:0.10 });
  const matWhite = new THREE.MeshPhysicalMaterial({ color:0xe9ebf3, roughness:0.14, metalness:0.05, clearcoat:1, clearcoatRoughness:0.10 });
  const matBlack = new THREE.MeshPhysicalMaterial({ color:0x0b0e14, roughness:0.20, metalness:0.03, clearcoat:1, clearcoatRoughness:0.12 });

  function makeCross(material){
    const g = new THREE.Group();
    const cyl = new THREE.CylinderGeometry(0.32, 0.32, 1.5, 28);
    const part1 = new THREE.Mesh(cyl, material); part1.rotation.z = Math.PI/2; g.add(part1);
    const part2 = new THREE.Mesh(cyl, material); g.add(part2);

    const hole = new THREE.CylinderGeometry(0.10, 0.10, 0.4, 18);
    const cap = new THREE.Mesh(hole, matBlack); cap.rotation.z = Math.PI/2; cap.position.set(0.75, 0, 0); g.add(cap);
    const c2 = cap.clone(); c2.position.set(-0.75,0,0); g.add(c2);
    const c3 = cap.clone(); c3.rotation.z = 0; c3.position.set(0,0.75,0); g.add(c3);
    const c4 = cap.clone(); c4.rotation.z = 0; c4.position.set(0,-0.75,0); g.add(c4);
    return g;
  }

  const root = new THREE.Group();
  scene.add(root);

  const mats = [matBlue, matWhite, matBlack, matWhite, matBlue, matBlack];
  for (let i=0; i<36; i++){
    const obj = makeCross(mats[i % mats.length]);
    obj.position.set((Math.random()-0.5)*5.2, (Math.random()-0.5)*3.0, (Math.random()-0.5)*2.6);
    obj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    obj.scale.setScalar(0.78 + Math.random()*0.65);
    root.add(obj);
  }

  const pointer = { x:0, y:0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
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

  let rx=0, ry=0, cx=0, cy=0;
  let tt = 0;

  function tick(){
    tt += 0.01;

    const trx = (-pointer.y) * 0.62;
    const tryy = (pointer.x) * 0.88;

    rx += (trx - rx) * 0.06;
    ry += (tryy - ry) * 0.06;

    root.rotation.x = rx + Math.sin(tt*0.6)*0.06;
    root.rotation.y = ry + tt*0.14;

    const tcx = pointer.x * 0.72;
    const tcy = 0.2 - pointer.y * 0.40;
    cx += (tcx - cx) * 0.08;
    cy += (tcy - cy) * 0.08;

    camera.position.x = cx;
    camera.position.y = cy;
    camera.lookAt(0,0,0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* init */
function onScroll(){
  updateStroke();
  updateReel();
}
window.addEventListener("scroll", onScroll, { passive:true });
window.addEventListener("resize", onScroll, { passive:true });
updateStroke();
updateReel();
