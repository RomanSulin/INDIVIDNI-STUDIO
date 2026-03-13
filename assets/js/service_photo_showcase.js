(() => {
  const wall = document.querySelector('[data-photo-wall]');
  if (!wall) return;

  const fallbackSvg = (label) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1125">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#2d2d31"/>
            <stop offset="100%" stop-color="#0c0c0f"/>
          </linearGradient>
        </defs>
        <rect width="900" height="1125" fill="url(#g)"/>
        <circle cx="210" cy="220" r="160" fill="rgba(255,255,255,.08)"/>
        <circle cx="710" cy="840" r="220" fill="rgba(255,255,255,.05)"/>
        <text x="90" y="980" fill="rgba(255,255,255,.48)" font-size="72" font-family="Arial, Helvetica, sans-serif" letter-spacing="8">${label}</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const photoSources = [
    '../assets/services/photo-wall/01.jpg',
    '../assets/services/photo-wall/02.jpg',
    '../assets/services/photo-wall/03.jpg',
    '../assets/services/photo-wall/04.jpg',
    '../assets/services/photo-wall/05.jpg',
    '../assets/services/photo-wall/06.jpg',
    '../assets/services/photo-wall/07.jpg',
    '../assets/services/photo-wall/08.jpg',
    '../assets/services/photo-wall/09.jpg',
    '../assets/services/photo-wall/10.jpg',
    '../assets/services/photo-wall/11.jpg',
    '../assets/services/photo-wall/12.jpg'
  ];

  const desktopLayout = [
    { x: '8%',  y: '14%', w: '430px', ar: '3 / 4', r: '-8deg', dx: '14px', dy: '14px' },
    { x: '24%', y: '10%', w: '520px', ar: '4 / 3', r: '6deg',  dx: '-12px', dy: '10px' },
    { x: '45%', y: '14%', w: '470px', ar: '3 / 4', r: '-5deg', dx: '10px', dy: '12px' },
    { x: '58%', y: '12%', w: '520px', ar: '4 / 3', r: '5deg',  dx: '-10px', dy: '12px' },
    { x: '78%', y: '10%', w: '500px', ar: '4 / 3', r: '-6deg', dx: '10px', dy: '12px' },
    { x: '92%', y: '15%', w: '420px', ar: '3 / 4', r: '7deg',  dx: '-12px', dy: '14px' },

    { x: '7%',  y: '44%', w: '420px', ar: '3 / 4', r: '8deg',  dx: '14px', dy: '-8px' },
    { x: '24%', y: '50%', w: '540px', ar: '4 / 3', r: '-5deg', dx: '-12px', dy: '12px' },
    { x: '39%', y: '44%', w: '420px', ar: '3 / 4', r: '4deg',  dx: '10px', dy: '10px' },
    { x: '62%', y: '46%', w: '430px', ar: '3 / 4', r: '-4deg', dx: '-10px', dy: '10px' },
    { x: '80%', y: '49%', w: '540px', ar: '4 / 3', r: '5deg',  dx: '12px', dy: '-8px' },
    { x: '93%', y: '43%', w: '420px', ar: '3 / 4', r: '-7deg', dx: '-12px', dy: '10px' },

    { x: '11%', y: '84%', w: '390px', ar: '3 / 4', r: '7deg',  dx: '10px', dy: '-8px' },
    { x: '36%', y: '86%', w: '460px', ar: '3 / 4', r: '4deg',  dx: '8px',  dy: '10px' },
    { x: '63%', y: '86%', w: '520px', ar: '4 / 3', r: '-4deg', dx: '-8px', dy: '8px' },
    { x: '89%', y: '85%', w: '390px', ar: '3 / 4', r: '-6deg', dx: '-8px', dy: '12px' }
  ];

  const mobileLayout = [
    { x: '10%', y: '16%', w: '210px', ar: '3 / 4', r: '-8deg', dx: '8px',  dy: '10px' },
    { x: '36%', y: '11%', w: '198px', ar: '3 / 4', r: '-4deg', dx: '6px',  dy: '8px' },
    { x: '86%', y: '15%', w: '220px', ar: '4 / 3', r: '8deg',  dx: '-8px', dy: '10px' },
    { x: '8%',  y: '36%', w: '198px', ar: '3 / 4', r: '7deg',  dx: '8px',  dy: '-6px' },
    { x: '50%', y: '33%', w: '208px', ar: '4 / 3', r: '-5deg', dx: '7px',  dy: '8px' },
    { x: '92%', y: '38%', w: '202px', ar: '3 / 4', r: '-8deg', dx: '-8px', dy: '10px' },
    { x: '17%', y: '61%', w: '220px', ar: '4 / 3', r: '-6deg', dx: '8px',  dy: '10px' },
    { x: '50%', y: '66%', w: '200px', ar: '3 / 4', r: '4deg',  dx: '6px',  dy: '8px' },
    { x: '82%', y: '61%', w: '220px', ar: '4 / 3', r: '7deg',  dx: '-8px', dy: '-8px' },
    { x: '11%', y: '84%', w: '190px', ar: '3 / 4', r: '8deg',  dx: '8px',  dy: '10px' },
    { x: '67%', y: '91%', w: '208px', ar: '4 / 3', r: '5deg',  dx: '-6px', dy: '8px' },
    { x: '89%', y: '83%', w: '190px', ar: '3 / 4', r: '-7deg', dx: '-8px', dy: '10px' }
  ];

  const build = () => {
    const layout = window.innerWidth < 768 ? mobileLayout : desktopLayout;
    wall.innerHTML = '';

    layout.forEach((cfg, index) => {
      const figure = document.createElement('figure');
      figure.className = 'photo-float';
      figure.style.setProperty('--x', cfg.x);
      figure.style.setProperty('--y', cfg.y);
      figure.style.setProperty('--w', cfg.w);
      figure.style.setProperty('--ar', cfg.ar || '3 / 4');
      figure.style.setProperty('--r', cfg.r);
      figure.style.setProperty('--delay', `${(index % 6) * 0.55}s`);
      figure.style.setProperty('--drift-x', cfg.dx);
      figure.style.setProperty('--drift-y', cfg.dy);

      const img = document.createElement('img');
      img.alt = `Фотография ${index + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = photoSources[index % photoSources.length];
      img.onerror = () => {
        figure.classList.add('is-fallback');
        img.onerror = null;
        img.src = fallbackSvg(`PHOTO ${String(index + 1).padStart(2, '0')}`);
      };

      figure.appendChild(img);
      wall.appendChild(figure);
    });
  };

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 120);
  });

  build();
})();
