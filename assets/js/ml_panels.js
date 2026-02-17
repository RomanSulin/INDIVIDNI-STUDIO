/* Magnet Lover panels + connectors (v5)
   - Inserts sticker packs per section (mixed text + icon)
   - Adds connector blocks with 4-stripe rails between sections
   - Triggers reveals on scroll (no chaotic animations)
*/

(function(){
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only run on pages that actually have the magnet panels
  const panels = Array.from(document.querySelectorAll('.ml-panel'));
  if(!panels.length) return;

  document.body.classList.add('ml-panels');

  // ---------------------------------------------------------------------------
  // Sticker packs
  // ---------------------------------------------------------------------------

  function makeSticker(opt){
    const el = document.createElement('div');
    el.className = 'ml-sticker';

    if(opt.type === 'icon'){
      el.classList.add('ml-sticker--img');
      el.dataset.icon = opt.icon || 'film';
    }

    // color theme (sets CSS vars used by ml_panels.css)
    const tones = {
      pink: { bg: "#FF5FB8", fg: "#151018" },
      blue: { bg: "#66D3FF", fg: "#0D1216" },
      green: { bg: "#B8FF6A", fg: "#101114" },
      sand: { bg: "#F4D35E", fg: "#111216" }
    };
    const toneKey = opt.tone || "pink";
    const tone = tones[toneKey] || tones.pink;
    el.style.setProperty("--ml-bg", tone.bg);
    el.style.setProperty("--ml-fg", tone.fg);

    // label
    const label = document.createElement('span');
    label.className = 'ml-sticker__label';
    label.textContent = opt.label;
    el.appendChild(label);

    // slight random tilt unless explicitly set
    const rot = (typeof opt.rotate === 'number') ? opt.rotate : (Math.random() * 12 - 6);
    el.style.setProperty('--rot', rot.toFixed(2) + 'deg');

    return el;
  }

  function placeStickers(stickersEl, placements){
    stickersEl.style.removeProperty('top');
    stickersEl.style.removeProperty('right');
    stickersEl.style.removeProperty('bottom');
    stickersEl.style.removeProperty('left');
    stickersEl.style.setProperty('inset', 'auto');

    // container position (for the whole pack)
    const p = placements.pack;
    if(p.t != null) stickersEl.style.top = p.t;
    if(p.r != null) stickersEl.style.right = p.r;
    if(p.b != null) stickersEl.style.bottom = p.b;
    if(p.l != null) stickersEl.style.left = p.l;

    // individual sticker offsets
    const kids = Array.from(stickersEl.children);
    kids.forEach((kid, idx)=>{
      const k = placements.items[idx] || placements.items[placements.items.length-1];
      kid.style.top = k.t;
      kid.style.left = k.l;
    });
  }

  // Per-section sticker logic (kept intentional, not random)
  const stickerPlanById = {
    projects: {
      pack: { t: '54%', l: '-14px' },
      items: [
        { label:'ON SET', type:'text', tone:'pink', rotate:-5, t:'0px', l:'0px' },
        { label:'SOUND', type:'text', tone:'blue', rotate:6, t:'78px', l:'16px' },
      ]
    },
    services: {
      pack: { b: '40px', l: '-10px' },
      items: [
        { label:'CGI', type:'text', tone:'green', rotate:-7, t:'0px', l:'0px' },
        { label:'VFX', type:'text', tone:'sand', rotate:5, t:'78px', l:'18px' },
      ]
    },
    workflow: {
      pack: { t: '24px', r: '-10px' },
      items: [
        { label:'BRIEF', type:'icon', icon:'clipboard', tone:'sand', rotate:7, t:'0px', l:'0px' },
        { label:'PROD', type:'text', tone:'pink', rotate:-4, t:'88px', l:'14px' },
      ]
    },
    pricing: {
      pack: { t: '26px', r: '-12px' },
      items: [
        { label:'SCOPE', type:'icon', icon:'film', tone:'blue', rotate:6, t:'0px', l:'0px' },
        { label:'BUDGET', type:'text', tone:'pink', rotate:-5, t:'88px', l:'14px' },
      ]
    },
    team: {
      pack: { b: '30px', r: '-12px' },
      items: [
        { label:'CREW', type:'icon', icon:'camera', tone:'green', rotate:-6, t:'0px', l:'0px' },
        { label:'POST', type:'text', tone:'sand', rotate:5, t:'88px', l:'16px' },
      ]
    },
    contact: {
      pack: { t: '28px', l: '-12px' },
      items: [
        { label:'LET\'S', type:'text', tone:'pink', rotate:-6, t:'0px', l:'0px' },
        { label:'TALK', type:'text', tone:'blue', rotate:6, t:'78px', l:'16px' },
      ]
    }
  };

  function addStickers(panel){
    if(panel.querySelector(':scope > .ml-stickers')) return;

    const plan = stickerPlanById[panel.id];
    if(!plan) return;

    const wrap = document.createElement('div');
    wrap.className = 'ml-stickers';

    plan.items.forEach((it)=> wrap.appendChild(makeSticker(it)));

    panel.appendChild(wrap);
    placeStickers(wrap, plan);
  }

  panels.forEach(addStickers);

  // ---------------------------------------------------------------------------
  // Partners strip (optional injection, so you don't have to touch HTML)
  // ---------------------------------------------------------------------------

  (function injectPartnersStrip(){
    const projects = document.querySelector('#projects');
    if(!projects) return;
    if(document.querySelector('.partners-strip')) return;

    const sec = document.createElement('section');
    sec.className = 'partners-strip';
    sec.setAttribute('aria-label', 'Партнёры');
    sec.innerHTML = `
      <div class="container">
        <div class="partners-strip__inner">
          <div class="partners-strip__head">
            <span class="kicker">↳ партнёры</span>
            <span class="partners-strip__hand ml-hand">trusted by</span>
          </div>
          <div class="partners-strip__scroller" role="region" aria-label="Слайдер партнёров">
            <div class="partners-strip__track">
              <div class="partner-tile">PARTNER 01</div>
              <div class="partner-tile">PARTNER 02</div>
              <div class="partner-tile">PARTNER 03</div>
              <div class="partner-tile">PARTNER 04</div>
              <div class="partner-tile">PARTNER 05</div>
              <div class="partner-tile">PARTNER 06</div>
              <div class="partner-tile">PARTNER 07</div>
              <div class="partner-tile">PARTNER 08</div>
              <div class="partner-tile">PARTNER 09</div>
              <div class="partner-tile">PARTNER 10</div>
            </div>
          </div>
        </div>
      </div>`;
    projects.insertAdjacentElement('afterend', sec);
  })();

  // ---------------------------------------------------------------------------
  // Film / cassette vibe in the footer (simple, CSS-only player)
  // ---------------------------------------------------------------------------
  (function injectFilmPlayer(){
    const footerLeft = document.querySelector('#contact .footer-left') || document.querySelector('footer .footer-left');
    if(!footerLeft) return;
    if(footerLeft.querySelector('.film-player')) return;

    const fp = document.createElement('div');
    fp.className = 'film-player';
    fp.setAttribute('aria-hidden','true');
    fp.innerHTML = `
      <div class="reel reel--a"></div>
      <div class="tape-line"></div>
      <div class="reel reel--b"></div>
    `;
    footerLeft.appendChild(fp);
  })();

  // ---------------------------------------------------------------------------
  // Connector blocks (the “colored lines passing through the whole site”)
  // ---------------------------------------------------------------------------

  const connectorVariants = ['straight','turn-left','straight','turn-right'];

  function makeConnector(variant){
    const c = document.createElement('div');
    c.className = `ml-connector ml-connector--${variant}`;
    c.setAttribute('aria-hidden','true');

    const rails = document.createElement('div');
    rails.className = 'ml-connector__rails';

    const v = document.createElement('div');
    v.className = 'ml-rail4 ml-connector__v';

    rails.appendChild(v);

    if(variant !== 'straight'){
      const h = document.createElement('div');
      h.className = 'ml-rail4 ml-connector__h';
      rails.appendChild(h);
    }

    c.appendChild(rails);
    return c;
  }

  // Insert connectors after each panel except last
  panels.forEach((panel, idx)=>{
    if(idx === panels.length - 1) return;
    if(panel.nextElementSibling && panel.nextElementSibling.classList.contains('ml-connector')) return;

    const variant = connectorVariants[idx % connectorVariants.length];
    const c = makeConnector(variant);

    panel.insertAdjacentElement('afterend', c);
  });

  const connectors = Array.from(document.querySelectorAll('.ml-connector'));

  // ---------------------------------------------------------------------------
  // Reveal logic
  // ---------------------------------------------------------------------------

  if(prefersReducedMotion){
    panels.forEach(p=> p.classList.add('is-in'));
    connectors.forEach(c=> c.classList.add('is-on'));
    return;
  }

  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add('is-in');
      }
    }
  }, { rootMargin: '-10% 0px -35% 0px', threshold: 0.01 });

  panels.forEach(p=> io.observe(p));

  const io2 = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add('is-on');
      }
    }
  }, { rootMargin: '-15% 0px -25% 0px', threshold: 0.01 });

  connectors.forEach(c=> io2.observe(c));

})();
