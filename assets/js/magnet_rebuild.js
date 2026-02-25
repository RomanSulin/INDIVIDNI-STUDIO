/* Magnet rebuild interactions
   - services tab switch
   - numbers accordion
   - process tabs
   - year
   Does NOT touch HERO TV.
*/

(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // year
  const y = $('#year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Services pill tabs
  const pillBtns = $$('[data-ml-tab]');
  const svcPanels = $$('[data-ml-panel]');
  if (pillBtns.length){
    const setSvc = (key) => {
      pillBtns.forEach(b => b.classList.toggle('is-active', b.dataset.mlTab === key));
      svcPanels.forEach(p => {
        const on = p.dataset.mlPanel === key;
        p.hidden = !on;
      });
    };
    pillBtns.forEach(b => b.addEventListener('click', () => setSvc(b.dataset.mlTab)));
  }

  // Numbers accordion
  const accRoot = $('[data-ml-acc]');
  if (accRoot){
    const btns = $$(':scope .ml-acc__btn', accRoot);
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        if (!panel) return;
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.hidden = isOpen;
      });
    });
  }

  // Process tabs
  const stepTabs = $$('[data-ml-step]');
  const stepViews = $$('[data-ml-stepview]');
  const stepCards = $$('[data-ml-stepcard]');
  if (stepTabs.length){
    const setStep = (key) => {
      stepTabs.forEach(t => {
        const on = t.dataset.mlStep === key;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      stepViews.forEach(v => {
        const on = v.dataset.mlStepview === key;
        v.hidden = !on;
        v.classList.toggle('is-active', on);
      });
      stepCards.forEach(c => {
        const on = c.dataset.mlStepcard === key;
        c.hidden = !on;
        c.classList.toggle('is-active', on);
      });
    };
    stepTabs.forEach(t => t.addEventListener('click', () => setStep(t.dataset.mlStep)));
  }

  // Preserve existing burger/drawer logic if present; if not, add minimal.
  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  if (burger && drawer && !burger.dataset.bound){
    burger.dataset.bound = '1';
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
    });
    $$('.drawer-link', drawer).forEach(a => a.addEventListener('click', () => {
      drawer.classList.remove('is-open');
      burger.classList.remove('is-open');
    }));
  }
})();
