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
    { x: '10%', y: '16%', w: '360px', ar: '3 / 4', r: '-8deg', dx: '12px', dy: '14px' },
    { x: '27%', y: '11%', w: '420px', ar: '4 / 3', r: '6deg', dx: '-10px', dy: '10px' },
    { x: '88%', y: '15%', w: '350px', ar: '3 / 4', r: '7deg', dx: '-12px', dy: '14px' },
    { x: '72%', y: '10%', w: '400px', ar: '4 / 3', r: '-6deg', dx: '8px', dy: '12px' },
    { x: '7%', y: '47%', w: '340px', ar: '3 / 4', r: '8deg', dx: '14px', dy: '-8px' },
    { x: '21%', y: '69%', w: '390px', ar: '4 / 3', r: '-5deg', dx: '-12px', dy: '12px' },
    { x: '12%', y: '86%', w: '320px', ar: '3 / 4', r: '7deg', dx: '10px', dy: '-8px' },
    { x: '92%', y: '42%', w: '350px', ar: '3 / 4', r: '-7deg', dx: '-12px', dy: '10px' },
    { x: '80%', y: '68%', w: '420px', ar: '4 / 3', r: '5deg', dx: '12px', dy: '-8px' },
    { x: '91%', y: '86%', w: '320px', ar: '3 / 4', r: '-6deg', dx: '-8px', dy: '12px' },
    { x: '36%', y: '84%', w: '330px', ar: '3 / 4', r: '4deg', dx: '8px', dy: '10px' },
    { x: '62%', y: '86%', w: '360px', ar: '4 / 3', r: '-4deg', dx: '-8px', dy: '8px' }
  ];

  const mobileLayout = [
    { x: '12%', y: '18%', w: '180px', ar: '3 / 4', r: '-8deg', dx: '8px', dy: '10px' },
    { x: '84%', y: '17%', w: '190px', ar: '4 / 3', r: '8deg', dx: '-8px', dy: '10px' },
    { x: '8%', y: '36%', w: '172px', ar: '3 / 4', r: '7deg', dx: '8px', dy: '-6px' },
    { x: '92%', y: '38%', w: '176px', ar: '3 / 4', r: '-8deg', dx: '-8px', dy: '10px' },
    { x: '18%', y: '61%', w: '188px', ar: '4 / 3', r: '-6deg', dx: '8px', dy: '10px' },
    { x: '81%', y: '61%', w: '188px', ar: '4 / 3', r: '7deg', dx: '-8px', dy: '-8px' },
    { x: '11%', y: '82%', w: '170px', ar: '3 / 4', r: '8deg', dx: '8px', dy: '10px' },
    { x: '89%', y: '82%', w: '170px', ar: '3 / 4', r: '-7deg', dx: '-8px', dy: '10px' },
    { x: '35%', y: '11%', w: '168px', ar: '3 / 4', r: '-4deg', dx: '6px', dy: '8px' },
    { x: '67%', y: '91%', w: '178px', ar: '4 / 3', r: '5deg', dx: '-6px', dy: '8px' }
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
