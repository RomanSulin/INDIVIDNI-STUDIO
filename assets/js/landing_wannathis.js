(() => {
  const body = document.body;

  // Theme toggle
  const pills = Array.from(document.querySelectorAll('[data-theme-pill]'));
  function setTheme(theme){
    body.dataset.theme = theme;
    pills.forEach(p => p.classList.toggle('is-active', p.dataset.themePill === theme));
    try{ localStorage.setItem('individniTheme', theme); }catch(e){}
  }
  if (pills.length){
    pills.forEach(p => p.addEventListener('click', () => setTheme(p.dataset.themePill)));
    try{
      const saved = localStorage.getItem('individniTheme');
      if (saved) setTheme(saved);
    }catch(e){}
  }

  // Mobile drawer
  const burger = document.querySelector('[data-burger]');
  const drawer = document.querySelector('[data-drawer]');
  if (burger && drawer){
    burger.addEventListener('click', () => drawer.classList.toggle('is-open'));
    drawer.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a) drawer.classList.remove('is-open');
    });
  }

  // Smooth anchor
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Showreel modal (uses #tvHeroVideo source)
  const btnShowreel = document.getElementById('btnShowreel');
  const modal = document.querySelector('[data-showreel-modal]');
  const modalVideo = document.querySelector('[data-showreel-video]');
  const heroVideo = document.getElementById('tvHeroVideo');

  function openModal(){
    if (!modal || !modalVideo || !heroVideo) return;
    // copy source
    const src = heroVideo.querySelector('source')?.getAttribute('src');
    if (src){
      if (modalVideo.src !== src) modalVideo.src = src;
    }
    modal.classList.add('is-open');
    modalVideo.currentTime = 0;
    modalVideo.muted = false;
    modalVideo.play().catch(() => {});
  }
  function closeModal(){
    if (!modal || !modalVideo) return;
    modal.classList.remove('is-open');
    modalVideo.pause();
  }

  if (btnShowreel) btnShowreel.addEventListener('click', openModal);
  if (modal){
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === modal) closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
})();
