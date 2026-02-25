(() => {
  const svg = document.getElementById("mainSVG");
  const container = document.getElementById("container");
  const detailsRoot = document.getElementById("capDetails");

  if (!svg || !container || !detailsRoot) return;

  // 1) Тексты под каждую карточку (ключ = label на карточке)
  //    Поменяй desc/href под свои услуги.
  const DATA = {
    "Commercials": { desc: "Описание услуги.", href: "#contact" },
    "Brand Films": { desc: "Описание услуги.", href: "#contact" },
    "Music Videos": { desc: "Описание услуги.", href: "#contact" },
    "Fashion": { desc: "Описание услуги.", href: "#contact" },
    "CGI / VFX": { desc: "Описание услуги.", href: "#contact" },
    "Color": { desc: "Описание услуги.", href: "#contact" },
    "Sound": { desc: "Описание услуги.", href: "#contact" },
    "Motion": { desc: "Описание услуги.", href: "#contact" },
    "Web": { desc: "Описание услуги.", href: "#contact" },
    "Direction": { desc: "Описание услуги.", href: "#contact" },
  };

  let openDetail = null;

  function closeAll() {
    detailsRoot.querySelectorAll(".cap-item-detail.is-open")
      .forEach(el => el.classList.remove("is-open"));
    openDetail = null;
  }

  function openOne(detailEl) {
    if (openDetail && openDetail !== detailEl) openDetail.classList.remove("is-open");

    const willOpen = !detailEl.classList.contains("is-open");
    closeAll();

    if (willOpen) {
      detailEl.classList.add("is-open");
      openDetail = detailEl;
    }
  }

  // Ждём пока capabilities_tabs.js создаст карточки
  let tries = 0;
  function init() {
    const tabs = Array.from(container.querySelectorAll(".colorTab"));
    if (!tabs.length && tries < 30) {
      tries++;
      requestAnimationFrame(init);
      return;
    }
    if (!tabs.length) return;

    detailsRoot.innerHTML = "";
    const map = new Map(); // tab -> detail

    tabs.forEach((tab, idx) => {
      const label = tab.querySelector("text")?.textContent?.trim() || `Item ${idx + 1}`;
      const color = tab.querySelector("rect")?.getAttribute("fill") || "#000";

      const item = DATA[label] || { desc: "Описание добавим позже.", href: "#contact" };

      const detail = document.createElement("div");
      detail.className = "cap-item-detail";
      detail.dataset.capKey = label;
      detail.style.setProperty("--capColor", color);

      detail.innerHTML = `
        <div class="cap-item-detail__inner">
          <div class="cap-item-detail__top">
            <h3 class="cap-item-detail__title">${label}</h3>
            <button class="cap-item-detail__close" type="button" aria-label="Close">×</button>
          </div>
          <p class="cap-item-detail__desc">${item.desc}</p>
          <a class="cap-item-detail__btn" href="${item.href}">Подробнее</a>
        </div>
      `;

      // close button
      detail.querySelector(".cap-item-detail__close")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          closeAll();
        });

      detailsRoot.appendChild(detail);
      map.set(tab, detail);
    });

    // Click on card -> open its own detail (one at a time)
    svg.addEventListener("click", (e) => {
      const tab = e.target.closest(".colorTab");
      if (!tab || !container.contains(tab)) return;
      const detailEl = map.get(tab);
      if (!detailEl) return;
      openOne(detailEl);
    });

    // Auto-open first when section enters viewport (once)
    const section = detailsRoot.closest("section");
    let autoOpened = false;

    if (section) {
      const firstDetail = detailsRoot.querySelector(".cap-item-detail");
      const io = new IntersectionObserver((entries) => {
        if (autoOpened) return;
        if (!entries.some(en => en.isIntersecting)) return;
        if (openDetail) { autoOpened = true; io.disconnect(); return; }

        firstDetail.classList.add("is-open");
        openDetail = firstDetail;

        autoOpened = true;
        io.disconnect();
      }, { threshold: 0.35 });

      io.observe(section);
    }
  }

  init();
})();
