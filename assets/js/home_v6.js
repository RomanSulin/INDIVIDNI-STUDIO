/*
  HOME V8 — premium micro‑interactions (HOME ONLY)
  - no touching HERO
  - no cursor-follow spotlight
  - adds: reveal-on-scroll, services preview, stages preview,
          count-up stats, stinger page transitions
*/

(function(){
  const isHome = document.body.classList.contains('home');
  if (!isHome) return;

  // ---------------------------
  // Helpers
  // ---------------------------
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------
  // 1) Reveal on scroll
  // ---------------------------
  const sections = qsa('main > section.section, main > .section');
  sections.forEach(s => {
    // exclude HERO
    if (s.id === 'about' || s.classList.contains('hero-tv') || s.classList.contains('liquid-hero')) return;
    s.classList.add('reveal');
  });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting) e.target.classList.add('is-inview');
    });
  }, { threshold: 0.15 });

  sections.forEach(s => {
    if (!s.classList.contains('reveal')) return;
    io.observe(s);
  });

  // ---------------------------

  // 3) Services preview (if markup exists)
  // ---------------------------
  const svcButtons = qsa('[data-svc]');
  const svcImg = qs('#svcPreviewImg');
  const svcTitle = qs('#svcPreviewTitle');
  const svcText = qs('#svcPreviewText');
  const svcPills = qs('#svcPreviewPills');

  const svcData = {
    brand: {
      title: 'Имиджевый ролик',
      text: 'Строим бренд-восприятие: стиль, эмоция, качество. Снимаем «дорого» и без пластика.',
      img: './assets/project/1/1.jpg',
      pills: ['креатив','съёмка','пост']
    },
    ads: {
      title: 'Рекламный ролик',
      text: 'Оффер + ясная структура. Сильная картинка, которая не мешает продавать.',
      img: './assets/project/2/1.jpg',
      pills: ['оффер','перформанс','форматы']
    },
    animation: {
      title: 'Анимационный ролик',
      text: 'Motion/2D/3D — объяснить сложное быстро и красиво. Чистая графика без «детсада».',
      img: './assets/project/1/1.jpg',
      pills: ['motion','2D/3D','графика']
    },
    education: {
      title: 'Обучающие видеоролики',
      text: 'Сценарий, структура и монтаж так, чтобы зритель понял и дошёл до конца.',
      img: './assets/project/2/1.jpg',
      pills: ['структура','сценарий','монтаж']
    },
    presentation: {
      title: 'Презентационный ролик',
      text: 'Упаковка продукта: «что/как/почему вам верят». Под сайт, демо, инвесторов.',
      img: './assets/project/1/1.jpg',
      pills: ['упаковка','бренд','ясность']
    }
  };

  function renderPills(pills){
    if (!svcPills) return;
    svcPills.innerHTML = '';
    (pills || []).forEach(p=>{
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = p;
      svcPills.appendChild(span);
    });
  }

  function setSvc(key){
    const d = svcData[key];
    if (!d) return;
    if (svcTitle) svcTitle.textContent = d.title;
    if (svcText) svcText.textContent = d.text;
    if (svcImg) svcImg.src = d.img;
    renderPills(d.pills);
    svcButtons.forEach(b=>b.classList.toggle('is-active', b.dataset.svc === key));
  }

  if (svcButtons.length){
    svcButtons.forEach(btn=>{
      btn.addEventListener('mouseenter', ()=> setSvc(btn.dataset.svc));
      btn.addEventListener('click', ()=> setSvc(btn.dataset.svc));
    });
    // initial
    const active = svcButtons.find(b=>b.classList.contains('is-active')) || svcButtons[0];
    if (active) setSvc(active.dataset.svc);
  }

  // ---------------------------
  // 4) Stages preview
  // ---------------------------
  const stageButtons = qsa('#stagesList .stage-item');
  const stageImg = qs('#stagePreviewImg');
  function setStage(btn){
    if (!btn) return;
    stageButtons.forEach(b=>b.classList.toggle('is-active', b === btn));
    const src = btn.getAttribute('data-img');
    if (stageImg && src) stageImg.src = src;
  }
  if (stageButtons.length){
    stageButtons.forEach(b=>{
      b.addEventListener('mouseenter', ()=> setStage(b));
      b.addEventListener('click', ()=> setStage(b));
    });
    const init = stageButtons.find(b=>b.classList.contains('is-active')) || stageButtons[0];
    setStage(init);
  }

  // ---------------------------
  // 5) Count-up stats
  // ---------------------------
  const statEls = qsa('#numbers .stat');
  const countIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.dataset.counted === '1') return;
      el.dataset.counted = '1';

      const numEl = el.querySelector('.stat-num');
      if (!numEl) return;

      const raw = (el.getAttribute('data-count') || '').trim();
      const suffix = el.getAttribute('data-suffix') || '';
      const target = Number(raw);

      // non-numeric (e.g. 24–72ч) — skip
      if (!Number.isFinite(target)) return;

      const start = 0;
      const dur = 800; // ms
      const t0 = performance.now();
      const step = (t)=>{
        const p = Math.min(1, (t - t0) / dur);
        const v = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
        numEl.textContent = `${v}${suffix}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  statEls.forEach(s=>countIO.observe(s));

  // ---------------------------
  // 6) Stinger transitions (internal page navigation)
  // ---------------------------
  const stinger = document.createElement('div');
  stinger.className = 'stinger';
  stinger.innerHTML = `
    <div class="stinger__panel"></div>
    <div class="stinger__txt">INDIVIDNI • STUDIO</div>
  `;
  document.body.appendChild(stinger);

  function isSameOriginHref(href){
    try{
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    }catch{ return false; }
  }

  function shouldSting(a){
    const href = a.getAttribute('href') || '';
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (href.startsWith('javascript:')) return false;
    return isSameOriginHref(href);
  }

  document.addEventListener('click', (e)=>{
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (!shouldSting(a)) return;
    // allow new tab / modifiers
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    const href = a.href;

    stinger.classList.add('is-on');
    window.setTimeout(()=>{ window.location.href = href; }, 220);
    window.setTimeout(()=>{ stinger.classList.remove('is-on'); }, 900);
  }, { capture: true });

})();
