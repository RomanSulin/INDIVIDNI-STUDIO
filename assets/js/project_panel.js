/* Project detail off-canvas panel (works cards -> slide-in page)
   - does NOT touch tv_showreel.js
   - requires liquid.js loaded (LiquidApp class)
*/
(() => {
  const panel = document.getElementById("projectPanel");
  const sheet = document.getElementById("projectPanelSheet");
  const track = document.getElementById("projectPanelTrack");

  if (!panel || !sheet || !track) {
    // panel markup not present
    return;
  }

  const els = {
    title: panel.querySelector("[data-pp-title]"),
    desc: panel.querySelector("[data-pp-desc]"),
    services: panel.querySelector("[data-pp-services]"),
    recognitions: panel.querySelector("[data-pp-recognitions]"),
    briefTop: panel.querySelector("[data-pp-brief-top]"),
    briefEnd: panel.querySelector("[data-pp-brief-end]"),
    nextBtn: panel.querySelector("[data-pp-next]"),
  };

  // Demo content for the first work card
  const PROJECTS = {
    porsche: {
      title: "Porsche: Dream Machine",
      desc:
        "Короткий CG‑фильм о мечте и форме. Ниже — структура страницы. Фото/видео заменишь позже реальными ассетами.",
      services: ["Concept", "3D Design", "Motion Design", "Compositing"],
      recognitions: ["Wallpaper*", "Porsche Newsroom", "Litsuit"],
      briefUrl: "#brief",
      nextProject: null,
      slides: [
        { type: "image", label: "ФОТО 01 (позже заменишь src)" },
        { type: "video", label: "ВИДЕО (позже заменишь src)" },
        { type: "image", label: "ФОТО 02 (позже заменишь src)" },
      ],
    },
  };

  let isOpen = false;
  let activeKey = null;

  function lockScroll(lock) {
    document.documentElement.classList.toggle("pp-lock", lock);
    document.body.classList.toggle("pp-lock", lock);
  }

  function ensureLiquid() {
    // Create once, only when panel is visible (so sizes are correct)
    if (sheet.__liquidInstance) return;
    if (!window.LiquidApp) return;

    // LiquidApp appends a canvas to the container.
    // We keep content above it via CSS (z-index).
    sheet.__liquidInstance = new LiquidApp(sheet);
  }

  function setList(root, items) {
    if (!root) return;
    root.innerHTML = "";
    (items || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      root.appendChild(li);
    });
  }

  function buildSlides(project) {
    // Keep first slide (intro) + last slide (end) always
    const intro = panel.querySelector("[data-pp-slide='intro']");
    const end = panel.querySelector("[data-pp-slide='end']");
    track.innerHTML = "";
    track.appendChild(intro);
    (project.slides || []).forEach((s, idx) => {
      const slide = document.createElement("section");
      slide.className = "pp-slide pp-slide--media";
      slide.setAttribute("data-pp-slide", `m${idx}`);

      const frame = document.createElement("div");
      frame.className = "pp-frame";

      const media = document.createElement("div");
      media.className = "pp-media";

      // Safe placeholders. Replace later with <img> or <video>.
      const badge = document.createElement("div");
      badge.className = "pp-badge";
      badge.textContent = s.type.toUpperCase();

      const txt = document.createElement("div");
      txt.className = "pp-placeholder";
      txt.textContent = s.label || "";

      media.appendChild(badge);
      media.appendChild(txt);
      frame.appendChild(media);
      slide.appendChild(frame);

      track.appendChild(slide);
    });
    track.appendChild(end);
  }

  function openProject(key, fromEl) {
    const project = PROJECTS[key] || PROJECTS.porsche;

    activeKey = key;

    if (els.title) els.title.textContent = project.title || "";
    if (els.desc) els.desc.textContent = project.desc || "";

    setList(els.services, project.services);
    setList(els.recognitions, project.recognitions);

    const briefUrl =
      (fromEl && fromEl.getAttribute("data-brief")) || project.briefUrl || "#brief";

    if (els.briefTop) els.briefTop.setAttribute("href", briefUrl);
    if (els.briefEnd) els.briefEnd.setAttribute("href", briefUrl);

    buildSlides(project);

    panel.classList.add("is-open");
    lockScroll(true);

    // Move focus for accessibility
    panel.setAttribute("aria-hidden", "false");

    // Ensure background after it becomes visible
    requestAnimationFrame(() => {
      ensureLiquid();
      // reset scroll position
      track.scrollTo({ left: 0, top: 0, behavior: "instant" });
    });

    isOpen = true;
  }

  function closeProject() {
    if (!isOpen) return;
    panel.classList.remove("is-open");
    lockScroll(false);
    panel.setAttribute("aria-hidden", "true");
    isOpen = false;
  }

  // Open from works cards
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-pp-close]");
    if (closeBtn) {
      e.preventDefault();
      closeProject();
      return;
    }

    const card = e.target.closest(".work-card[data-project]");
    if (card) {
      e.preventDefault();
      openProject(card.dataset.project, card);
      return;
    }
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProject();
  });

  // Convert vertical wheel to horizontal scroll inside the track (nice UX)
  track.addEventListener(
    "wheel",
    (e) => {
      if (!isOpen) return;
      // only if user is mainly scrolling vertically
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent clicks on the sheet from closing
  sheet.addEventListener("click", (e) => e.stopPropagation());
  panel.addEventListener("click", (e) => {
    // click on backdrop closes
    if (e.target === panel) closeProject();
  });
})();
