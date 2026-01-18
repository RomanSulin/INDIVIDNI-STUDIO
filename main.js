// Utilities
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) e.target.classList.add('is-visible');
  }
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu (black dropdown)
const burger = document.getElementById('burger');
const mnav = document.getElementById('mnav');
const mnavClose = document.getElementById('mnavClose');
const mnavBackdrop = document.getElementById('mnavBackdrop');

function openMnav(){
  mnav.classList.add('is-open');
  burger.setAttribute('aria-expanded', 'true');
  mnav.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeMnav(){
  mnav.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  mnav.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
burger?.addEventListener('click', () => {
  mnav.classList.contains('is-open') ? closeMnav() : openMnav();
});
mnavClose?.addEventListener('click', closeMnav);
mnavBackdrop?.addEventListener('click', closeMnav);
mnav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMnav));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMnav(); });

// Interactive cover (mousemove parallax)
const cover = document.getElementById('cover');
const coverInner = document.getElementById('coverInner');

if (cover && coverInner) {
  let targetRX = 0, targetRY = 0, rx = 0, ry = 0;
  let targetMX = 50, targetMY = 40, mx = 50, my = 40;

  function onMove(clientX, clientY) {
    const r = cover.getBoundingClientRect();
    const px = clamp((clientX - r.left) / r.width, 0, 1);
    const py = clamp((clientY - r.top) / r.height, 0, 1);

    targetRY = lerp(-10, 10, px);   // rotateY
    targetRX = lerp(  8, -8, py);   // rotateX

    targetMX = px * 100;
    targetMY = py * 100;
  }

  cover.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  cover.addEventListener('mouseleave', () => {
    targetRX = 0; targetRY = 0;
    targetMX = 50; targetMY = 40;
  });

  // mobile: no tilt by default (can add deviceorientation later)
  const tick = () => {
    rx = lerp(rx, targetRX, 0.08);
    ry = lerp(ry, targetRY, 0.08);
    mx = lerp(mx, targetMX, 0.08);
    my = lerp(my, targetMY, 0.08);

    coverInner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    coverInner.style.setProperty('--mx', `${mx}%`);
    coverInner.style.setProperty('--my', `${my}%`);
    requestAnimationFrame(tick);
  };
  tick();
}

// Split text animation (chars/words)
function splitText(el, mode){
  const text = el.textContent.trim();
  el.textContent = '';
  const parts = mode === 'chars' ? [...text] : text.split(/\s+/);
  parts.forEach((p, i) => {
    const span = document.createElement('span');
    span.textContent = (mode === 'chars') ? p : (p + (i < parts.length - 1 ? ' ' : ''));
    span.style.opacity = '0';
    span.style.transform = 'translateY(10px)';
    span.style.transition = `opacity .55s ease ${i * 18}ms, transform .55s ease ${i * 18}ms`;
    el.appendChild(span);
  });
}

document.querySelectorAll('.split').forEach(el => {
  const mode = el.getAttribute('data-split') || 'chars';
  splitText(el, mode);
  io.observe(el);
});

// when split element becomes visible, animate spans
const splitIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.querySelectorAll('span').forEach(s => {
      s.style.opacity = '1';
      s.style.transform = 'translateY(0)';
    });
    splitIo.unobserve(e.target);
  }
}, { threshold: 0.45 });

document.querySelectorAll('.split').forEach(el => splitIo.observe(el));

// Tabs
document.querySelectorAll('[data-tabs]').forEach(root => {
  const tabs = Array.from(root.querySelectorAll('.tabs__tab'));
  const panes = Array.from(root.querySelectorAll('.pane'));

  function activate(id){
    tabs.forEach(t => {
      const on = t.dataset.tab === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panes.forEach(p => p.classList.toggle('is-active', p.dataset.pane === id));
  }

  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
});

// Case videos hover autoplay (desktop only)
function canHover(){
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
document.querySelectorAll('.caseBig__video, .caseCard__video').forEach(v => {
  if (!canHover()) return;
  const parent = v.closest('.caseBig, .caseCard');
  if (!parent) return;
  parent.addEventListener('mouseenter', () => { v.play().catch(()=>{}); });
  parent.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
});

// Showreel behavior: scroll transforms + autoplay/pause/stop on leave + sound toggle
const reelWrap = document.getElementById('reelWrap');
const reel = document.getElementById('reel');
const reelVideo = document.getElementById('reelVideo');
const soundBtn = document.getElementById('soundBtn');

let userSound = false;

function setSoundUI(){
  const icon = soundBtn?.querySelector('.reel__btnIcon');
  if (icon) icon.textContent = userSound ? '🔊' : '🔇';
  soundBtn?.setAttribute('aria-label', userSound ? 'Выключить звук' : 'Включить звук');
}
setSoundUI();

soundBtn?.addEventListener('click', () => {
  userSound = !userSound;
  if (!reelVideo) return;
  // autoplay requires muted, but after user click we can unmute
  reelVideo.muted = !userSound;
  setSoundUI();
  reelVideo.play().catch(()=>{});
});

// play/pause on visibility
if (reelWrap && reelVideo) {
  const visIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target !== reelWrap) continue;
      if (e.isIntersecting) {
        // autoplay: must be muted unless user enabled sound
        reelVideo.muted = !userSound;
        reelVideo.play().catch(()=>{});
      } else {
        reelVideo.pause();
        reelVideo.currentTime = 0; // "остановка" при уходе
      }
    }
  }, { threshold: 0.25 });
  visIo.observe(reelWrap);
}

let ticking = false;
function updateReelTransform(){
  if (!reelWrap || !reel) return;

  const r = reelWrap.getBoundingClientRect();
  const vh = window.innerHeight || 800;

  // progress: 0 when top enters, 1 near bottom
  const start = vh * 0.10;
  const end = vh * 0.90;
  const t = clamp((start - r.top) / (r.height - (end - start)), 0, 1);

  // "transition into background": grow slightly, remove radius, small lift
  const scale = lerp(0.96, 1.06, t);
  const radius = lerp(22, 0, t);
  const y = lerp(14, -10, t);

  reel.style.setProperty('--reelScale', scale.toFixed(4));
  reel.style.setProperty('--reelRadius', `${radius.toFixed(2)}px`);
  reel.style.setProperty('--reelY', `${y.toFixed(2)}px`);
}

function onScroll(){
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateReelTransform();
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive:true });
window.addEventListener('resize', onScroll);
onScroll();
