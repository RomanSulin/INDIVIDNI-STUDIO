(() => {
  const nav = document.querySelector('nav');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navDrawer = document.querySelector('[data-nav-drawer]');

  const closeNav = () => nav?.classList.remove('is-open');
  navToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    nav?.classList.toggle('is-open');
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('nav')) closeNav();
  });
  navDrawer?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
  });

  const wall = document.querySelector('[data-photo-wall]');
  const hoverLayer = document.querySelector('[data-photo-hover-layer]');
  const showcase = document.querySelector('.photo-showcase');
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const photoSources = Array.from({ length: 20 }, (_, index) => `../assets/services/photo-wall/${String(index + 1).padStart(2, '0')}.jpg`);

  const fallbackSvg = (label, viewBox = '900 1200') => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#222"/>
          <stop offset="100%" stop-color="#0a0a0a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="#fff" fill-opacity="0.72"
        font-family="Arial, Helvetica, sans-serif"
        font-size="54" letter-spacing="12">${label}</text>
    </svg>
  `)}`;

  const desktopRows = [
    {
      top: '10%',
      duration: '214s',
      cards: [
        { src: 0, width: '198px', ratio: '3 / 4' },
        { src: 1, width: '264px', ratio: '4 / 3' },
        { src: 2, width: '198px', ratio: '3 / 4' },
        { src: 3, width: '264px', ratio: '4 / 3' },
        { src: 4, width: '198px', ratio: '3 / 4' }
      ]
    },
    {
      top: '31%',
      duration: '208s',
      cards: [
        { src: 5, width: '264px', ratio: '4 / 3' },
        { src: 6, width: '198px', ratio: '3 / 4' },
        { src: 7, width: '264px', ratio: '4 / 3' },
        { src: 8, width: '198px', ratio: '3 / 4' },
        { src: 9, width: '264px', ratio: '4 / 3' }
      ]
    },
    {
      top: '53%',
      duration: '216s',
      cards: [
        { src: 10, width: '198px', ratio: '3 / 4' },
        { src: 11, width: '264px', ratio: '4 / 3' },
        { src: 12, width: '198px', ratio: '3 / 4' },
        { src: 13, width: '264px', ratio: '4 / 3' },
        { src: 14, width: '198px', ratio: '3 / 4' }
      ]
    },
    {
      top: '74%',
      duration: '210s',
      cards: [
        { src: 15, width: '264px', ratio: '4 / 3' },
        { src: 16, width: '198px', ratio: '3 / 4' },
        { src: 17, width: '264px', ratio: '4 / 3' },
        { src: 18, width: '198px', ratio: '3 / 4' },
        { src: 19, width: '264px', ratio: '4 / 3' }
      ]
    }
  ];

  const mobileRows = [
    {
      top: '11%',
      duration: '188s',
      cards: [
        { src: 0, width: '148px', ratio: '3 / 4' },
        { src: 1, width: '198px', ratio: '4 / 3' },
        { src: 2, width: '148px', ratio: '3 / 4' },
        { src: 3, width: '198px', ratio: '4 / 3' },
        { src: 4, width: '148px', ratio: '3 / 4' }
      ]
    },
    {
      top: '36%',
      duration: '182s',
      cards: [
        { src: 5, width: '198px', ratio: '4 / 3' },
        { src: 6, width: '148px', ratio: '3 / 4' },
        { src: 7, width: '198px', ratio: '4 / 3' },
        { src: 8, width: '148px', ratio: '3 / 4' },
        { src: 9, width: '198px', ratio: '4 / 3' }
      ]
    },
    {
      top: '61%',
      duration: '186s',
      cards: [
        { src: 10, width: '148px', ratio: '3 / 4' },
        { src: 11, width: '198px', ratio: '4 / 3' },
        { src: 12, width: '148px', ratio: '3 / 4' },
        { src: 13, width: '198px', ratio: '4 / 3' },
        { src: 14, width: '148px', ratio: '3 / 4' }
      ]
    },
    {
      top: '84%',
      duration: '180s',
      cards: [
        { src: 15, width: '198px', ratio: '4 / 3' },
        { src: 16, width: '148px', ratio: '3 / 4' },
        { src: 17, width: '198px', ratio: '4 / 3' },
        { src: 18, width: '148px', ratio: '3 / 4' },
        { src: 19, width: '198px', ratio: '4 / 3' }
      ]
    }
  ];

  let hoverClone = null;
  let hoverSource = null;
  let hoverFrame = 0;

  const clearHoverClone = () => {
    if (hoverFrame) {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = 0;
    }
    if (hoverSource) {
      hoverSource.classList.remove('is-overlay-source');
      hoverSource = null;
    }
    if (hoverClone) {
      hoverClone.remove();
      hoverClone = null;
    }
  };

  const syncHoverClone = () => {
    if (!hoverSource || !hoverClone || !showcase) return;

    const sourceRect = hoverSource.getBoundingClientRect();
    const showcaseRect = showcase.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const cardCenterX = sourceRect.left + sourceRect.width / 2;
    const cardCenterY = sourceRect.top + sourceRect.height / 2;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const shiftX = clamp((centerX - cardCenterX) * 0.06, -44, 44);
    const shiftY = clamp((centerY - cardCenterY) * 0.03, -18, 18);

    hoverClone.style.width = `${sourceRect.width}px`;
    hoverClone.style.height = `${sourceRect.height}px`;
    hoverClone.style.transform = `translate3d(${(sourceRect.left - showcaseRect.left + shiftX).toFixed(2)}px, ${(sourceRect.top - showcaseRect.top + shiftY).toFixed(2)}px, 0) scale(1.09)`;

    hoverFrame = requestAnimationFrame(syncHoverClone);
  };

  const activateHoverClone = (card) => {
    if (isCoarsePointer || !hoverLayer || !showcase) return;
    if (hoverSource === card) return;

    clearHoverClone();
    hoverSource = card;
    hoverSource.classList.add('is-overlay-source');

    const clone = card.cloneNode(true);
    clone.classList.add('photo-card--overlay');
    clone.removeAttribute('tabindex');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    hoverClone = clone;
    hoverLayer.appendChild(clone);
    syncHoverClone();
  };

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

    if (!isCoarsePointer) {
      card.addEventListener('mouseenter', () => activateHoverClone(card));
      card.addEventListener('focusin', () => activateHoverClone(card));
      card.addEventListener('mouseleave', () => clearHoverClone());
      card.addEventListener('focusout', () => {
        window.setTimeout(() => {
          if (!card.contains(document.activeElement)) clearHoverClone();
        }, 10);
      });
    }

    card.appendChild(img);
    return card;
  };

  const buildWall = () => {
    if (!wall) return;
    clearHoverClone();
    const rows = window.innerWidth < 768 ? mobileRows : desktopRows;
    wall.innerHTML = '';

    rows.forEach((row, rowIndex) => {
      const rail = document.createElement('div');
      rail.className = 'photo-rail';
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
    resizeTimer = window.setTimeout(() => {
      buildWall();
      updateMobileSteps();
    }, 140);
  });

  const modal = document.querySelector('[data-photo-brief]');
  const success = document.querySelector('[data-photo-brief-success]');
  const form = document.querySelector('[data-photo-brief-form]');
  const formFoot = document.querySelector('[data-photo-brief-foot]');
  const openers = document.querySelectorAll('[data-photo-brief-open]');
  const closers = document.querySelectorAll('[data-photo-brief-close]');

  const stepEls = [...document.querySelectorAll('[data-photo-step]')];
  const mobileNavEls = [...document.querySelectorAll('[data-photo-mobile-nav]')];
  const stepCurrent = document.querySelector('[data-step-current]');
  const stepTotal = document.querySelector('[data-step-total]');
  const stepTitle = document.querySelector('[data-step-title]');
  const prevBtn = document.querySelector('[data-step-prev]');
  const nextBtn = document.querySelector('[data-step-next]');
  let activeStep = 0;

  const isMobileSteps = () => window.innerWidth < 768;

  const resetFormView = () => {
    if (!form) return;
    form.hidden = false;
    if (success) success.hidden = true;
    activeStep = 0;
    updateMobileSteps();
  };

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    resetFormView();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.style.overflow = '';
    closeAllSelects();
    closeAllDatePickers();
  };

  openers.forEach((btn) => btn.addEventListener('click', openModal));
  closers.forEach((btn) => btn.addEventListener('click', closeModal));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
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
    const prevBtnDate = picker.querySelector('[data-date-prev]');
    const nextBtnDate = picker.querySelector('[data-date-next]');

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

    prevBtnDate?.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });

    nextBtnDate?.addEventListener('click', () => {
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

  const validateStep = (stepIndex) => {
    if (!form) return true;
    const activeStepEl = stepEls[stepIndex];
    if (!activeStepEl) return true;
    const stepRequiredFields = [...activeStepEl.querySelectorAll('input[required], textarea[required]')];
    let hasError = false;
    stepRequiredFields.forEach((field) => {
      const isEmpty = !String(field.value || '').trim();
      setFieldError(field, isEmpty);
      if (isEmpty) hasError = true;
    });
    return !hasError;
  };

  const updateMobileSteps = () => {
    const mobileMode = isMobileSteps();
    mobileNavEls.forEach((el) => {
      el.hidden = !mobileMode;
    });

    if (!mobileMode) {
      stepEls.forEach((step) => step.classList.remove('is-active'));
      formFoot?.classList.remove('is-active');
      return;
    }

    stepEls.forEach((step, index) => {
      step.classList.toggle('is-active', index === activeStep);
    });

    const activeEl = stepEls[activeStep];
    if (stepCurrent) stepCurrent.textContent = String(activeStep + 1);
    if (stepTotal) stepTotal.textContent = String(stepEls.length);
    if (stepTitle) stepTitle.textContent = activeEl?.dataset.stepTitleText || '';
    if (prevBtn) prevBtn.hidden = activeStep === 0;
    if (nextBtn) nextBtn.hidden = activeStep === stepEls.length - 1;
    if (formFoot) formFoot.classList.toggle('is-active', activeStep === stepEls.length - 1);

    const dialog = document.querySelector('.photo-brief__dialog');
    dialog?.scrollTo({ top: 0, behavior: 'auto' });
  };

  prevBtn?.addEventListener('click', () => {
    if (activeStep > 0) {
      activeStep -= 1;
      updateMobileSteps();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (!validateStep(activeStep)) return;
    if (activeStep < stepEls.length - 1) {
      activeStep += 1;
      updateMobileSteps();
    }
  });

  updateMobileSteps();

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isMobileSteps() && !validateStep(activeStep)) return;

    const formData = new FormData(form);
    const payload = {
      type: 'photo_brief',
      service: 'photography',
      source: 'service-fotografiya-lyubogo-formata',
      shootFormat: String(formData.get('shootFormat') || '').trim(),
      shootDate: String(formData.get('shootDate') || '').trim(),
      locationType: String(formData.get('locationType') || '').trim(),
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
      const isEmpty = !String(field?.value || '').trim();
      setFieldError(field, isEmpty);
      if (isEmpty) hasError = true;
    });

    if (hasError) {
      if (isMobileSteps()) {
        const firstInvalidStep = stepEls.findIndex((step) =>
          [...step.querySelectorAll('input[required], textarea[required]')].some((field) => !String(field.value || '').trim())
        );
        if (firstInvalidStep >= 0) {
          activeStep = firstInvalidStep;
          updateMobileSteps();
        }
      }
      return;
    }

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
