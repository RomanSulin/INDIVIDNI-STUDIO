(() => {
  const wall = document.querySelector('[data-photo-wall]');
  if (!wall) return;

  const fallbackSvg = (label, wide = false) => {
    const viewBox = wide ? '0 0 1200 900' : '0 0 900 1125';
    const width = wide ? 1200 : 900;
    const height = wide ? 900 : 1125;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#2d2d31"/>
            <stop offset="100%" stop-color="#0c0c0f"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#g)"/>
        <circle cx="${wide ? 260 : 210}" cy="${wide ? 230 : 220}" r="${wide ? 180 : 160}" fill="rgba(255,255,255,.08)"/>
        <circle cx="${wide ? 960 : 710}" cy="${wide ? 660 : 840}" r="${wide ? 210 : 220}" fill="rgba(255,255,255,.05)"/>
        <text x="90" y="${wide ? 790 : 980}" fill="rgba(255,255,255,.48)" font-size="72" font-family="Arial, Helvetica, sans-serif" letter-spacing="8">${label}</text>
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
    '../assets/services/photo-wall/12.jpg',
    '../assets/services/photo-wall/13.jpg',
    '../assets/services/photo-wall/14.jpg'
  ];

  const desktopConfig = [
    { y: 5,  w: 360, h: 480, speed: 0.18 },
    { y: 18, w: 420, h: 315, speed: 0.17 },
    { y: 12, w: 390, h: 520, speed: 0.16 },
    { y: 30, w: 440, h: 330, speed: 0.19 },
    { y: 38, w: 360, h: 480, speed: 0.15 },
    { y: 48, w: 430, h: 322, speed: 0.17 },
    { y: 58, w: 370, h: 495, speed: 0.16 },
    { y: 66, w: 420, h: 315, speed: 0.18 },
    { y: 74, w: 380, h: 505, speed: 0.15 },
    { y: 8,  w: 450, h: 338, speed: 0.17 },
    { y: 26, w: 365, h: 486, speed: 0.16 },
    { y: 54, w: 435, h: 326, speed: 0.18 },
    { y: 70, w: 355, h: 474, speed: 0.15 },
    { y: 82, w: 415, h: 311, speed: 0.17 }
  ];

  const mobileConfig = [
    { y: 8,  w: 150, h: 200, speed: 0.14 },
    { y: 18, w: 180, h: 135, speed: 0.13 },
    { y: 26, w: 160, h: 214, speed: 0.12 },
    { y: 36, w: 176, h: 132, speed: 0.14 },
    { y: 48, w: 154, h: 205, speed: 0.12 },
    { y: 60, w: 182, h: 136, speed: 0.13 },
    { y: 70, w: 152, h: 202, speed: 0.12 },
    { y: 80, w: 176, h: 132, speed: 0.13 },
    { y: 14, w: 154, h: 205, speed: 0.12 },
    { y: 88, w: 150, h: 200, speed: 0.13 }
  ];

  let items = [];
  let rafId = 0;
  let lastTs = 0;

  const buildWall = () => {
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? mobileConfig : desktopConfig;
    const viewportWidth = wall.clientWidth || window.innerWidth;
    wall.innerHTML = '';
    items = [];

    let cursor = 0;
    config.forEach((cfg, index) => {
      const figure = document.createElement('figure');
      figure.className = 'photo-float';
      figure.tabIndex = 0;
      figure.style.width = `${cfg.w}px`;
      figure.style.height = `${cfg.h}px`;
      figure.style.zIndex = '2';

      const img = document.createElement('img');
      img.alt = `Фотография ${index + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = photoSources[index % photoSources.length];
      img.onerror = () => {
        figure.classList.add('is-fallback');
        img.onerror = null;
        img.src = fallbackSvg(`PHOTO ${String(index + 1).padStart(2, '0')}`, cfg.w > cfg.h);
      };

      figure.addEventListener('mouseenter', () => {
        figure.classList.add('is-active');
      });
      figure.addEventListener('mouseleave', () => {
        figure.classList.remove('is-active');
      });
      figure.addEventListener('focus', () => {
        figure.classList.add('is-active');
      });
      figure.addEventListener('blur', () => {
        figure.classList.remove('is-active');
      });

      figure.appendChild(img);
      wall.appendChild(figure);

      cursor += 120 + Math.random() * 70;
      const x = viewportWidth + cursor;
      const y = Math.round((wall.clientHeight || window.innerHeight) * (cfg.y / 100));

      items.push({
        el: figure,
        img,
        x,
        y,
        width: cfg.w,
        height: cfg.h,
        speed: cfg.speed,
        activeScale: isMobile ? 1.08 : 1.12
      });

      cursor += cfg.w;
    });
  };

  const render = (ts) => {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(32, ts - lastTs || 16.67);
    lastTs = ts;

    const viewportWidth = wall.clientWidth || window.innerWidth;
    const viewportCenter = viewportWidth / 2;

    items.forEach((item) => {
      item.x -= item.speed * dt;

      if (item.x + item.width < -80) {
        const maxX = items.reduce((acc, current) => Math.max(acc, current.x + current.width), viewportWidth);
        item.x = maxX + 140 + Math.random() * 120;
      }

      const currentCenter = item.x + item.width / 2;
      const isActive = item.el.classList.contains('is-active');
      const towardCenter = isActive ? Math.max(-56, Math.min(56, (viewportCenter - currentCenter) * 0.14)) : 0;
      const scale = isActive ? item.activeScale : 1;
      const shiftY = isActive ? -10 : 0;

      item.el.style.transform = `translate3d(${item.x + towardCenter}px, ${item.y + shiftY}px, 0) scale(${scale})`;
      item.el.style.zIndex = isActive ? '18' : '2';
    });

    rafId = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastTs = 0;
  };

  const start = () => {
    stop();
    rafId = window.requestAnimationFrame(render);
  };

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      buildWall();
      start();
    }, 120);
  });

  buildWall();
  start();

  const modal = document.querySelector('[data-photo-request]');
  const openButtons = document.querySelectorAll('[data-photo-request-open]');
  const closeButtons = document.querySelectorAll('[data-photo-request-close]');
  const form = document.querySelector('[data-photo-request-form]');
  const formStages = [...document.querySelectorAll('[data-photo-request-stage="form"]')];
  const successStage = document.querySelector('[data-photo-request-stage="success"]');
  const dialog = modal?.querySelector('.photo-request__dialog');

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    formStages.forEach((node) => node.removeAttribute('hidden'));
    successStage?.setAttribute('hidden', 'hidden');
    dialog?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  };

  openButtons.forEach((btn) => btn.addEventListener('click', openModal));
  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка...';
    }

    const formData = new FormData(form);
    const extras = formData.getAll('extras');
    const payload = {
      type: 'photo_request',
      service: 'Фотография любого формата',
      page: '/services/service-fotografiya-lyubogo-formata.html',
      answers: {
        shoot_type: formData.get('shoot_type') || '',
        usage: formData.get('usage') || '',
        deadline: formData.get('deadline') || '',
        extras,
        references: formData.get('references') || ''
      },
      name: formData.get('name') || '',
      phone: formData.get('phone') || '',
      submitted_at: new Date().toISOString()
    };

    try {
      if (window.INDIVIDNI_BRIEF_WEBHOOK) {
        const response = await fetch(window.INDIVIDNI_BRIEF_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook error: ${response.status}`);
        }
      } else {
        console.info('INDIVIDNI_BRIEF_WEBHOOK is not configured yet.', payload);
      }

      formStages.forEach((node) => node.setAttribute('hidden', 'hidden'));
      successStage?.removeAttribute('hidden');
      form.reset();
      dialog?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      window.alert('Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить заявку';
      }
    }
  });
})();
