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
    { x: '12%', y: '18%', w: '280px', r: '-8deg', dx: '10px', dy: '14px' },
    { x: '27%', y: '12%', w: '230px', r: '6deg', dx: '-8px', dy: '10px' },
    { x: '86%', y: '15%', w: '250px', r: '7deg', dx: '-10px', dy: '12px' },
    { x: '73%', y: '10%', w: '220px', r: '-6deg', dx: '6px', dy: '10px' },
    { x: '8%', y: '49%', w: '250px', r: '8deg', dx: '12px', dy: '-8px' },
    { x: '24%', y: '71%', w: '250px', r: '-5deg', dx: '-10px', dy: '12px' },
    { x: '14%', y: '84%', w: '220px', r: '7deg', dx: '10px', dy: '-8px' },
    { x: '88%', y: '45%', w: '255px', r: '-7deg', dx: '-10px', dy: '10px' },
    { x: '77%', y: '72%', w: '270px', r: '5deg', dx: '12px', dy: '-8px' },
    { x: '91%', y: '84%', w: '220px', r: '-6deg', dx: '-8px', dy: '12px' },
    { x: '37%', y: '84%', w: '210px', r: '4deg', dx: '8px', dy: '10px' },
    { x: '62%', y: '86%', w: '210px', r: '-4deg', dx: '-8px', dy: '8px' }
  ];

  const mobileLayout = [
    { x: '14%', y: '20%', w: '150px', r: '-8deg', dx: '8px', dy: '10px' },
    { x: '82%', y: '18%', w: '140px', r: '8deg', dx: '-8px', dy: '10px' },
    { x: '9%', y: '38%', w: '136px', r: '7deg', dx: '8px', dy: '-6px' },
    { x: '90%', y: '39%', w: '138px', r: '-8deg', dx: '-8px', dy: '10px' },
    { x: '20%', y: '62%', w: '142px', r: '-6deg', dx: '8px', dy: '10px' },
    { x: '79%', y: '62%', w: '142px', r: '7deg', dx: '-8px', dy: '-8px' },
    { x: '12%', y: '82%', w: '136px', r: '8deg', dx: '8px', dy: '10px' },
    { x: '88%', y: '82%', w: '136px', r: '-7deg', dx: '-8px', dy: '10px' },
    { x: '34%', y: '12%', w: '124px', r: '-4deg', dx: '6px', dy: '8px' },
    { x: '66%', y: '90%', w: '124px', r: '5deg', dx: '-6px', dy: '8px' }
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
