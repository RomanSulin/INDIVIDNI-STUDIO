(() => {
  // Only for catalog page cards
  const vids = Array.from(document.querySelectorAll('.services-page .scard__video'));
  if (!vids.length) return;

  const primeFirstFrame = async (video) => {
    try{
      const source = video.querySelector('source');
      if (source && source.dataset && source.dataset.src && !source.src){
        source.src = source.dataset.src;
      }
      // Force metadata load so browser can render first frame
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.load();

      const onLoaded = () => {
        // Seek a tiny bit so first frame is painted (some browsers need this)
        try{
          video.currentTime = 0.01;
        }catch(e){}
        video.pause();
        video.removeEventListener('loadeddata', onLoaded);
      };
      video.addEventListener('loadeddata', onLoaded, { once: true });
    }catch(e){}
  };

  vids.forEach(primeFirstFrame);

  // Hover play/pause (desktop only)
  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (canHover){
    vids.forEach(v => {
      const card = v.closest('.scard');
      if (!card) return;
      card.addEventListener('mouseenter', () => { try{ v.play(); }catch(e){} });
      card.addEventListener('mouseleave', () => { try{ v.pause(); v.currentTime = 0.01; }catch(e){} });
    });
  } else {
    // On touch: first tap opens link; keep videos paused
    vids.forEach(v => { try{ v.pause(); }catch(e){} });
  }
})();
