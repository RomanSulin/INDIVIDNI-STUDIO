(() => {
  const form = document.getElementById('briefRequestForm');
  if (!form) return;

  const intro = form.querySelector('[data-brief-intro]');
  const work = form.querySelector('[data-brief-work]');
  const success = form.querySelector('[data-brief-success]');
  const startBtn = form.querySelector('[data-brief-start]');
  const prevBtn = form.querySelector('[data-brief-prev]');
  const nextBtn = form.querySelector('[data-brief-next]');
  const submitBtn = form.querySelector('[data-brief-submit]');
  const mobileSubmitBtn = form.querySelector('[data-brief-mobile-contact] [data-brief-submit-mobile]');
  const resetBtn = form.querySelector('[data-brief-reset]');
  const stepLabel = form.querySelector('[data-brief-step-label]');
  const stepPercent = form.querySelector('[data-brief-step-percent]');
  const progressFill = form.querySelector('[data-brief-progress-fill]');
  const questionEl = form.querySelector('[data-brief-question]');
  const hintEl = form.querySelector('[data-brief-hint]');
  const bodyEl = form.querySelector('[data-brief-body]');
  const packageBadge = document.getElementById('briefPackageBadge');
  const packageValue = document.getElementById('briefPackageValue');
  const packageBadgeMobile = document.getElementById('briefPackageBadgeMobile');
  const packageValueMobile = document.getElementById('briefPackageValueMobile');
  const mobileContact = form.querySelector('[data-brief-mobile-contact]');
  const wizardEl = form.querySelector('[data-brief-wizard]');
  const cardEl = form.querySelector('.brief-card');
  const mobileFlowQuery = window.matchMedia('(max-width: 700px)');

  let isMeasuring = false;
  let resizeTimer = null;

  const TELEGRAM_BRIEF_WEBHOOK = window.INDIVIDNI_BRIEF_WEBHOOK || '';

  const state = {
    step: -1,
    package: '',
    q1: { hasDeadline: '', deadlineDate: '', comment: '' },
    q2: { topic: '' },
    q3: { ideaState: '', ideaText: '' },
    q4: { goals: [], other: '' },
    q5: { placements: [], other: '' },
    q6: { graphics: '', other: '' },
    q7: { locations: [] },
    q8: { references: '' },
    q9: { budget: '' }
  };

  const tariffMap = {
    lite: 'Lite',
    standart: 'Standart',
    individni: 'INDIVIDNI',
    tender: 'Тендер'
  };

  function isMobileFlow() {
    return mobileFlowQuery.matches;
  }

  function getLeadSelectors() {
    return isMobileFlow()
      ? { name: 'client_name_mobile', phone: 'client_phone_mobile', type: 'client_type_mobile' }
      : { name: 'client_name', phone: 'client_phone', type: 'client_type' };
  }

  function getLeadFieldElements(mobile = isMobileFlow()) {
    return mobile
      ? {
          name: form.querySelector('[name="client_name_mobile"]'),
          phone: form.querySelector('[name="client_phone_mobile"]'),
          type: form.querySelectorAll('[name="client_type_mobile"]')
        }
      : {
          name: form.querySelector('[name="client_name"]'),
          phone: form.querySelector('[name="client_phone"]'),
          type: form.querySelectorAll('[name="client_type"]')
        };
  }

  function syncLeadMirror(sourceMobile) {
    const source = getLeadFieldElements(sourceMobile);
    const target = getLeadFieldElements(!sourceMobile);
    if (source.name && target.name) target.name.value = source.name.value;
    if (source.phone && target.phone) target.phone.value = source.phone.value;
    if (source.type.length && target.type.length) {
      const checked = Array.from(source.type).find((item) => item.checked)?.value || '';
      target.type.forEach((item) => { item.checked = item.value === checked; });
      updateClientTypeVisuals();
    }
  }

  function updateClientTypeVisuals() {
    form.querySelectorAll('.brief-kind__option').forEach((option) => {
      const input = option.querySelector('input');
      option.classList.toggle('is-checked', !!input?.checked);
    });
  }

  function updateMobileContactVisibility() {
    if (!mobileContact) return;
    const shouldShow = isMobileFlow() && state.step === steps.length - 1 && !work.hidden && success.hidden;
    mobileContact.hidden = !shouldShow;
    if (mobileSubmitBtn) mobileSubmitBtn.hidden = !shouldShow;
  }

  const steps = [
    {
      id: 'q1',
      question: '1. Есть ли у вас жесткий дедлайн, когда ролик должен быть готов?',
      hint: 'Если дедлайн есть — укажите дату и, при необходимости, оставьте короткий комментарий.',
      render() {
        const has = state.q1.hasDeadline;
        bodyEl.innerHTML = `
          <div class="brief-stack">
            <label class="brief-option">
              <input type="radio" name="q1_hasDeadline" value="Да" ${has === 'Да' ? 'checked' : ''} />
              <span>Да, есть конкретный дедлайн</span>
            </label>
            <label class="brief-option">
              <input type="radio" name="q1_hasDeadline" value="Нет" ${has === 'Нет' ? 'checked' : ''} />
              <span>Нет, пока без жесткой даты</span>
            </label>
          </div>
          <div class="brief-inline brief-inline--2">
            <label class="brief-field">
              <span class="brief-field__label">Дата</span>
              <input type="date" name="q1_deadlineDate" value="${escapeAttr(state.q1.deadlineDate)}" ${has === 'Да' ? '' : 'disabled'} />
            </label>
            <label class="brief-field">
              <span class="brief-field__label">Комментарий</span>
              <input type="text" name="q1_comment" placeholder="Например: к выставке, к запуску, к мероприятию" value="${escapeAttr(state.q1.comment)}" />
            </label>
          </div>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() {
        state.q1.hasDeadline = getCheckedValue('q1_hasDeadline');
        state.q1.deadlineDate = getValue('q1_deadlineDate');
        state.q1.comment = getValue('q1_comment');
      },
      validate() {
        if (!state.q1.hasDeadline) return 'Выберите, есть ли у проекта жесткий дедлайн.';
        if (state.q1.hasDeadline === 'Да' && !state.q1.deadlineDate) return 'Укажите дату дедлайна.';
        return '';
      }
    },
    {
      id: 'q2',
      question: '2. О чем будет видео? *',
      hint: 'Напишите, о компании, товаре, услуге или другой задаче идёт речь.',
      render() {
        bodyEl.innerHTML = `
          <label class="brief-field">
            <span class="brief-field__label">Описание проекта</span>
            <textarea name="q2_topic" placeholder="Например: имиджевый ролик о компании, запуск нового продукта, реклама услуги">${escapeHtml(state.q2.topic)}</textarea>
          </label>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() { state.q2.topic = getValue('q2_topic'); },
      validate() { return state.q2.topic.trim() ? '' : 'Этот вопрос обязательный. Нужна хотя бы короткая суть ролика.'; }
    },
    {
      id: 'q3',
      question: '3. Есть ли у вас креативная рамка / идея для видео?',
      hint: 'Выберите вариант и, если идея уже есть, кратко опишите её.',
      render() {
        const v = state.q3.ideaState;
        bodyEl.innerHTML = `
          <div class="brief-stack">
            <label class="brief-option">
              <input type="radio" name="q3_ideaState" value="Есть идея" ${v === 'Есть идея' ? 'checked' : ''} />
              <span>Да, идея уже есть</span>
            </label>
            <label class="brief-option">
              <input type="radio" name="q3_ideaState" value="Нужно придумать" ${v === 'Нужно придумать' ? 'checked' : ''} />
              <span>Нет, идею нужно придумать с нуля</span>
            </label>
            <label class="brief-option">
              <input type="radio" name="q3_ideaState" value="Есть наброски" ${v === 'Есть наброски' ? 'checked' : ''} />
              <span>Есть только наброски / направление</span>
            </label>
          </div>
          <label class="brief-field">
            <span class="brief-field__label">Комментарий</span>
            <textarea name="q3_ideaText" placeholder="Опишите идею, настроение или референс, если он уже есть">${escapeHtml(state.q3.ideaText)}</textarea>
          </label>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() {
        state.q3.ideaState = getCheckedValue('q3_ideaState');
        state.q3.ideaText = getValue('q3_ideaText');
      },
      validate() { return state.q3.ideaState ? '' : 'Выберите, есть ли уже идея или её нужно разработать.'; }
    },
    {
      id: 'q4',
      question: '4. Какие задачи должен решить видеоролик?',
      hint: 'Можно выбрать несколько вариантов или дописать свой.',
      render() {
        const items = [
          'Мы хотим рассказать о компании (история, факты, люди)',
          'Мы хотим повысить узнаваемость бренда',
          'Мы хотим презентовать новый продукт/услугу',
          'Мы хотим привлечь людей в команду',
          'Мы хотим снять рекламу, чтобы привлечь новых клиентов',
          'Мы хотим обучить персонал',
          'Мы хотим завоевать доверие и повысить лояльность клиентов'
        ];
        bodyEl.innerHTML = `
          <div class="brief-stack">
            ${items.map((item, index) => `
              <label class="brief-check">
                <input type="checkbox" name="q4_goals" value="${escapeAttr(item)}" ${state.q4.goals.includes(item) ? 'checked' : ''} />
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
          <label class="brief-field">
            <span class="brief-field__label">Другое</span>
            <input type="text" name="q4_other" placeholder="Если есть своя задача — напишите её" value="${escapeAttr(state.q4.other)}" />
          </label>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() {
        state.q4.goals = getCheckedValues('q4_goals');
        state.q4.other = getValue('q4_other');
      },
      validate() {
        return state.q4.goals.length || state.q4.other.trim() ? '' : 'Выберите хотя бы одну задачу ролика или напишите свою.';
      }
    },
    {
      id: 'q5',
      question: '5. Где будет размещен ролик? *',
      hint: 'Этот пункт влияет на формат, длину ролика и технические требования. Можно выбрать несколько вариантов.',
      render() {
        const items = [
          'Digital (сайт, социальные сети и т.д.)',
          'ТВ',
          'Презентационный стенд / экраны'
        ];
        bodyEl.innerHTML = `
          <div class="brief-stack">
            ${items.map((item) => `
              <label class="brief-check">
                <input type="checkbox" name="q5_placements" value="${escapeAttr(item)}" ${state.q5.placements.includes(item) ? 'checked' : ''} />
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
          <label class="brief-field">
            <span class="brief-field__label">Другое</span>
            <input type="text" name="q5_other" placeholder="Например: экран на мероприятии, indoor-реклама, YouTube preroll" value="${escapeAttr(state.q5.other)}" />
          </label>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() {
        state.q5.placements = getCheckedValues('q5_placements');
        state.q5.other = getValue('q5_other');
      },
      validate() {
        return state.q5.placements.length || state.q5.other.trim() ? '' : 'Этот вопрос обязательный. Укажите, где будет размещаться ролик.';
      }
    },
    {
      id: 'q6',
      question: '6. Если вы видите использование графики в ролике, какую графику планируете использовать?',
      hint: 'Выберите один основной вариант. Если нужен другой тип графики — опишите его ниже.',
      render() {
        const items = [
          '2д графика / легкие фигуры / абстрация',
          '2д графика / прорисованные персонажи / продуманные детали',
          '3д графика / минимализм',
          '3д графика / реализм, детали',
          'Пока не знаем / нужна консультация'
        ];
        bodyEl.innerHTML = `
          <div class="brief-stack">
            ${items.map((item) => `
              <label class="brief-option">
                <input type="radio" name="q6_graphics" value="${escapeAttr(item)}" ${state.q6.graphics === item ? 'checked' : ''} />
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
          <label class="brief-field">
            <span class="brief-field__label">Другое</span>
            <input type="text" name="q6_other" placeholder="Если нужен другой вариант — укажите" value="${escapeAttr(state.q6.other)}" />
          </label>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() {
        state.q6.graphics = getCheckedValue('q6_graphics');
        state.q6.other = getValue('q6_other');
      },
      validate() {
        return state.q6.graphics || state.q6.other.trim() ? '' : 'Выберите тип графики или оставьте комментарий.';
      }
    },
    {
      id: 'q7',
      question: '7. Какие локации вы представляете в готовом ролике?',
      hint: 'Можно выбрать несколько вариантов — это поможет заранее прикинуть организацию съёмки.',
      render() {
        const items = [
          'Аренда студии',
          'Снимать на нашей локации',
          'Аренда павильона',
          'Съемка на улице'
        ];
        bodyEl.innerHTML = `
          <div class="brief-stack">
            ${items.map((item) => `
              <label class="brief-check">
                <input type="checkbox" name="q7_locations" value="${escapeAttr(item)}" ${state.q7.locations.includes(item) ? 'checked' : ''} />
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() { state.q7.locations = getCheckedValues('q7_locations'); },
      validate() { return state.q7.locations.length ? '' : 'Выберите хотя бы один вариант локации.'; }
    },
    {
      id: 'q8',
      question: '8. На что должно быть похоже видео?',
      hint: 'Оставьте ссылки на понравившиеся ролики и коротко поясните, что именно вам в них нравится: цвет, динамика, композиция, камера, графика и т.д.',
      render() {
        bodyEl.innerHTML = `
          <label class="brief-field">
            <span class="brief-field__label">Ссылки и комментарии</span>
            <textarea name="q8_references" placeholder="Вставьте ссылки и напишите, что именно вам нравится в каждом примере">${escapeHtml(state.q8.references)}</textarea>
          </label>
          <div class="brief-note">Можно просто перечислить ссылки с короткими пометками — этого уже хватит для старта.</div>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() { state.q8.references = getValue('q8_references'); },
      validate() { return ''; }
    },
    {
      id: 'q9',
      question: '9. Укажите планируемый бюджет',
      hint: 'Это важный вопрос: так мы не тратим время на заведомо неподходящие концепции и сразу ищем реалистичное решение под ваш диапазон.',
      render() {
        const items = [
          'от 50 000 р. до 500 000 р.',
          'от 500 000 р. до 1 000 000 р.',
          'от 1 000 000 р. до 5 000 000 р.',
          'Мы еще не решили, нужна консультация'
        ];
        bodyEl.innerHTML = `
          <div class="brief-stack">
            ${items.map((item) => `
              <label class="brief-option">
                <input type="radio" name="q9_budget" value="${escapeAttr(item)}" ${state.q9.budget === item ? 'checked' : ''} />
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
          <div class="brief-note">Без бюджета почти всегда начинается холостая работа и перерасчёт сметы с нуля. Здесь лучше быть прямыми.</div>
          <div class="brief-error" data-brief-error></div>
        `;
      },
      collect() { state.q9.budget = getCheckedValue('q9_budget'); },
      validate() { return state.q9.budget ? '' : 'Выберите бюджетный диапазон или вариант с консультацией.'; }
    }
  ];

  function getValue(name) {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  }

  function getCheckedValue(name) {
    const el = form.querySelector(`[name="${name}"]:checked`);
    return el ? el.value : '';
  }

  function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((el) => el.value);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function setError(message) {
    const errorEl = form.querySelector('[data-brief-error]');
    if (errorEl) errorEl.textContent = message || '';
  }

  function updatePackageBadge(value) {
    state.package = value || state.package;
    if (!state.package) return;
    const label = tariffMap[state.package] || state.package;
    if (packageBadge && packageValue) {
      packageValue.textContent = label;
      packageBadge.hidden = false;
    }
    if (packageBadgeMobile && packageValueMobile) {
      packageValueMobile.textContent = label;
      packageBadgeMobile.hidden = false;
    }
  }

  function renderStep() {
    if (state.step < 0 || state.step >= steps.length) return;
    const step = steps[state.step];
    const percent = Math.round(((state.step + 1) / steps.length) * 100);
    const isLastStep = state.step === steps.length - 1;

    stepLabel.textContent = `Вопрос ${state.step + 1} из ${steps.length}`;
    stepPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    questionEl.textContent = step.question;
    hintEl.textContent = step.hint || '';
    step.render();

    prevBtn.disabled = state.step === 0;
    nextBtn.hidden = isLastStep;
    submitBtn.hidden = !isLastStep || isMobileFlow();
    updateMobileContactVisibility();

    const focusTarget = bodyEl.querySelector('textarea, input:not([type="radio"]):not([type="checkbox"]), [type="date"]');
    if (!isMeasuring && focusTarget) {
      requestAnimationFrame(() => {
        try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
      });
    }
  }

  function goToStep(index) {
    state.step = Math.max(0, Math.min(index, steps.length - 1));
    intro.hidden = true;
    success.hidden = true;
    work.hidden = false;
    updateMobileContactVisibility();
    renderStep();
  }

  function validateStep() {
    const step = steps[state.step];
    step.collect();
    const message = step.validate();
    setError(message);
    return !message;
  }

  function syncDesktopHeights() {
    if (!wizardEl || !cardEl) return;

    if (window.innerWidth <= 980) {
      wizardEl.style.removeProperty('--brief-stable-height');
      wizardEl.style.removeProperty('--brief-card-height');
      return;
    }

    const prevStep = state.step;
    if (prevStep >= 0 && prevStep < steps.length) steps[prevStep].collect();
    const prevIntroHidden = intro.hidden;
    const prevWorkHidden = work.hidden;
    const prevSuccessHidden = success.hidden;

    let maxWorkHeight = 0;
    let maxCardHeight = 0;

    isMeasuring = true;
    intro.hidden = true;
    success.hidden = true;
    work.hidden = false;

    for (let index = 0; index < steps.length; index += 1) {
      state.step = index;
      renderStep();
      maxWorkHeight = Math.max(maxWorkHeight, work.scrollHeight);
      maxCardHeight = Math.max(maxCardHeight, cardEl.scrollHeight);
    }

    const stableHeight = Math.max(760, maxWorkHeight + 8);
    const stableCardHeight = Math.max(520, maxCardHeight + 8);

    wizardEl.style.setProperty('--brief-stable-height', `${stableHeight}px`);
    wizardEl.style.setProperty('--brief-card-height', `${stableCardHeight}px`);

    state.step = prevStep;
    intro.hidden = prevIntroHidden;
    work.hidden = prevWorkHidden;
    success.hidden = prevSuccessHidden;
    isMeasuring = false;

    if (prevStep >= 0 && prevStep < steps.length && !prevWorkHidden) {
      renderStep();
    }
  }

  function validateLeadFields() {
    const fields = getLeadSelectors();
    const name = getValue(fields.name);
    const phone = getValue(fields.phone);
    const clientType = getCheckedValue(fields.type);
    if (!name) return isMobileFlow() ? 'Укажите имя в блоке заявки ниже.' : 'Укажите имя в левой части формы.';
    if (!phone) return isMobileFlow() ? 'Укажите телефон в блоке заявки ниже.' : 'Укажите телефон в левой части формы.';
    if (!clientType) return isMobileFlow() ? 'Выберите: физ лицо или компания в блоке заявки ниже.' : 'Выберите: физ лицо или компания.';
    return '';
  }

  function buildPayload() {
    const fields = getLeadSelectors();
    return {
      contact: {
        name: getValue(fields.name),
        phone: getValue(fields.phone),
        client_type: getCheckedValue(fields.type)
      },
      selected_tariff: state.package ? (tariffMap[state.package] || state.package) : '',
      answers: {
        deadline: state.q1,
        project_topic: state.q2.topic,
        creative_idea: state.q3,
        goals: state.q4,
        placements: state.q5,
        graphics: state.q6,
        locations: state.q7.locations,
        references: state.q8.references,
        budget: state.q9.budget
      },
      sent_at: new Date().toISOString(),
      source: 'individnistudio.ru brief section'
    };
  }

  async function sendPayload(payload) {
    try {
      localStorage.setItem('individni_last_brief_submission', JSON.stringify(payload));
    } catch (_) {}

    if (!TELEGRAM_BRIEF_WEBHOOK) {
      console.info('Brief payload prepared for Telegram bot:', payload);
      return { ok: true, mode: 'local' };
    }

    const response = await fetch(TELEGRAM_BRIEF_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ok: true, mode: 'remote' };
  }

  function showSuccess() {
    work.hidden = true;
    intro.hidden = true;
    success.hidden = false;
    updateMobileContactVisibility();
    success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetWizard() {
    form.reset();
    state.step = -1;
    state.package = '';
    state.q1 = { hasDeadline: '', deadlineDate: '', comment: '' };
    state.q2 = { topic: '' };
    state.q3 = { ideaState: '', ideaText: '' };
    state.q4 = { goals: [], other: '' };
    state.q5 = { placements: [], other: '' };
    state.q6 = { graphics: '', other: '' };
    state.q7 = { locations: [] };
    state.q8 = { references: '' };
    state.q9 = { budget: '' };
    if (packageBadge) packageBadge.hidden = true;
    if (packageBadgeMobile) packageBadgeMobile.hidden = true;
    intro.hidden = false;
    work.hidden = true;
    success.hidden = true;
    updateMobileContactVisibility();
    updateClientTypeVisuals();
    setError('');
  }

  startBtn.addEventListener('click', () => {
    syncDesktopHeights();
    goToStep(0);
  });

  nextBtn.addEventListener('click', () => {
    if (!validateStep()) return;
    goToStep(state.step + 1);
  });

  prevBtn.addEventListener('click', () => {
    if (state.step <= 0) return;
    goToStep(state.step - 1);
  });

  form.addEventListener('change', (event) => {
    const trigger = event.target.closest('[name="q1_hasDeadline"]');
    if (trigger && state.step === 0) {
      steps[0].collect();
      renderStep();
    }
    if (event.target.name === 'client_type' || event.target.name === 'client_type_mobile') {
      syncLeadMirror(event.target.name.endsWith('_mobile'));
      updateClientTypeVisuals();
    }
    if (event.target.name === 'client_name' || event.target.name === 'client_phone') {
      syncLeadMirror(false);
    }
    if (event.target.name === 'client_name_mobile' || event.target.name === 'client_phone_mobile') {
      syncLeadMirror(true);
    }
    if (form.querySelector('[data-brief-error]')?.textContent) validateStep();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.step !== steps.length - 1) return;
    const leadError = validateLeadFields();
    if (leadError) {
      setError(leadError);
      const firstLeadField = form.querySelector(isMobileFlow() ? '[name="client_name_mobile"]' : '[name="client_name"]');
      if (firstLeadField) firstLeadField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!validateStep()) return;

    const payload = buildPayload();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    if (mobileSubmitBtn) {
      mobileSubmitBtn.disabled = true;
      mobileSubmitBtn.textContent = 'Отправляем...';
    }

    try {
      await sendPayload(payload);
      showSuccess();
    } catch (error) {
      console.error(error);
      setError('Форма заполнена, но отправка не сработала. Проверьте webhook для Telegram позже.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
      if (mobileSubmitBtn) {
        mobileSubmitBtn.disabled = false;
        mobileSubmitBtn.textContent = 'Отправить заявку';
      }
    }
  });

  resetBtn.addEventListener('click', resetWizard);

  document.querySelectorAll('[data-brief-package]').forEach((link) => {
    link.addEventListener('click', () => updatePackageBadge(link.dataset.briefPackage));
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      syncDesktopHeights();
      updateMobileContactVisibility();
    }, 120);
  });

  if (typeof mobileFlowQuery.addEventListener === 'function') {
    mobileFlowQuery.addEventListener('change', () => {
      updateMobileContactVisibility();
      updateClientTypeVisuals();
      if (!work.hidden && state.step >= 0) renderStep();
    });
  } else if (typeof mobileFlowQuery.addListener === 'function') {
    mobileFlowQuery.addListener(() => {
      updateMobileContactVisibility();
      updateClientTypeVisuals();
      if (!work.hidden && state.step >= 0) renderStep();
    });
  }

  window.addEventListener('load', () => {
    syncDesktopHeights();
    updateMobileContactVisibility();
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      syncDesktopHeights();
      updateMobileContactVisibility();
    }).catch(() => {});
  }

  if (window.location.hash === '#brief-request') {
    const hashParams = new URLSearchParams(window.location.search);
    const type = hashParams.get('type');
    if (type) updatePackageBadge(type);
  }

  updateClientTypeVisuals();
  syncDesktopHeights();
  updateMobileContactVisibility();
})();
