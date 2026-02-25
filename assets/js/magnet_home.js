(() => {
  // Tabs
  const tabGroups = Array.from(document.querySelectorAll('[data-tabs]'));

  tabGroups.forEach((group) => {
    const name = group.getAttribute('data-tabs');
    if (!name) return;

    const buttons = Array.from(group.querySelectorAll('[data-tab]'));
    const panels = Array.from(document.querySelectorAll(`[data-tab-panel="${name}"]`));
    if (!buttons.length || !panels.length) return;

    const setActive = (key) => {
      buttons.forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === key));
      panels.forEach((p) => {
        const k = p.getAttribute('data-panel');
        p.hidden = k !== key;
      });
    };

    // init: first active or first button
    const initial = (buttons.find((b) => b.classList.contains('is-active')) || buttons[0]).getAttribute('data-tab');
    setActive(initial);

    buttons.forEach((b) => {
      b.addEventListener('click', () => setActive(b.getAttribute('data-tab')));
    });
  });

  // Production thumbs -> preview
  const preview = document.getElementById('mgPreview');
  const thumbs = Array.from(document.querySelectorAll('[data-thumb]'));
  if (preview && thumbs.length) {
    const setThumb = (btn) => {
      thumbs.forEach((t) => t.classList.toggle('is-active', t === btn));
      const src = btn.getAttribute('data-img');
      if (src) preview.src = src;
    };

    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => setThumb(btn));
      btn.addEventListener('mouseenter', () => setThumb(btn));
      btn.addEventListener('focus', () => setThumb(btn));
    });
  }
})();
