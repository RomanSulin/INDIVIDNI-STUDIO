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

/* ---------------- Red stroke draw (Studio -> Reel -> Works) ---------------- */
const strokePath = document.getElementById("strokePath");
const studioEl = document.getElementById("studio");
const worksEl = document.getElementById("works");

const strokeLen = 100;
if (strokePath){
  strokePath.style.strokeDasharray = `${strokeLen}`;
  strokePath.style.strokeDashoffset = `${strokeLen}`;
}
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

function updateStroke(){
  if (!strokePath || !studioEl || !worksEl) return;

  const studioTop = studioEl.offsetTop;
  const worksTop  = worksEl.offsetTop;
  const vh = window.innerHeight;

  // начинаем чуть раньше и тянем до начала works
  const start = studioTop - vh*0.2;
  const end   = worksTop  - vh*0.15;

  const t = clamp((window.scrollY - start) / (end - start), 0, 1);
  strokePath.style.strokeDashoffset = `${strokeLen * (1 - t)}`;
}

/* ---------------- Reel: pin + expand + autoplay ---------------- */
const reelPin = document.getElementById("reelPin");
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

reelBtn?.addEventListener("click", () => {
  playReel();
});

function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

function updateReel(){
  if (!reelPin || !reelFrame) return;

  const pinTop = reelPin.offsetTop;
  const pinH = reelPin.offsetHeight;
  const vh = window.innerHeight;

  // прогресс внутри pin зоны: 0..1
  const p = clamp((window.scrollY - pinTop) / (pinH - vh), 0, 1);

  // 0..0.65 раскрываемся, дальше держим
  const k = clamp(p / 0.65, 0, 1);
  const e = easeOutCubic(k);

  // старт: маленький слева (scale 0.62)
  // конец: полный размер (scale 1)
  const s = 0.62 + (1 - 0.62) * e;

  // чуть уводим вниз/вправо, чтобы старт был “в левом углу”
  const tx = 0;               // оставляем слева, как ты просил
  const ty = (1 - e) * 8;     // лёгкий сдвиг

  // радиус уменьшаем при раскрытии (как на примерах)
  const r = 28 - e * 14;

  // overlay исчезает ближе к концу раскрытия
  const ov = 1 - clamp((p - 0.45) / 0.18, 0, 1);

  // видео проявляется после раскрытия
  const vid = clamp((p - 0.55) / 0.18, 0, 1);

  reelFrame.style.setProperty("--s", s.toFixed(4));
  reelFrame.style.setProperty("--tx", `${tx}px`);
  reelFrame.style.setProperty("--ty", `${ty}px`);
  reelFrame.style.setProperty("--r", `${r}px`);
  reelFrame.style.setProperty("--ov", ov.toFixed(3));
  reelFrame.style.setProperty("--vid", vid.toFixed(3));

  // автоплей когда почти раскрылся
  if (!reelPlayed && p > 0.62) playReel();
}

/* ---------------- Works hover: wave + tilt (заметнее) ---------------- */
const cards = Array.from(document.querySelectorAll(".workCard"));

function dispNode(i){
  return document.querySelector(`#disp${i} feDisplacementMap`);
}
function turbNode(i){
  return document.querySelector(`#disp${i} feTurbulence`);
}

let hovered = null;
let hoverIdx = -1;
let hoverMX = 0.5;
let hoverMY = 0.5;

cards.forEach((card) => {
  const idx = Number(card.dataset.w || 0);
  const img = card.querySelector(".thumbMedia");
  if (img) img.style.filter = `url(#disp${idx})`;

  card.addEventListener("mouseenter", () => {
    hovered = card;
    hoverIdx = idx;
    const disp = dispNode(idx);
    if (disp) disp.setAttribute("scale","32"); // сильнее
  });

  card.addEventListener("mouseleave", () => {
    const disp = dispNode(idx);
    const turb = turbNode(idx);
    if (disp) disp.setAttribute("scale","0");
    if (turb) turb.setAttribute("baseFrequency","0.010");
    card.style.transform = "";
    hovered = null;
    hoverIdx = -1;
  });

  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;

    hoverMX = mx;
    hoverMY = my;

    // tilt как у “дорогих” карточек
    const rx = (0.5 - my) * 8;
    const ry = (mx - 0.5) * 10;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  });
});

// анимация волны (чтобы эффект был виден постоянно при hover)
let tWave = 0;
function tickWave(){
  tWave += 0.012;

  if (hovered && hoverIdx >= 0){
    const turb = turbNode(hoverIdx);
    const disp = dispNode(hoverIdx);
    if (turb){
      const fx = 0.008 + hoverMX * 0.012 + Math.sin(tWave) * 0.0015;
      const fy = 0.010 + hoverMY * 0.014 + Math.cos(tWave*1.2) * 0.0015;
      turb.setAttribute("baseFrequency", `${fx.toFixed(4)} ${fy.toFixed(4)}`);
    }
    if (disp){
      const sc = 26 + (Math.sin(tWave*2.0)*6);
      disp.setAttribute("scale", String(sc.toFixed(1)));
    }
  }

  requestAnimationFrame(tickWave);
}
tickWave();

/* ---------------- 3D Hero: движение от курсора должно быть видно ---------------- */
const canvas = document.getElementById("hero3d");
if (canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
  renderer.setClearColor(0x101522, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.2, 6.0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 4, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x2b49ff, 1.4);
  fill.position.set(-4, 1, 2);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  const matBlue = new THREE.MeshPhysicalMaterial({ color:0x2b49ff, roughness:0.12, metalness:0.06, clearcoat:1, clearcoatRoughness:0.10 });
  const matWhite = new THREE.MeshPhysicalMaterial({ color:0xe9ebf3, roughness:0.14, metalness:0.05, clearcoat:1, clearcoatRoughness:0.10 });
  const matBlack = new THREE.MeshPhysicalMaterial({ color:0x0b0e14, roughness:0.20, metalness:0.03, clearcoat:1, clearcoatRoughness:0.12 });

  function makeCross(material){
    const g = new THREE.Group();
    const cyl = new THREE.CylinderGeometry(0.32, 0.32, 1.5, 28);
    const part1 = new THREE.Mesh(cyl, material);
    part1.rotation.z = Math.PI/2;
    g.add(part1);
    const part2 = new THREE.Mesh(cyl, material);
    g.add(part2);

    const hole = new THREE.CylinderGeometry(0.10, 0.10, 0.4, 18);
    const cap = new THREE.Mesh(hole, matBlack);
    cap.rotation.z = Math.PI/2;
    cap.position.set(0.75, 0, 0);
    g.add(cap);

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
    obj.scale.setScalar(0.75 + Math.random()*0.60);
    root.add(obj);
  }

  // глобальный курсор (как у Lusion)
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

  // сглаживание, чтобы “дорого”
  let rx=0, ry=0, cx=0, cy=0;

  let tt = 0;
  function tick(){
    tt += 0.01;

    // target from pointer
    const trx = (-pointer.y) * 0.55;
    const tryy = (pointer.x) * 0.75;

    rx += (trx - rx) * 0.06;
    ry += (tryy - ry) * 0.06;

    root.rotation.x = rx + Math.sin(tt*0.6)*0.06;
    root.rotation.y = ry + tt*0.14;

    // camera parallax stronger (чтобы было видно)
    const tcx = pointer.x * 0.60;
    const tcy = 0.2 - pointer.y * 0.35;
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

/* Init */
function onScroll(){
  updateStroke();
  updateReel();
}
window.addEventListener("scroll", onScroll, { passive:true });
window.addEventListener("resize", onScroll, { passive:true });
updateStroke();
updateReel();
