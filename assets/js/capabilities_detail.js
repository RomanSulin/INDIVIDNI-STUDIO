(() => {
  const svg = document.getElementById("mainSVG");
  const container = document.getElementById("container");
  const detailsRoot = document.getElementById("capDetails");

  if (!svg || !container || !detailsRoot) return;

  // Тексты для каждой карточки (ключ = label на карточке)
  const DATA = {
    "Commercials": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Brand Films": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Music Videos": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Fashion": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "CGI / VFX": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Color": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Sound": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Motion": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Web": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
    "Direction": { desc: "Описание услуги. Заполни своим текстом.", href: "#contact" },
  };

  // Собираем все цветные карточки
  const tabs = Array.from(container.querySelectorAll(".colorTab"));

  // Создаём индивидуальный detail-блок для каждой карточки
  const map = new Map(); // tab -> detailEl

  tabs.forEach((tab, idx) => {
    const label = tab.querySelector("text")?.textContent?.trim() || `Item ${idx + 1}`;
    const color = tab.querySelector("rect")?.getAttribute("fill") || "#000";

    tab.dataset.capKey = label;

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

    detailsRoot.appendChild(detail);
    map.set(tab, detail);

    // close button
    detail.querySelector(".cap-item-detail__close")?.addEventListener("click", () => {
      closeAll();
    });
  });

  let openDetail = null;

  function closeAll() {
    detailsRoot.querySelectorAll(".cap-item-detail.is-open").forEach(el => el.classList.remove("is-open"));
    openDetail = null;
  }

  function openOne(detailEl) {
    if (openDetail && openDetail !== detailEl) openDetail.classList.remove("is-open");
    // toggle same
    const willOpen = !detailEl.classList.contains("is-open");
    closeAll();
    if (willOpen) {
      detailEl.classList.add("is-open");
      openDetail = detailEl;
      // прокрутить к блоку деталей (приятно на мобилке)
      detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Клик по карточке
  svg.addEventListener("click", (e) => {
    const tab = e.target.closest(".colorTab");
    if (!tab || !container.contains(tab)) return;

    const detailEl = map.get(tab);
    if (!detailEl) return;

    openOne(detailEl);
  });
})();

