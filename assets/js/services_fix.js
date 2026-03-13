/* services_fix.js — quick request submit for /services/ */
(() => {
  const form = document.querySelector('[data-quick-request-form]');
  if (!form) return;

  const submitBtn = document.querySelector('[data-quick-submit]');
  const statusEl = document.querySelector('[data-quick-status]');
  const WEBHOOK = window.INDIVIDNI_BRIEF_WEBHOOK || '';

  const setStatus = (message = '', type = '') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('is-error', 'is-success');
    if (type) statusEl.classList.add(type);
  };

  const buildPayload = () => ({
    type: 'quick_request',
    contact: {
      name: (form.elements.name?.value || '').trim(),
      phone: (form.elements.phone?.value || '').trim()
    },
    sent_at: new Date().toISOString(),
    source: 'individnistudio.ru services quick request',
    page: '/services/'
  });

  const sendPayload = async (payload) => {
    try {
      localStorage.setItem('individni_last_quick_request', JSON.stringify(payload));
    } catch (_) {}

    if (!WEBHOOK) {
      console.info('Quick request payload prepared for Telegram bot:', payload);
      return { ok: true, mode: 'local' };
    }

    const response = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ok: true, mode: 'remote' };
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (form.elements.name?.value || '').trim();
    const phone = (form.elements.phone?.value || '').trim();

    if (!name) {
      setStatus('Укажите имя.', 'is-error');
      form.elements.name?.focus();
      return;
    }

    if (!phone) {
      setStatus('Укажите телефон.', 'is-error');
      form.elements.phone?.focus();
      return;
    }

    const payload = buildPayload();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем...';
    }
    setStatus('');

    try {
      await sendPayload(payload);
      form.reset();
      setStatus('Спасибо! Быстрая заявка отправлена. Скоро с вами свяжется наш продюсер.', 'is-success');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось отправить заявку. Проверьте webhook для Telegram позже.', 'is-error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
      }
    }
  });
})();
