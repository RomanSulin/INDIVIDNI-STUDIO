/* landing_ref.js — v13 patch: services videos + FAQ exclusive + style overrides */
(() => {
  const OVERRIDE_CSS = "\n/* ==== V13 overrides ==== */\n\n/* Projects split: right side white, no color hover backgrounds */\n.projects-split .split-right,\n.projects-split .projects-right{\n  background:#fff !important;\n}\n.projects-split .split-left,\n.projects-split .projects-left{\n  background:#000 !important;\n}\n.projects-split .project-card,\n.projects-split .projects-grid a,\n.projects-split .projects-grid .project-item{\n  border:0 !important;\n  outline:0 !important;\n  box-shadow:none !important;\n  border-radius:16px !important;\n  overflow:hidden !important;\n  transform: translateZ(0);\n}\n.projects-split .project-card:hover,\n.projects-split .projects-grid a:hover,\n.projects-split .projects-grid .project-item:hover{\n  transform: translateY(-6px) !important;\n  box-shadow: 0 18px 50px rgba(0,0,0,.18) !important;\n}\n.projects-split .project-title,\n.projects-split .project-meta,\n.projects-split .project-name{\n  background: transparent !important;\n  color:#fff !important;\n  text-shadow: 0 2px 18px rgba(0,0,0,.55) !important;\n}\n.projects-split [data-color],\n.projects-split .project-card[data-color]{\n  background: transparent !important;\n}\n.projects-split .projects-more,\n.projects-split .projects-more a,\n.projects-split .projects-more-btn{\n  color:#fff !important;\n  border:0 !important;\n  background: transparent !important;\n}\n\n/* WHO section: more padding + signature-like scribble */\n.section-who,\n.who-section{\n  padding-top: clamp(110px, 12vh, 180px) !important;\n  padding-bottom: clamp(110px, 12vh, 180px) !important;\n}\n.who-scribble,\n.who-marker,\n.who-sign{\n  font-family: \"Rock Salt\", \"Cedarville Cursive\", \"Permanent Marker\", cursive !important;\n  color:#29ff6a !important;\n  background: transparent !important;\n  padding:0 !important;\n  display:inline-block;\n  transform: rotate(-3deg);\n  letter-spacing: .02em;\n}\n\n/* Services: more top padding, videos behave as media */\n.section-services,\n.services-section{\n  padding-top: clamp(120px, 14vh, 190px) !important;\n}\n.service-card .media,\n.service-card .service-media{\n  aspect-ratio: 3 / 4;\n  border-radius: 22px !important;\n  overflow:hidden;\n  background:#0b0b0f;\n}\n.service-card video{\n  width:100%;\n  height:100%;\n  object-fit: cover;\n  display:block;\n}\n.service-card .label,\n.service-card .service-title{\n  background: transparent !important;\n  color:#fff !important;\n  text-shadow: 0 2px 18px rgba(0,0,0,.55) !important;\n}\n\n/* CTA: more padding */\n.section-cta,\n.cta-section{\n  padding-top: clamp(90px, 10vh, 140px) !important;\n  padding-bottom: clamp(90px, 10vh, 140px) !important;\n  background:#000 !important;\n}\n\n/* Process cards: 3x2, 3:4, airy, only slight lift on hover */\n.section-process,\n.process-section{\n  padding-top: clamp(80px, 9vh, 120px) !important;\n  padding-bottom: clamp(90px, 10vh, 140px) !important;\n}\n.process-grid{\n  display:grid !important;\n  grid-template-columns: repeat(3, minmax(0,1fr)) !important;\n  gap: clamp(14px, 1.6vw, 22px) !important;\n}\n@media (max-width: 980px){\n  .process-grid{ grid-template-columns: repeat(2, minmax(0,1fr)) !important; }\n}\n@media (max-width: 640px){\n  .process-grid{ grid-template-columns: 1fr !important; }\n}\n.process-card{\n  aspect-ratio: 3 / 4 !important;\n  border-radius: 26px !important;\n  background: rgba(255,255,255,.06) !important;\n  border: 1px solid rgba(255,255,255,.10) !important;\n  box-shadow: 0 24px 70px rgba(0,0,0,.28) !important;\n  backdrop-filter: blur(10px);\n  overflow:hidden;\n  transition: transform .25s ease, box-shadow .25s ease;\n}\n.process-card:hover{\n  transform: translateY(-6px);\n  box-shadow: 0 32px 90px rgba(0,0,0,.36) !important;\n}\n.process-card .desc,\n.process-card .process-desc{\n  text-align:center !important;\n  opacity:.92;\n}\n\n/* FAQ: will be controlled by JS (only one open) */\n.faq details{ border-radius: 16px; overflow:hidden; }\n";

  function injectOverrides(){
    if (document.getElementById('v13-overrides')) return;
    // load handwritten font
    const gf = document.createElement('link');
    gf.rel = 'stylesheet';
    gf.href = 'https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap';
    document.head.appendChild(gf);

    const style = document.createElement('style');
    style.id = 'v13-overrides';
    style.textContent = OVERRIDE_CSS;
    document.head.appendChild(style);
  }

  function setupFaqExclusive(){
    const details = Array.from(document.querySelectorAll('.faq details, .faq-accordion details'));
    if (!details.length) return;
    details.forEach(d => {
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        details.forEach(o => {
          if (o !== d) o.open = false;
        });
      });
    });
  }

  function mapServiceToVideo(title){
    const t = (title || '').toLowerCase();
    // Russian + English fallbacks
    if (t.includes('съём') || t.includes('съем') || t.includes('shoot')) return './assets/services/video/shooting.mov';
    if (t.includes('монтаж') || t.includes('edit')) return './assets/services/video/editing.mov';
    if (t.includes('цвет') || t.includes('color')) return './assets/services/video/sound.mov'; // swapped
    if (t.includes('фото') || t.includes('photo')) return './assets/services/video/photo.mov';
    if (t.includes('ai') || t.includes('график') || t.includes('graphic')) return './assets/services/video/AI.mov';
    return null;
  }

  function ensureServiceVideos(){
    const cards = Array.from(document.querySelectorAll('.service-card, .services-card'));
    if (!cards.length) return;

    cards.forEach(card => {
      const titleEl = card.querySelector('.service-title, .label, h3, h4');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const src = mapServiceToVideo(title);
      if (!src) return;

      // Find media container
      const media = card.querySelector('.service-media, .media, .thumb, .cover') || card;
      // If there's already a video, just ensure playback
      let vid = card.querySelector('video');
      if (!vid){
        // remove image if present
        const img = media.querySelector('img');
        if (img) img.remove();

        vid = document.createElement('video');
        vid.src = src;
        vid.muted = true;
        vid.loop = true;
        vid.autoplay = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        vid.setAttribute('playsinline','');
        vid.setAttribute('webkit-playsinline','');
        // ensure it fills container
        vid.style.width = '100%';
        vid.style.height = '100%';
        vid.style.objectFit = 'cover';
        media.prepend(vid);
      }

      const tryPlay = () => {
        const p = vid.play();
        if (p && typeof p.catch === 'function') p.catch(()=>{});
      };
      vid.addEventListener('loadeddata', tryPlay, {once:true});
      // play when user interacts (autoplay policies)
      card.addEventListener('pointerenter', tryPlay);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) tryPlay();
      });
      tryPlay();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectOverrides();
    setupFaqExclusive();
    ensureServiceVideos();
  });
})();

/* === MOBILE FIX: INDIVIDNI true center + prevent 100vw drift === */
@media (max-width: 640px) {
  /* убираем “дрейф” full-bleed контейнеров на мобильных (100vw часто даёт сдвиг) */
  .full-bleed,
  [class*="full-bleed"],
  .bleed,
  [class*="bleed"] {
    width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
  }

  /* жёсткая центровка wordmark INDIVIDNI */
  .hero .individni,
  .hero .individni-wordmark,
  .hero .wordmark,
  #individni,
  .individni {
    position: relative !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  /* если это SVG/IMG внутри — тоже центруем */
  .hero .individni svg,
  .hero .individni img,
  .individni svg,
  .individni img {
    display: block !important;
    margin: 0 auto !important;
  }
}
