/* Magnet layer (v2)
   - Adds body.ml-mode
   - Reveal animations inside .ml-board
   - Sticker parallax + subtle tilt inside board
   IMPORTANT: Does NOT touch HERO TV.
*/
(function(){
  const home = document.body.classList.contains('home');
  if (!home) return;

  // Enable the mode (CSS is scoped under this class)
  document.body.classList.add('ml-mode');

  const board = document.getElementById('mlBoard');
  if (!board) return;

  // ---------------------------
  // Reveal
  // ---------------------------
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealEls = Array.from(board.querySelectorAll('[data-reveal]'));
  if (!reduce && revealEls.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    revealEls.forEach(el=>io.observe(el));
  } else {
    revealEls.forEach(el=>el.classList.add('is-in'));
  }

  // ---------------------------
  // Stickers: parallax + tilt
  // ---------------------------
  const stickers = Array.from(board.querySelectorAll('.ml-sticker'));
  if (!stickers.length || reduce) return;

  const clamp = (v, a, b)=> Math.max(a, Math.min(b, v));

  // cache initial rotate from inline var
  stickers.forEach(s=>{
    const r = (s.style.getPropertyValue('--r') || '0deg').trim();
    s.dataset.baseR = r;
  });

  // parallax on scroll (cheap)
  const onScroll = ()=>{
    const y = window.scrollY || window.pageYOffset || 0;
    stickers.forEach((s, i)=>{
      const speed = 0.015 + (i % 3) * 0.006;
      const dy = (y * speed) % 14; // small loop
      s.style.setProperty('--p', dy.toFixed(2) + 'px');
      // incorporate parallax into transform
      s.style.transform = `translate(-50%,-50%) translateY(${dy.toFixed(2)}px) rotate(${s.dataset.baseR})`;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  // tilt relative to board mouse
  let raf = 0;
  let mx = 0, my = 0;
  function onMove(e){
    const r = board.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width;
    my = (e.clientY - r.top) / r.height;
    if (raf) return;
    raf = requestAnimationFrame(()=>{
      raf = 0;
      const rx = clamp((my - 0.5) * -10, -6, 6);
      const ry = clamp((mx - 0.5) * 10, -7, 7);
      stickers.forEach((s)=>{
        // keep their own rotate, add subtle 3d tilt + tiny lift
        s.style.transform = `translate(-50%,-50%) rotate(${s.dataset.baseR}) translateY(var(--p,0px)) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    });
  }
  board.addEventListener('pointermove', onMove);
  board.addEventListener('pointerleave', ()=>{
    stickers.forEach((s)=>{
      s.style.transform = `translate(-50%,-50%) rotate(${s.dataset.baseR}) translateY(var(--p,0px))`;
    });
  });
})();