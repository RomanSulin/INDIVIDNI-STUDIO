(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const body = document.body;

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Scroll progress
  const progressSpan = $(".progress span");
  if (progressSpan) {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = (window.scrollY / max) * 100;
      progressSpan.style.width = `${Math.min(100, Math.max(0, p))}%`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Mobile menu
  const menuBtn = $("#menuBtn");
  const mobileNav = $("#mobileNav");

  const closeMenu = () => {
    body.classList.remove("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "true");
  };

  const openMenu = () => {
    body.classList.add("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "false");
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const isOpen = body.classList.contains("nav-open");
      isOpen ? closeMenu() : openMenu();
    });
  }

  if (mobileNav) {
    $$("a", mobileNav).forEach((a) => a.addEventListener("click", closeMenu));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!body.classList.contains("nav-open")) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("#mobileNav") || t.closest("#menuBtn")) return;
    closeMenu();
  });

  // Smooth anchors on the same page
  $$("a[href^='#']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      closeMenu();
    });
  });

  // Reveal on scroll (IntersectionObserver)
  const revealEls = $$(".reveal");
  if (!reduce && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("is-inview");
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.14 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-inview"));
  }

  // Magnetic elements
  const initMagnetic = (root = document) => {
    $$(".magnetic", root).forEach((el) => {
      if (el.__magneticBound) return;
      el.__magneticBound = true;

      const strength = Number(el.getAttribute("data-magnet") || "0.18");
      let rect = null;

      el.addEventListener("pointerenter", () => {
        rect = el.getBoundingClientRect();
      });

      el.addEventListener("pointermove", (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });

      el.addEventListener("pointerleave", () => {
        rect = null;
        el.style.transform = "";
      });
    });
  };
  initMagnetic();

  // Custom cursor
  const initCursor = () => {
    const ring = $(".cursor");
    const dot = $(".cursor-dot");

    if (!finePointer || reduce || !ring || !dot) {
      $$(".cursor, .cursor-dot").forEach((el) => el && el.remove());
      return;
    }

    body.classList.add("has-cursor");

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let tx = x;
    let ty = y;

    const setPos = (el, px, py) => {
      el.style.left = px + "px";
      el.style.top = py + "px";
    };

    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        setPos(dot, tx, ty);
      },
      { passive: true }
    );

    const loop = () => {
      x += (tx - x) * 0.13;
      y += (ty - y) * 0.13;
      setPos(ring, x, y);
      requestAnimationFrame(loop);
    };
    loop();

    const hoverSelector = "a, button, .project, .navCard, .magnetic";

    document.addEventListener("pointerover", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(hoverSelector)) body.classList.add("cursor-active");
    });

    document.addEventListener("pointerout", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(hoverSelector)) body.classList.remove("cursor-active");
    });
  };
  initCursor();

  // Canvas background (subtle — closer to lusion vibe)
  const canvas = $("#bg");
  if (canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      let w = 0,
        h = 0;
      let mx = 0,
        my = 0;

      const resize = () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const rand = (min, max) => min + Math.random() * (max - min);

      const baseHues = [92, 190, 280];
      const orbs = Array.from({ length: 6 }, (_, i) => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(Math.min(w, h) * 0.14, Math.min(w, h) * 0.32),
        vx: rand(-0.20, 0.20),
        vy: rand(-0.18, 0.18),
        hue: baseHues[i % baseHues.length] + rand(-10, 10),
        a: rand(0.10, 0.18),
      }));

      resize();
      window.addEventListener("resize", resize, { passive: true });

      window.addEventListener(
        "pointermove",
        (e) => {
          mx = e.clientX;
          my = e.clientY;
        },
        { passive: true }
      );

      const draw = () => {
        ctx.clearRect(0, 0, w, h);

        // vignette
        const vg = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, Math.max(w, h));
        vg.addColorStop(0, "rgba(255,255,255,0.035)");
        vg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = "lighter";

        const px = (mx / Math.max(1, w) - 0.5) * 34;
        const py = (my / Math.max(1, h) - 0.5) * 34;

        for (const o of orbs) {
          o.x += o.vx;
          o.y += o.vy;

          // wrap
          if (o.x < -o.r) o.x = w + o.r;
          if (o.x > w + o.r) o.x = -o.r;
          if (o.y < -o.r) o.y = h + o.r;
          if (o.y > h + o.r) o.y = -o.r;

          const cx = o.x + px * (o.r / 180);
          const cy = o.y + py * (o.r / 180);

          const rg = ctx.createRadialGradient(cx, cy, o.r * 0.18, cx, cy, o.r);
          rg.addColorStop(0, `hsla(${o.hue}, 92%, 60%, ${o.a})`);
          rg.addColorStop(1, `hsla(${o.hue}, 92%, 55%, 0)`);

          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalCompositeOperation = "source-over";
        if (!reduce) requestAnimationFrame(draw);
      };

      draw();
    }
  }

  // Contact form -> mailto (no backend)
  const contactForm = $("#contactForm");
  if (contactForm instanceof HTMLFormElement) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#cfName")?.value?.trim() || "";
      const phone = $("#cfPhone")?.value?.trim() || "";
      const msg = $("#cfMsg")?.value?.trim() || "";

      const subject = encodeURIComponent("Запрос на видеопродакшн — INDIVIDNI");
      const bodyText = encodeURIComponent(
        [
          "Здравствуйте!",
          "",
          name ? `Имя: ${name}` : null,
          phone ? `Контакт: ${phone}` : null,
          "",
          msg ? `Сообщение:\n${msg}` : "Сообщение:\n—",
          "",
          "(Отправлено с сайта INDIVIDNI Studio)",
        ]
          .filter(Boolean)
          .join("\n")
      );

      // поменяй почту на свою
      window.location.href = `mailto:hello@individni.studio?subject=${subject}&body=${bodyText}`;
    });
  }

  // Case page data + render
  const CASES = {
    aurora: {
      kicker: "Branded film / Commercial",
      title: "AURORA",
      subtitle:
        "Бренд‑фильм с акцентом на ощущение продукта: свет, фактуры, ритм. В комплекте — нарезки для соцсетей и YouTube.",
      cover: "https://picsum.photos/seed/individni-aurora-cover/1600/900",
      tags: ["BRANDED FILM", "ADVERTISING", "POST"],
      info: {
        client: "Бренд (placeholder)",
        year: "2025",
        format: "60s + cutdowns",
        deliverables: "16:9 / 9:16 / 1:1",
        pipeline: "RAW → COLOR → SOUND",
      },
      sections: [
        {
          title: "Задача",
          text:
            "Сделать короткий фильм, который не просто показывает продукт, а объясняет его ценность через атмосферу. Параллельно — подготовить пакет адаптаций под соцсети.",
        },
        {
          title: "Решение",
          text:
            "Собрали команду под задачу (режиссёр, оператор, монтаж, color, sound), выстроили пайплайн и сняли материал с запасом под ресайзы. На монтаже сделали 3 темпа: медленный, средний, динамичный — чтобы выбрать правильный ритм.",
        },
        {
          title: "Результат",
          text:
            "Готовый мастер‑ролик + набор нарезок, превью и титры. Проект легко масштабируется: можно добавить новые сцены/версии без пересборки стиля.",
        },
      ],
      gallery: [
        "https://picsum.photos/seed/individni-aurora-1/1400/900",
        "https://picsum.photos/seed/individni-aurora-2/1400/900",
        "https://picsum.photos/seed/individni-aurora-3/1400/900",
        "https://picsum.photos/seed/individni-aurora-4/1400/900",
      ],
      next: "forum",
      prev: "nightdrive",
    },

    forum: {
      kicker: "Live / Multicam",
      title: "NOVA FORUM",
      subtitle:
        "Многокамерная трансляция + aftermovie. Фокус на чистом звуке, стабильной картинке и быстрой выдаче материалов после события.",
      cover: "https://picsum.photos/seed/individni-forum-cover/1600/900",
      tags: ["LIVE", "MULTICAM", "EVENT"],
      info: {
        client: "Организатор (placeholder)",
        year: "2025",
        format: "LIVE + AFTERMOVIE",
        deliverables: "STREAM / HIGHLIGHTS",
        pipeline: "SETUP → LIVE → EDIT",
      },
      sections: [
        {
          title: "Задача",
          text:
            "Организовать прямой эфир без сюрпризов: мультикам, резервирование, синхронизация звука и выдача коротких клипов уже в день мероприятия.",
        },
        {
          title: "Решение",
          text:
            "Подготовили схему камер, света и звука, собрали режиссёрскую и тех‑команду, сделали тест‑прогон. Во время события вели запись в мастер‑качестве параллельно со стримом.",
        },
        {
          title: "Результат",
          text:
            "Трансляция + короткие highlights, aftermovie и архив с материалами по спикерам. Форматы собраны под площадки и соцсети.",
        },
      ],
      gallery: [
        "https://picsum.photos/seed/individni-forum-1/1400/900",
        "https://picsum.photos/seed/individni-forum-2/1400/900",
        "https://picsum.photos/seed/individni-forum-3/1400/900",
        "https://picsum.photos/seed/individni-forum-4/1400/900",
      ],
      next: "nightdrive",
      prev: "aurora",
    },

    nightdrive: {
      kicker: "Music video / Art",
      title: "NIGHT DRIVE",
      subtitle:
        "Музыкальный клип в монохромной эстетике: движение камеры, свет, контраст, минималистичная графика. Плюс тизеры и BTS‑нарезки.",
      cover: "https://picsum.photos/seed/individni-night-cover/1600/900",
      tags: ["MUSIC VIDEO", "ART", "MOTION"],
      info: {
        client: "Артист (placeholder)",
        year: "2025",
        format: "CLIP + TEASERS",
        deliverables: "16:9 / 9:16",
        pipeline: "EDIT → COLOR → VFX",
      },
      sections: [
        {
          title: "Задача",
          text:
            "Сделать клип, который ощущается как цельный арт‑объект: без перегруза, с ясной режиссурой и сильным световым рисунком.",
        },
        {
          title: "Решение",
          text:
            "Собрали moodboard и раскадровку, сняли сцены блоками под один сетап света, затем собрали монтаж под музыку и добавили минимальную типографику, чтобы усилить ритм.",
        },
        {
          title: "Результат",
          text:
            "Готовый клип + вертикальные тизеры и короткие версии под Reels/TikTok. Отдельно — набор кадров для обложек и анонсов.",
        },
      ],
      gallery: [
        "https://picsum.photos/seed/individni-night-1/1400/900",
        "https://picsum.photos/seed/individni-night-2/1400/900",
        "https://picsum.photos/seed/individni-night-3/1400/900",
        "https://picsum.photos/seed/individni-night-4/1400/900",
      ],
      next: "aurora",
      prev: "forum",
    },
  };

  const renderCase = () => {
    if (body.getAttribute("data-page") !== "case") return;

    const params = new URLSearchParams(window.location.search);
    const slug = (params.get("slug") || "aurora").toLowerCase();
    const data = CASES[slug] || CASES.aurora;

    // Update title
    document.title = `${data.title} — INDIVIDNI Studio`;

    const cover = $("#caseCover");
    const title = $("#caseTitle");
    const sub = $("#caseSub");
    const kicker = $("#caseKicker");
    const tags = $("#caseTags");

    if (cover instanceof HTMLImageElement) cover.src = data.cover;
    if (title) title.textContent = data.title;
    if (sub) sub.textContent = data.subtitle;
    if (kicker) kicker.textContent = data.kicker;

    if (tags) {
      tags.innerHTML = data.tags.map((t) => `<span class="tag">${t}</span>`).join("");
    }

    // Info panel
    const infoBody = $("#caseInfoBody");
    const infoTags = $("#caseInfoTags");

    const infoRows = [
      ["Клиент", data.info.client],
      ["Год", data.info.year],
      ["Формат", data.info.format],
      ["Материалы", data.info.deliverables],
      ["Пайплайн", data.info.pipeline],
    ];

    const rowsHtml = infoRows
      .map(
        ([k, v]) =>
          `<div class="infoRow"><div class="k">${k}</div><div class="v">${v}</div></div>`
      )
      .join("");

    if (infoBody) {
      infoBody.innerHTML = `
        ${rowsHtml}
        <div style="margin-top:14px; display:grid; gap:10px;">
          <a class="btn btn--primary magnetic" data-magnet="0.20" href="contact.html"><span>Обсудить похожий проект</span></a>
          <a class="btn magnetic" data-magnet="0.20" href="projects.html"><span>Все кейсы</span></a>
        </div>
      `;
    }

    if (infoTags) {
      infoTags.innerHTML = data.tags.map((t) => `<span class="tag">${t}</span>`).join("");
    }

    // Main content
    const main = $("#caseMain");
    if (main) {
      const sectionsHtml = data.sections
        .map(
          (s) => `
            <article class="panel reveal">
              <h2 class="h3">${s.title}</h2>
              <p style="margin-top:10px;">${s.text}</p>
            </article>
          `
        )
        .join("");

      const galleryHtml = `
        <section class="panel reveal">
          <h2 class="h3">Галерея</h2>
          <p class="muted" style="margin-top:10px;">Плейсхолдеры. Заменим на твои кадры/стиллы.</p>
          <div class="gallery" style="margin-top:14px;">
            ${data.gallery.map((src) => `<img src="${src}" alt="Кадр из проекта ${data.title}" loading="lazy" />`).join("")}
          </div>
        </section>
      `;

      const prev = CASES[data.prev] || null;
      const next = CASES[data.next] || null;

      const navHtml = `
        <section class="panel reveal">
          <h2 class="h3">Следующий шаг</h2>
          <p class="muted" style="margin-top:10px;">Если тебе нужен похожий проект — напиши, соберём команду и смету под задачу.</p>
          <div class="nextPrev" style="margin-top:14px;">
            <a class="navCard magnetic" data-magnet="0.14" href="case.html?slug=${data.prev}">
              <div>
                <small>Prev</small>
                <strong>${prev ? prev.title : "—"}</strong>
              </div>
              <div aria-hidden="true">←</div>
            </a>
            <a class="navCard magnetic" data-magnet="0.14" href="case.html?slug=${data.next}">
              <div>
                <small>Next</small>
                <strong>${next ? next.title : "—"}</strong>
              </div>
              <div aria-hidden="true">→</div>
            </a>
          </div>
        </section>
      `;

      main.innerHTML = `
        ${sectionsHtml}
        ${galleryHtml}
        ${navHtml}
      `;

      // Observe reveals on injected content
      if (!reduce) {
        const io = new IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              if (en.isIntersecting) {
                en.target.classList.add("is-inview");
                io.unobserve(en.target);
              }
            }
          },
          { threshold: 0.14 }
        );
        $$(".reveal", main).forEach((el) => io.observe(el));
      } else {
        $$(".reveal", main).forEach((el) => el.classList.add("is-inview"));
      }

      initMagnetic(main);
    }

    // Drawer (mobile info)
    const drawer = $("#drawer");
    const drawerClose = $("#drawerClose");
    const drawerBody = $("#drawerBody");
    const infoBtn = $("#caseInfoBtn");

    if (drawerBody) {
      drawerBody.innerHTML = `
        ${rowsHtml}
        <div style="margin-top:14px; display:grid; gap:10px;">
          <a class="btn btn--primary" href="contact.html"><span>Обсудить проект</span></a>
          <a class="btn" href="projects.html"><span>Все кейсы</span></a>
        </div>
        <div style="margin-top:14px;" class="tags">${data.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      `;
    }

    const openDrawer = () => {
      if (!drawer) return;
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      if (infoBtn) infoBtn.setAttribute("aria-expanded", "true");
    };

    const closeDrawer = () => {
      if (!drawer) return;
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      if (infoBtn) infoBtn.setAttribute("aria-expanded", "false");
    };

    if (infoBtn) infoBtn.addEventListener("click", openDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);

    if (drawer) {
      drawer.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t.closest(".drawer__panel")) return;
        closeDrawer();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  };

  renderCase();
})();
