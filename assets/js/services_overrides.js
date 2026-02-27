/* Services catalog improvements:
   - Show static first frame (no blank cards)
   - Play on hover, pause on leave
*/
(function(){
  const vids = Array.from(document.querySelectorAll('video.scard__video'));
  if (!vids.length) return;

  function armVideo(video){
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    if (source.getAttribute('src')) return; // already armed

    // Load enough data to render the first frame
    video.preload = 'metadata';
    source.setAttribute('src', source.getAttribute('data-src'));
    source.removeAttribute('data-src');
    try { video.load(); } catch(e) {}

    const onLoaded = () => {
      // Seek a tiny bit to force frame decode in more browsers
      const t = 0.08;
      try {
        if (isFinite(video.duration) && video.duration > t) video.currentTime = t;
      } catch(e) {}
      try { video.pause(); } catch(e) {}
      video.classList.add('is-ready');
      video.removeEventListener('loadeddata', onLoaded);
    };
    video.addEventListener('loadeddata', onLoaded, { once:true });
  }

  // IntersectionObserver to avoid loading everything at once
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      if (ent.isIntersecting) {
        armVideo(ent.target);
        io.unobserve(ent.target);
      }
    });
  }, { rootMargin: '200px 0px', threshold: 0.01 }) : null;

  vids.forEach(v=>{
    // ensure a poster exists so there is never true blank
    if (!v.getAttribute('poster')) v.setAttribute('poster','../assets/img/ph_16x9.png');

    if (io) io.observe(v); else armVideo(v);

    const card = v.closest('.scard');
    if (!card) return;

    // Desktop hover behavior
    card.addEventListener('mouseenter', ()=>{
      armVideo(v);
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(()=>{});
    });
    card.addEventListener('mouseleave', ()=>{
      try { v.pause(); } catch(e) {}
    });
  });
})();
