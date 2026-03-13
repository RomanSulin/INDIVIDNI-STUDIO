(() => {
  const wall = document.querySelector('[data-photo-wall]');
  const root = document.querySelector('.photo-showcase');

  const fallbackSvg = (label, ratio = '900 1200') => {
    const [vw, vh] = ratio.split(' ');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#2d2d31"/>
            <stop offset="100%" stop-color="#0c0c0f"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <circle cx="22%" cy="18%" r="16%" fill="rgba(255,255,255,.08)"/>
        <circle cx="80%" cy="76%" r="22%" fill="rgba(255,255,255,.05)"/>
        <text x="8%" y="88%" fill="rgba(255,255,255,.48)" font-size="72" font-family="Arial, Helvetica, sans-serif" letter-spacing="8">${label}</text>
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

  const desktopRows = [
    {
      top: '9%', duration: '238s', reverse: false,
      cards: [
        { src: 0, width: '300px', ratio: '4 / 3' },
        { src: 1, width: '250px', ratio: '3 / 4' },
        { src: 2, width: '288px', ratio: '4 / 3' },
        { src: 3, width: '250px', ratio: '3 / 4' },
        { src: 4, width: '296px', ratio: '4 / 3' },
        { src: 5, width: '255px', ratio: '3 / 4' },
        { src: 6, width: '282px', ratio: '4 / 3' }
      ]
    },
    {
      top: '28%', duration: '224s', reverse: true,
      cards: [
        { src: 7, width: '246px', ratio: '3 / 4' },
        { src: 8, width: '284px', ratio: '4 / 3' },
        { src: 9, width: '252px', ratio: '3 / 4' },
        { src: 10, width: '298px', ratio: '4 / 3' },
        { src: 11, width: '248px', ratio: '3 / 4' },
        { src: 12, width: '288px', ratio: '4 / 3' },
        { src: 13, width: '252px', ratio: '3 / 4' }
      ]
    },
    {
      top: '56%', duration: '246s', reverse: false,
      cards: [
        { src: 2, width: '258px', ratio: '3 / 4' },
        { src: 4, width: '304px', ratio: '4 / 3' },
        { src: 6, width: '248px', ratio: '3 / 4' },
        { src: 8, width: '286px', ratio: '4 / 3' },
        { src: 10, width: '256px', ratio: '3 / 4' },
        { src: 12, width: '296px', ratio: '4 / 3' },
        { src: 1, width: '250px', ratio: '3 / 4' }
      ]
    },
    {
      top: '79%', duration: '232s', reverse: true,
      cards: [
        { src: 5, width: '294px', ratio: '4 / 3' },
        { src: 7, width: '246px', ratio: '3 / 4' },
        { src: 9, width: '286px', ratio: '4 / 3' },
        { src: 11, width: '250px', ratio: '3 / 4' },
        { src: 13, width: '292px', ratio: '4 / 3' },
        { src: 0, width: '252px', ratio: '3 / 4' },
        { src: 3, width: '286px', ratio: '4 / 3' }
      ]
    }
  ];

  const mobileRows = [
    {
      top: '11%', duration: '172s', reverse: false,
      cards: [
        { src: 0, width: '160px', ratio: '4 / 3' },
        { src: 1, width: '136px', ratio: '3 / 4' },
        { src: 2, width: '154px', ratio: '4 / 3' },
        { src: 3, width: '136px', ratio: '3 / 4' },
        { src: 4, width: '156px', ratio: '4 / 3' }
      ]
    },
    {
      top: '34%', duration: '166s', reverse: true,
      cards: [
        { src: 5, width: '136px', ratio: '3 / 4' },
        { src: 6, width: '158px', ratio: '4 / 3' },
        { src: 7, width: '136px', ratio: '3 / 4' },
        { src: 8, width: '154px', ratio: '4 / 3' },
        { src: 9, width: '136px', ratio: '3 / 4' }
      ]
    },
    {
      top: '62%', duration: '176s', reverse: false,
      cards: [
        { src: 10, width: '156px', ratio: '4 / 3' },
        { src: 11, width: '136px', ratio: '3 / 4' },
        { src: 12, width: '154px', ratio: '4 / 3' },
        { src: 13, width: '136px', ratio: '3 / 4' },
        { src: 2, width: '156px', ratio: '4 / 3' }
      ]
    },
    {
      top: '84%', duration: '168s', reverse: true,
      cards: [
        { src: 4, width: '136px', ratio: '3 / 4' },
        { src: 6, width: '156px', ratio: '4 / 3' },
        { src: 8, width: '136px', ratio: '3 / 4' },
        { src: 10, width: '154px', ratio: '4 / 3' },
        { src: 12, width: '136px', ratio: '3 / 4' }
      ]
    }
  ];

  const createCard = (cfg, index) => {
    const card = document.createElement('figure');
    card.className = 'photo-card';
    card.style.setProperty('--card-width', cfg.width);
    card.style.setProperty('--card-ratio', cfg.ratio);

    const img = document.createElement('img');
    img.alt = `Фотография ${index + 1}`;
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = photoSources[cfg.src % photoSources.length];
    img.onerror = () => {
      card.classList.add('is-fallback');
      img.onerror = null;
      img.src = fallbackSvg(`PHOTO ${String(index + 1).padStart(2, '0')}`, cfg.ratio.startsWith('4') ? '1200 900' : '900 1200');
    };

    const updateHoverShift = () => {
      const rect = card.getBoundingClientRect();
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const shiftX = (centerX - cardCenterX) * 0.085;
      const shiftY = (centerY - cardCenterY) * 0.04;
      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      card.style.setProperty('--card-shift-x', `${clamp(shiftX, -34, 34).toFixed(1)}px`);
      card.style.setProperty('--card-shift-y', `${clamp(shiftY, -14, 14).toFixed(1)}px`);
    };

    card.addEventListener('mouseenter', () => {
      wall?.classList.add('has-active-hover');
      updateHoverShift();
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--card-shift-x', '0px');
      card.style.setProperty('--card-shift-y', '0px');
      window.setTimeout(() => {
        if (!document.querySelector('.photo-card:hover')) {
          wall?.classList.remove('has-active-hover');
        }
      }, 20);
    });
    card.addEventListener('focusin', () => {
      wall?.classList.add('has-active-hover');
      updateHoverShift();
    });
    card.addEventListener('focusout', () => {
      card.style.setProperty('--card-shift-x', '0px');
      card.style.setProperty('--card-shift-y', '0px');
      wall?.classList.remove('has-active-hover');
    });

    card.appendChild(img);
    return card;
  };

  const buildWall = () => {
    if (!wall) return;
    const rows = window.innerWidth < 768 ? mobileRows : desktopRows;
    wall.innerHTML = '';

    rows.forEach((row, rowIndex) => {
      const rail = document.createElement('div');
      rail.className = `photo-rail${row.reverse ? ' photo-rail--reverse' : ''}`;
      rail.style.setProperty('--rail-top', row.top);
      rail.style.setProperty('--rail-duration', row.duration);

      for (let copy = 0; copy < 2; copy += 1) {
        const group = document.createElement('div');
        group.className = 'photo-rail__group';
        row.cards.forEach((cfg, index) => {
          group.appendChild(createCard(cfg, rowIndex * 10 + index + copy * row.cards.length));
        });
        rail.appendChild(group);
      }

      wall.appendChild(rail);
    });
  };

  buildWall();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(buildWall, 140);
  });

  const modal = document.querySelector('[data-photo-brief]');
  const success = document.querySelector('[data-photo-brief-success]');
  const form = document.querySelector('[data-photo-brief-form]');
  const openers = document.querySelectorAll('[data-photo-brief-open]');
  const closers = document.querySelectorAll('[data-photo-brief-close]');

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  };

  openers.forEach((btn) => btn.addEventListener('click', openModal));
  closers.forEach((btn) => btn.addEventListener('click', closeModal));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
      closeAllSelects();
      closeAllDatePickers();
    }
  });

  const selects = [...document.querySelectorAll('[data-custom-select]')];
  const closeAllSelects = (except = null) => {
    selects.forEach((select) => {
      if (select === except) return;
      select.classList.remove('is-open');
      const menu = select.querySelector('[data-select-menu]');
      if (menu) menu.hidden = true;
    });
  };

  selects.forEach((select) => {
    const trigger = select.querySelector('[data-select-trigger]');
    const hiddenInput = select.querySelector('input[type="hidden"]');
    const valueNode = select.querySelector('[data-select-value]');
    const menu = select.querySelector('[data-select-menu]');
    const options = [...select.querySelectorAll('[data-select-option]')];

    trigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = select.classList.contains('is-open');
      closeAllSelects(select);
      closeAllDatePickers();
      select.classList.toggle('is-open', !isOpen);
      if (menu) menu.hidden = isOpen;
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('value') || option.textContent.trim();
        if (hiddenInput) hiddenInput.value = value;
        if (valueNode) valueNode.textContent = value;
        options.forEach((item) => item.classList.toggle('is-active', item === option));
        select.classList.remove('is-open');
        if (menu) menu.hidden = true;
      });
    });
  });

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const today = new Date();
  const datePickers = [...document.querySelectorAll('[data-date-picker]')];

  const closeAllDatePickers = (except = null) => {
    datePickers.forEach((picker) => {
      if (picker === except) return;
      picker.classList.remove('is-open');
      const popover = picker.querySelector('[data-date-popover]');
      if (popover) popover.hidden = true;
    });
  };

  const formatLocalDate = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const formatISODate = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  datePickers.forEach((picker) => {
    const hiddenInput = picker.querySelector('input[type="hidden"]');
    const trigger = picker.querySelector('[data-date-trigger]');
    const valueNode = picker.querySelector('[data-date-value]');
    const popover = picker.querySelector('[data-date-popover]');
    const monthNode = picker.querySelector('[data-date-month]');
    const grid = picker.querySelector('[data-date-grid]');
    const prevBtn = picker.querySelector('[data-date-prev]');
    const nextBtn = picker.querySelector('[data-date-next]');

    let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDate = null;

    const renderCalendar = () => {
      if (!monthNode || !grid) return;
      monthNode.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
      grid.innerHTML = '';

      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const startDay = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const daysInPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
      const totalCells = 42;

      for (let i = 0; i < totalCells; i += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        let date;

        if (i < startDay) {
          const day = daysInPrevMonth - startDay + i + 1;
          date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
          btn.classList.add('is-muted');
        } else if (i >= startDay + daysInMonth) {
          const day = i - startDay - daysInMonth + 1;
          date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day);
          btn.classList.add('is-muted');
        } else {
          const day = i - startDay + 1;
          date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        }

        btn.textContent = String(date.getDate());
        btn.dataset.value = formatISODate(date);

        if (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        ) {
          btn.classList.add('is-today');
        }

        if (selectedDate && formatISODate(date) === formatISODate(selectedDate)) {
          btn.classList.add('is-selected');
        }

        btn.addEventListener('click', () => {
          selectedDate = date;
          if (hiddenInput) hiddenInput.value = formatISODate(date);
          if (valueNode) valueNode.textContent = formatLocalDate(date);
          renderCalendar();
          picker.classList.remove('is-open');
          if (popover) popover.hidden = true;
        });

        grid.appendChild(btn);
      }
    };

    renderCalendar();

    trigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = picker.classList.contains('is-open');
      closeAllSelects();
      closeAllDatePickers(picker);
      picker.classList.toggle('is-open', !isOpen);
      if (popover) popover.hidden = isOpen;
    });

    prevBtn?.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });

    nextBtn?.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-custom-select]')) closeAllSelects();
    if (!event.target.closest('[data-date-picker]')) closeAllDatePickers();
  });

  const setFieldError = (field, state) => {
    if (!field) return;
    const host = field.closest('.photo-field') || field.closest('[data-custom-select]') || field.closest('[data-date-picker]');
    if (!host) return;
    host.style.boxShadow = state ? '0 0 0 1px rgba(255,95,95,.45)' : '';
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      type: 'photo_brief',
      service: 'photography',
      source: 'service-fotografiya-lyubogo-formata',
      shootFormat: String(formData.get('shootFormat') || '').trim(),
      shootDate: String(formData.get('shootDate') || '').trim(),
      locationType: String(formData.get('locationType') || '').trim(),
      budget: String(formData.get('budget') || '').trim(),
      task: String(formData.get('task') || '').trim(),
      references: String(formData.get('references') || '').trim(),
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim()
    };

    const requiredFields = [
      form.querySelector('input[name="shootFormat"]'),
      form.querySelector('input[name="shootDate"]'),
      form.querySelector('textarea[name="task"]'),
      form.querySelector('input[name="name"]'),
      form.querySelector('input[name="phone"]')
    ];

    let hasError = false;
    requiredFields.forEach((field) => {
      const isEmpty = !field?.value.trim();
      setFieldError(field, isEmpty);
      if (isEmpty) hasError = true;
    });

    if (hasError) return;

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.textContent = 'Отправляем...';
    }

    try {
      if (window.INDIVIDNI_BRIEF_WEBHOOK) {
        await fetch(window.INDIVIDNI_BRIEF_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      form.hidden = true;
      if (success) success.hidden = false;
    } catch (error) {
      console.error(error);
      form.hidden = true;
      if (success) success.hidden = false;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.textContent = 'Отправить заявку';
      }
    }
  });
})();
