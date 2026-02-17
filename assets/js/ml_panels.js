/* Magnetlover-style panels: scroll reveal + tiny parallax.
   Safe: runs only when body has .ml-panels
*/

(() => {
  const body = document.body;
  if (!body || !body.classList.contains('ml-panels')) return;
  body.classList.add('ml-anim');

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = Array.from(document.querySelectorAll('body.ml-panels .ml-panel'));
  if (!panels.length) return;

  const palette = ['c1', 'c2', 'c3', 'c4'];
  const placements = [
    { a: { x: 10, y: 82, rot: -12 }, b: { x: 88, y: 18, rot: 10 } },
    { a: { x: 12, y: 18, rot: -14 }, b: { x: 86, y: 82, rot: 9 } },
    { a: { x: 8,  y: 76, rot: -10 }, b: { x: 90, y: 14, rot: 12 } },
    { a: { x: 14, y: 22, rot: -11 }, b: { x: 84, y: 78, rot: 8 } },
  ];

  // Inject rails + stickers into each panel container
  panels.forEach((sec, i) => {
    const box = sec.querySelector(':scope > .container');
    if (!box) return;

    if (!box.querySelector('.ml-rail')) {
      const rail = document.createElement('div');
      rail.className = 'ml-rail';
      rail.innerHTML = `<div class="ml-rail__bar"></div>`;
      rail.setAttribute('aria-hidden', 'true');
      box.prepend(rail);
    }

    const a = sec.dataset.stickerA;
    const b = sec.dataset.stickerB;

    const addSticker = (txt, variant, colorKey) => {
      const el = document.createElement('div');
      el.className = `ml-sticker ml-sticker--${variant}`;
      el.textContent = txt;
      el.dataset.c = colorKey;

      const p = placements[i % placements.length];
      const pos = (variant === 'b' ? p.b : p.a);
      el.style.setProperty('--x', String(pos.x));
      el.style.setProperty('--y', String(pos.y));
      el.style.setProperty('--rot', `${pos.rot}deg`);

      const lightBg = (colorKey === 'c3' || colorKey === 'c4');
      el.style.setProperty('--ml-fg', lightBg ? '#101114' : '#ffffff');

      box.appendChild(el);
      return el;
    };

    if (a && !box.querySelector('.ml-sticker--a')) addSticker(a, 'a', palette[i % palette.length]);
    if (b && !box.querySelector('.ml-sticker--b')) addSticker(b, 'b', palette[(i + 2) % palette.length]);
  });

  // Basic reveal with IntersectionObserver (works without GSAP)
  const revealAll = () => panels.forEach(p => p.classList.add('is-in'));

  if (reduced) {
    revealAll();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.16, rootMargin: '-10% 0px -18% 0px' }
  );
  panels.forEach(p => io.observe(p));

  // Enhanced scroll animations (optional) if GSAP + ScrollTrigger exist
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (e) {
    return;
  }

  panels.forEach((sec) => {
    const box = sec.querySelector(':scope > .container');
    if (!box) return;

    const rail = box.querySelector('.ml-rail');
    if (rail) {
      gsap.fromTo(
        rail,
        { scaleX: 0.2, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 80%',
            once: true,
          },
        }
      );
    }

    const stickers = Array.from(box.querySelectorAll('.ml-sticker'));
    stickers.forEach((st, idx) => {
      gsap.to(st, {
        y: idx % 2 ? 26 : -22,
        rotation: idx % 2 ? 6 : -6,
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  });
})();
