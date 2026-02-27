(() => {
  // Only for catalog page cards
  const vids = Array.from(document.querySelectorAll('.services-page .scard__video'));
  if (!vids.length) return;

  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  // Mobile/touch: NO playback, keep static poster (lightweight)
  if (!canHover){
    vids.forEach(v => { try{ v.pause(); }catch(e){} });
    return;
  }

  // Desktop: load first frame (so cards are not empty) + play on hover
  const primeFirstFrame = async (video) => {
    try{
      const source = video.querySelector('source');
      if (source && source.dataset && source.dataset.src && !source.src){
        source.src = source.dataset.src;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.load();

      const onLoaded = () => {
        try{ video.currentTime = 0.01; }catch(e){}
        try{ video.pause(); }catch(e){}
      };
      video.addEventListener('loadeddata', onLoaded, { once: true });
    }catch(e){}
  };

  vids.forEach(primeFirstFrame);

  vids.forEach(v => {
    const card = v.closest('.scard');
    if (!card) return;
    card.addEventListener('mouseenter', () => { try{ v.play(); }catch(e){} });
    card.addEventListener('mouseleave', () => { try{ v.pause(); v.currentTime = 0.01; }catch(e){} });
  });
})();
