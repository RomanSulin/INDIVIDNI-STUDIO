/* ================================================================
   INDIVIDNI — Magnetlover animations
   - Цветные кабели между секциями (SVG, анимированные)
   - Стикеры (плавающие, с параллаксом)
   - Scroll band бегущая строка
   - Reveal on scroll
   - Process preview
   НЕ трогает Hero TV
   ================================================================ */

(function () {
  'use strict';

  // ── HELPERS ────────────────────────────────────────────────────
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── КАБЕЛИ ─────────────────────────────────────────────────────
  // Рисуем SVG кабели между каждой парой секций
  function buildCables() {
    const sections = $$('body.home main > section, body.home footer.footer');
    if (!sections.length) return;

    const COLORS = ['#ff3d6e', '#ffd400', '#00c878', '#00b4ff'];
    const STROKE = 12;
    const GAP = 4; // между кабелями
    const HEIGHT = 90; // высота блока кабеля

    // Направления поворотов для каждого стыка
    const TURNS = ['left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left'];

    sections.forEach((sec, i) => {
      if (i === sections.length - 1) return;

      const dir = TURNS[i % TURNS.length];
      const wrap = document.createElement('div');
      wrap.className = 'ind-cable';
      wrap.setAttribute('aria-hidden', 'true');

      const totalW = COLORS.length * STROKE + (COLORS.length - 1) * GAP;

      // Выбираем вид кабеля: прямой или с поворотом
      let svgContent = '';

      if (dir === 'straight') {
        // Просто вертикальные линии по центру
        svgContent = buildStraightCable(COLORS, STROKE, GAP, HEIGHT);
      } else if (dir === 'left') {
        // Уходят влево
        svgContent = buildTurnCable(COLORS, STROKE, GAP, HEIGHT, 'left');
      } else {
        // Уходят вправо
        svgContent = buildTurnCable(COLORS, STROKE, GAP, HEIGHT, 'right');
      }

      wrap.innerHTML = svgContent;
      sec.insertAdjacentElement('afterend', wrap);
    });
  }

  function buildStraightCable(colors, sw, gap, h) {
    const totalW = colors.length * sw + (colors.length - 1) * gap;
    const vb = `0 0 ${totalW} ${h}`;
    let paths = '';
    colors.forEach((c, i) => {
      const x = i * (sw + gap) + sw / 2;
      paths += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
    });
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" style="width:${totalW}px;height:${h}px;display:block;margin:0 auto;overflow:visible;">
      <style>.cable-dash{stroke-dasharray:${h*2};stroke-dashoffset:${h*2};animation:cableDraw .9s ease forwards;}</style>
      <defs><style>@keyframes cableDraw{to{stroke-dashoffset:0}}</style></defs>
      ${paths}
    </svg>`;
  }

  function buildTurnCable(colors, sw, gap, h, dir) {
    // Размеры: SVG на всю ширину окна, кабели расходятся в сторону
    const VW = 1440; // viewBox width
    const centerX = VW / 2;
    const curveH = h * 0.6;
    const endY = h * 0.85;
    const radius = 40;

    let paths = '';

    colors.forEach((c, i) => {
      const startX = centerX + (i - (colors.length - 1) / 2) * (sw + gap);
      let endX;

      if (dir === 'left') {
        // каждый следующий кабель уходит левее
        endX = startX - (40 + i * 22);
      } else {
        endX = startX + (40 + i * 22);
      }

      const cp1x = startX;
      const cp1y = curveH;
      const cp2x = endX;
      const cp2y = curveH;

      // Простой плавный поворот через cubic bezier
      const d = `M ${startX} 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
      paths += `<path d="${d}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
    });

    return `<svg viewBox="0 0 ${VW} ${h}" preserveAspectRatio="xMidYMid meet"
      style="width:100%;height:${h}px;display:block;overflow:visible;">
      ${paths}
    </svg>`;
  }

  // ── КАБЕЛИ v2 — чётко как у magnetlover ──────────────────────
  // Переопределяем с нормальными поворотами
  function insertCables() {
    const sections = $$('body.home main > section, body.home footer.footer');
    if (!sections.length) return;

    const COLORS = ['#ff3d6e', '#ffd400', '#00c878', '#00b4ff'];
    const SW = 13;
    const GAP = 5;
    const H = 80;

    const patterns = [
      // 0: прямо вниз
      (colors, sw, gap, h) => {
        const w = colors.length * sw + (colors.length - 1) * gap;
        let p = '';
        colors.forEach((c, i) => {
          const x = i * (sw + gap) + sw / 2;
          p += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
        });
        return `<svg viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;display:block;margin:0 auto;overflow:visible;">${p}</svg>`;
      },
      // 1: поворот LEFT — кабели уходят влево
      (colors, sw, gap, h) => {
        const VW = 1200;
        const mid = VW / 2;
        let p = '';
        colors.forEach((c, i) => {
          const sx = mid + (i - 1.5) * (sw + gap);
          const ex = -10 + i * 20; // конец у левого края
          const my = h * 0.55;
          p += `<path d="M${sx},0 C${sx},${my} ${ex},${my} ${ex},${h}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
        });
        return `<svg viewBox="0 0 ${VW} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${h}px;display:block;overflow:visible;">${p}</svg>`;
      },
      // 2: поворот RIGHT — кабели уходят вправо
      (colors, sw, gap, h) => {
        const VW = 1200;
        const mid = VW / 2;
        let p = '';
        colors.forEach((c, i) => {
          const sx = mid + (i - 1.5) * (sw + gap);
          const ex = VW + 10 - i * 20;
          const my = h * 0.55;
          p += `<path d="M${sx},0 C${sx},${my} ${ex},${my} ${ex},${h}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
        });
        return `<svg viewBox="0 0 ${VW} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${h}px;display:block;overflow:visible;">${p}</svg>`;
      },
    ];

    const seq = [0, 1, 0, 2, 0, 1, 0, 2, 0, 1];

    sections.forEach((sec, i) => {
      if (i === sections.length - 1) return;
      const fn = patterns[seq[i % seq.length]];
      const wrap = document.createElement('div');
      wrap.className = 'ind-cable';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = fn(COLORS, SW, GAP, H);
      sec.insertAdjacentElement('afterend', wrap);
    });
  }

  // ── СТИКЕРЫ ───────────────────────────────────────────────────
  // Конфиг стикеров для каждой секции
  const STICKER_CONFIG = {
    projects: [
      { label: 'ON\nSET',  cls: 'ind-sticker--pink',   top: '18%', left: '-32px', sr: -8, dur: '4.2s' },
      { label: 'SOUND',    cls: 'ind-sticker--blue',   bottom: '14%', right: '-28px', sr: 7, dur: '5.1s' },
    ],
    services: [
      { label: 'CGI\nVFX',  cls: 'ind-sticker--green',  top: '22%', right: '-28px', sr: -7, dur: '4.8s' },
      { label: 'COLOR',     cls: 'ind-sticker--yellow', bottom: '18%', left: '-30px', sr: 6, dur: '3.9s' },
    ],
    numbers: [
      { label: 'PROD\nUCT', cls: 'ind-sticker--purple', top: '16%', right: '-28px', sr: 9, dur: '4.5s' },
    ],
    process: [
      { label: 'SHOOT',    cls: 'ind-sticker--pink',   bottom: '20%', left: '-28px', sr: -5, dur: '5.3s' },
    ],
    pricing: [
      { label: 'BUDGET',   cls: 'ind-sticker--yellow', top: '14%', right: '-28px', sr: 8,  dur: '4.0s' },
    ],
    team: [
      { label: 'CREW',     cls: 'ind-sticker--green',  top: '18%', left: '-28px', sr: -6, dur: '4.6s' },
      { label: 'POST',     cls: 'ind-sticker--pink',   bottom: '22%', right: '-28px', sr: 7,  dur: '5.0s' },
    ],
    value: [
      { label: 'QUALI\nTY', cls: 'ind-sticker--blue', top: '20%', left: '-28px', sr: -4, dur: '4.3s' },
    ],
    faq: [
      { label: 'Q&A',      cls: 'ind-sticker--purple', top: '18%', right: '-28px', sr: -7, dur: '3.8s' },
    ],
    workflow: [
      { label: 'BRIEF',    cls: 'ind-sticker--yellow', top: '20%', left: '-28px', sr: -5, dur: '4.1s' },
    ],
    contact: [
      { label: "LET'S\nTALK", cls: 'ind-sticker--pink', top: '16%', left: '-28px',  sr: 7,  dur: '4.7s' },
      { label: 'INSTA',        cls: 'ind-sticker--blue', bottom: '20%', right: '-28px', sr: -6, dur: '5.2s' },
    ],
  };

  function createSticker(cfg) {
    const el = document.createElement('div');
    el.className = `ind-sticker ${cfg.cls} is-float`;
    el.setAttribute('aria-hidden', 'true');

    // позиция
    if (cfg.top)    el.style.top    = cfg.top;
    if (cfg.bottom) el.style.bottom = cfg.bottom;
    if (cfg.left)   el.style.left   = cfg.left;
    if (cfg.right)  el.style.right  = cfg.right;
    el.style.setProperty('--sr',  `${cfg.sr}deg`);
    el.style.setProperty('--dur', cfg.dur || '4s');

    const inner = document.createElement('div');
    inner.className = 'ind-sticker__inner';
    inner.style.whiteSpace = 'pre-line';
    inner.style.textAlign = 'center';
    inner.textContent = cfg.label;
    el.appendChild(inner);

    return el;
  }

  function buildStickers() {
    Object.entries(STICKER_CONFIG).forEach(([id, cfgs]) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      cfgs.forEach(cfg => sec.appendChild(createSticker(cfg)));
    });
  }

  // Параллакс стикеров при скролле
  function initStickerParallax() {
    const stickers = $$('.ind-sticker');
    if (!stickers.length) return;

    let lastY = 0;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      stickers.forEach((s, i) => {
        const speed = 0.04 + (i % 4) * 0.015;
        const dy = y * speed % 18;
        s.style.setProperty('--py', `${dy.toFixed(2)}px`);
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── СЕКЦИОННЫЕ ЛЕЙБЛЫ ─────────────────────────────────────────
  const SEC_LABELS = {
    projects: 'IND — 001 // PROJECTS',
    services: 'IND — 002 // SERVICES',
    numbers:  'IND — 003 // IN NUMBERS',
    process:  'IND — 004 // PROCESS',
    pricing:  'IND — 005 // PRICING',
    team:     'IND — 006 // TEAM',
    value:    'IND — 007 // VALUE',
    faq:      'IND — 008 // FAQ',
    workflow: 'IND — 009 // HOW WE WORK',
    contact:  'IND — 010 // CONTACT',
  };

  function buildLabels() {
    Object.entries(SEC_LABELS).forEach(([id, txt]) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      const lbl = document.createElement('div');
      lbl.className = 'ind-sec-label';
      lbl.setAttribute('aria-hidden', 'true');
      lbl.textContent = txt;
      sec.appendChild(lbl);
    });
  }

  // ── СКРОЛЛ-БЭНД ───────────────────────────────────────────────
  function buildScrollBand() {
    // Ищем после героя
    const hero = $('section.liquid-hero, section.hero-tv, #about');
    if (!hero) return;

    const band = document.createElement('div');
    band.className = 'ind-scroll-band';
    band.setAttribute('aria-hidden', 'true');

    const words = ['SCROLL', '//', 'SCROLL', '//', 'SCROLL', '//', 'SCROLL', '//', 'SCROLL', '//', 'SCROLL', '//', 'SCROLL', '//',];
    const marquee = document.createElement('div');
    marquee.className = 'ind-scroll-band__marquee';
    // дублируем для бесшовности
    [1, 2].forEach(() => {
      words.forEach(w => {
        const s = document.createElement('span');
        s.textContent = w;
        marquee.appendChild(s);
      });
    });

    const track = document.createElement('div');
    track.className = 'ind-scroll-band__track';
    track.appendChild(marquee);

    band.innerHTML = `<span class="ind-scroll-band__side">⊙⊙⊙</span>`;
    band.appendChild(track);
    band.innerHTML += `<span class="ind-scroll-band__side">⊕</span>`;

    // Вставляем ПОСЛЕ героя, но перед следующим элементом
    const sibling = hero.nextElementSibling;
    // Если первый следующий — уже кабель или бэнд, не добавляем
    if (sibling && sibling.classList.contains('ind-scroll-band')) return;
    hero.insertAdjacentElement('afterend', band);
  }

  // ── REVEAL ON SCROLL ──────────────────────────────────────────
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.10 });

    els.forEach(el => io.observe(el));
  }

  // ── PROCESS PREVIEW ───────────────────────────────────────────
  function initProcessPreview() {
    const process = $('[data-process]');
    if (!process) return;
    const preview = $('[data-process-preview]', process);
    const steps   = $$('[data-step]', process);
    if (!preview || !steps.length) return;

    function setActive(step) {
      steps.forEach(s => s.classList.toggle('is-active', s === step));
      const src = step.getAttribute('data-img');
      if (src && src !== preview.src) {
        preview.style.opacity = '0';
        setTimeout(() => {
          preview.src = src;
          preview.style.opacity = '1';
        }, 200);
      }
    }

    steps.forEach(step => {
      const btn = step.querySelector('.step-btn');
      if (!btn) return;
      btn.addEventListener('mouseenter', () => setActive(step));
      btn.addEventListener('click', () => setActive(step));
    });

    const first = steps.find(s => s.classList.contains('is-active')) || steps[0];
    if (first) setActive(first);
  }

  // ── АККОРДЕОНЫ ────────────────────────────────────────────────
  function initAccordions() {
    $$('[data-accordion]').forEach(acc => {
      const items = $$('[data-acc-item]', acc);

      function close(item) {
        const panel = $('[data-acc-panel]', item);
        const btn   = $('.acc-btn', item);
        if (!panel) return;
        item.removeAttribute('data-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0px'; });
      }

      function open(item) {
        const panel = $('[data-acc-panel]', item);
        const btn   = $('.acc-btn', item);
        if (!panel) return;
        item.setAttribute('data-open', '');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        panel.style.height = panel.scrollHeight + 'px';
        panel.addEventListener('transitionend', function te(ev) {
          if (ev.propertyName === 'height' && item.hasAttribute('data-open')) {
            panel.style.height = 'auto';
            panel.removeEventListener('transitionend', te);
          }
        });
      }

      // init
      items.forEach(item => {
        const panel = $('[data-acc-panel]', item);
        if (!panel) return;
        if (!item.hasAttribute('data-open')) panel.style.height = '0px';
        else panel.style.height = 'auto';
      });

      items.forEach(item => {
        const btn = $('.acc-btn', item);
        if (!btn) return;
        btn.addEventListener('click', () => {
          const isOpen = item.hasAttribute('data-open');
          items.forEach(it => { if (it !== item && it.hasAttribute('data-open')) close(it); });
          isOpen ? close(item) : open(item);
        });
      });
    });
  }

  // ── BURGER / DRAWER ───────────────────────────────────────────
  function initBurger() {
    const burger = $('[data-burger]');
    const drawer = $('[data-drawer]');
    if (!burger) return;

    burger.addEventListener('click', e => {
      e.stopPropagation();
      document.body.classList.toggle('menu-open');
    });
    document.addEventListener('click', e => {
      if (!document.body.classList.contains('menu-open')) return;
      if (!e.target.closest('[data-burger]') && !e.target.closest('[data-drawer]')) {
        document.body.classList.remove('menu-open');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.body.classList.remove('menu-open');
    });
    if (drawer) {
      drawer.addEventListener('click', e => {
        if (e.target.closest('a')) document.body.classList.remove('menu-open');
      });
    }
  }

  // ── SMOOTH HASH SCROLL ────────────────────────────────────────
  function initHashScroll() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      const hh = (document.querySelector('.header') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height;
      const top = window.scrollY + target.getBoundingClientRect().top - hh - 16;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', href);
    });
  }

  // ── FOOTER YEAR ───────────────────────────────────────────────
  function setYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ── CONTACT FORM ──────────────────────────────────────────────
  function initForm() {
    const form = $('[data-contact-form]');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const name    = String(fd.get('name') || '').trim();
      const contact = String(fd.get('contact') || '').trim();
      const msg     = String(fd.get('message') || '').trim();
      const subj = encodeURIComponent(`Заявка INDIVIDNI — ${name || 'без имени'}`);
      const body = encodeURIComponent(`Имя: ${name}\nКонтакт: ${contact}\n\nЗадача:\n${msg}\n\n— с сайта`);
      window.location.href = `mailto:hello@individnistudio.ru?subject=${subj}&body=${body}`;
      form.reset();
    });
  }

  // ── PAGE STINGER ──────────────────────────────────────────────
  function initStinger() {
    const stinger = $('[data-stinger].page-stinger') || $('.page-stinger');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('click', e => {
      const a = e.target.closest('a[data-stinger]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (/^https?:\/\//i.test(href)) return;
      e.preventDefault();

      if (!stinger || reduced) { window.location.href = href; return; }
      stinger.classList.add('is-active');
      setTimeout(() => { window.location.href = href; }, 240);
    });
  }

  // ── HEADER HEIGHT CSS VAR ─────────────────────────────────────
  function initHeaderH() {
    const header = $('.header');
    if (!header) return;
    const set = () => {
      document.documentElement.style.setProperty('--headerH', Math.round(header.getBoundingClientRect().height) + 'px');
    };
    set();
    window.addEventListener('resize', set, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(set).observe(header);
  }

  // ── SHOWREEL VIDEO SCROLL ─────────────────────────────────────
  function initShowreelVideo() {
    const section = $('[data-sr-demo]');
    if (!section) return;
    const video = $('[data-sr-video]', section);
    const btn   = $('[data-sr-sound]', section);
    if (!video || !btn) return;
    video.muted = true;

    function syncBtn() {
      const on = !video.muted;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
    }
    btn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (video.paused) video.play().catch(() => {});
      syncBtn();
    });
    syncBtn();

    let raf = null;
    function update() {
      raf = null;
      const r = section.getBoundingClientRect();
      const mid = window.innerHeight * 0.5;
      if (r.top < mid && r.bottom > mid) video.play().catch(() => {});
      else video.pause();
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  // ── TYPED HERO ────────────────────────────────────────────────
  function initTyped() {
    const el = document.getElementById('heroTyped');
    if (!el) return;
    const phrases = [
      'Подкаст под ключ','Имиджевый ролик','Реклама',
      'Видео-отчет о мероприятии','Многокамерная трансляция',
      'Монтаж','AI проекты','Фото проекты',
    ];
    let p = 0, i = 0, del = false;
    const TYPE = 42, DEL = 26, HOLD = 900, EMPTY = 240;
    function tick() {
      const s = phrases[p];
      if (!del) {
        i = Math.min(i + 1, s.length);
        el.textContent = s.slice(0, i);
        if (i === s.length) { del = true; return setTimeout(tick, HOLD); }
        return setTimeout(tick, TYPE);
      } else {
        i = Math.max(i - 1, 0);
        el.textContent = s.slice(0, i);
        if (i === 0) { del = false; p = (p + 1) % phrases.length; return setTimeout(tick, EMPTY); }
        return setTimeout(tick, DEL);
      }
    }
    tick();
  }

  // ── SHOWREEL BTN ──────────────────────────────────────────────
  function initShowreelBtn() {
    const btn   = document.getElementById('btnShowreel');
    const video = document.getElementById('tvHeroVideo');
    if (!btn || !video) return;
    btn.addEventListener('click', async () => {
      try { video.muted = false; video.volume = 1; await video.play(); } catch (e) {}
    });
  }

  // ── COUNT-UP ──────────────────────────────────────────────────
  function initCountUp() {
    const stats = $$('#numbers .num-card');
    if (!stats.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const numEl = e.target.querySelector('.num');
        if (!numEl || e.target.dataset.counted) return;
        e.target.dataset.counted = '1';
        const raw = numEl.textContent.trim();
        const numeric = parseFloat(raw);
        if (!isFinite(numeric)) return;
        const suffix = raw.replace(/[\d.]/g, '');
        const dur = 900, t0 = performance.now();
        const step = t => {
          const progress = Math.min(1, (t - t0) / dur);
          const v = Math.round(numeric * (1 - Math.pow(1 - progress, 3)));
          numEl.textContent = `${v}${suffix}`;
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    stats.forEach(s => io.observe(s));
  }

  // ── CABLE DRAW ANIMATION ON SCROLL ───────────────────────────
  function initCableDraw() {
    const cables = $$('.ind-cable');
    if (!cables.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });

    cables.forEach(c => {
      c.style.opacity = '0';
      c.style.transition = 'opacity .5s ease';
      io.observe(c);
    });

    // Add visible style
    const style = document.createElement('style');
    style.textContent = '.ind-cable.is-visible { opacity: 1 !important; }';
    document.head.appendChild(style);
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    initHeaderH();
    buildLabels();
    buildScrollBand();
    insertCables();
    buildStickers();
    initStickerParallax();
    initReveal();
    initCableDraw();
    initProcessPreview();
    initAccordions();
    initBurger();
    initHashScroll();
    setYear();
    initForm();
    initStinger();
    initShowreelVideo();
    initTyped();
    initShowreelBtn();
    initCountUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
