// Mega menu
const btn = document.querySelector('[data-menu="solutions"]');
const mega = document.getElementById('solutions');

function closeMega() {
  mega?.classList.remove('is-open');
  btn?.setAttribute('aria-expanded', 'false');
}

btn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = mega.classList.toggle('is-open');
  btn.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', closeMega);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMega();
});

// Hero rotator
const words = Array.from(document.querySelectorAll('.rotator__word'));
let i = 0;
setInterval(() => {
  if (!words.length) return;
  words[i].classList.remove('is-active');
  i = (i + 1) % words.length;
  words[i].classList.add('is-active');
}, 1800);

// Scroll reveal (cheap + effective)
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();
