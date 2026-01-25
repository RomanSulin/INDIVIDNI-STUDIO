/* INDIVIDNI Brief (v2)
   - One card at a time with smooth transitions
   - Top tabs to go back and edit completed steps
   - Save state to localStorage
*/
(() => {
  const $ = (s, r=document) => r.querySelector(s);

  const card = $("#card");
  const progress = $("#progress");
  const backBtn = $("#backBtn");
  const nextBtn = $("#nextBtn");
  const skipBtn = $("#skipBtn");
  const resetBtn = $("#resetBtn");
  const homeBtn = $("#homeBtn");

  const STORAGE_KEY = "individni_brief_v2";
  const COLORS = ["#001219","#005f73","#0a9396","#94d2bd","#e9d8a6","#ee9b00","#ca6702","#bb3e03","#ae2012","#9b2226"];

  const steps = [
    { key:"type", title:"Тип проекта", kicker:"Шаг 1", hint:"Выберите один вариант — это поможет быстро собрать предложение.", color:COLORS[3], kind:"single", options:["Рекламный ролик","Бренд‑фильм","Событие / эфир","Клип","CGI/VFX","Другое"], required:true },
    { key:"channels", title:"Каналы", kicker:"Шаг 2", hint:"Где будет использоваться. Можно выбрать несколько.", color:COLORS[2], kind:"multi", options:["YouTube / Web","Соцсети","TV","Сцена / экран","Внутренние презентации"], required:false },
    { key:"goal", title:"Цель и задача", kicker:"Шаг 3", hint:"1–3 предложения: что нужно получить на выходе.", color:COLORS[5], kind:"text", label:"Опишите задачу", required:true },
    { key:"deadline", title:"Сроки", kicker:"Шаг 4", hint:"Если даты нет — напишите ориентир.", color:COLORS[6], kind:"textShort", label:"Дедлайн / период", required:false },
    { key:"budget", title:"Бюджет", kicker:"Шаг 5", hint:"Можно выбрать диапазон или написать свой.", color:COLORS[4], kind:"budget", options:["до 200k","200–500k","500k–1m","1m+","Свой вариант"], required:false },
    { key:"contacts", title:"Контакты", kicker:"Шаг 6", hint:"Куда отправить предложение/смету.", color:COLORS[1], kind:"contacts", required:true },
    { key:"refs", title:"Референсы", kicker:"Шаг 7", hint:"Ссылки на папку/рефы/доки. Можно позже.", color:COLORS[8], kind:"text", label:"Ссылки (Drive/Dropbox/YouTube/Notion)", required:false },
    { key:"done", title:"Готово", kicker:"Шаг 8", hint:"Проверьте ответы и скачайте / скопируйте.", color:COLORS[0], kind:"summary", required:false }
  ];

  const defaultState = {
    idx: 0,
    maxIdx: 0,
    data: {
      type: null,
      channels: [],
      goal: "",
      deadline: "",
      budget: { preset: null, custom: "" },
      contacts: { name: "", company: "", email: "", phone: "" },
      refs: ""
    }
  };

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...parsed };
    }catch{
      return structuredClone(defaultState);
    }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  let state = loadState();

  function setAccent(hex){ document.documentElement.style.setProperty("--accent", hex); }
  function canGo(i){ return i <= state.maxIdx; }

  function validateCurrent(){
    const step = steps[state.idx];
    const d = state.data;
    if (step.kind === "single" && step.required) return !!d[step.key];
    if (step.kind === "text" && step.required) return String(d[step.key]||"").trim().length > 3;
    if (step.kind === "contacts"){
      const c = d.contacts;
      const okEmail = String(c.email||"").includes("@");
      return String(c.name||"").trim().length > 1 && okEmail;
    }
    return true;
  }

  function markDone(){ state.maxIdx = Math.max(state.maxIdx, state.idx + 1); saveState(); }

  function setIdx(idx, dir){
    if (idx < 0 || idx >= steps.length) return;
    if (!canGo(idx)) return;
    const prev = state.idx;
    state.idx = idx;
    saveState();
    render(dir ?? (idx > prev ? "next" : "back"));
  }

  function renderTabs(){
    progress.innerHTML = "";
    steps.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab-chip" + (i === state.idx ? " is-active" : "") + (i < state.maxIdx ? " is-done" : "");
      btn.disabled = !canGo(i);
      btn.innerHTML = `<span class="tab-chip__n">${i+1}</span><span>${s.title}</span>`;
      btn.addEventListener("click", () => setIdx(i));
      progress.appendChild(btn);
    });
  }

  function renderCard(step){
    setAccent(step.color);

    const head = `
      <div class="card-head">
        <div class="card-kicker">${step.kicker}</div>
        <div class="card-title">${step.title}</div>
        <div class="card-sub">${step.hint}</div>
      </div>
    `;

    if (step.kind === "single" || step.kind === "multi"){
      const values = state.data[step.key] ?? (step.kind === "multi" ? [] : null);
      const wrap = document.createElement("div");
      wrap.innerHTML = head;

      const choices = document.createElement("div");
      choices.className = "choices";

      step.options.forEach(opt => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        const on = step.kind === "single" ? (values === opt) : (values.includes(opt));
        if (on) b.classList.add("is-on");
        b.textContent = opt;

        b.addEventListener("click", () => {
          if (step.kind === "single"){
            state.data[step.key] = opt;
          } else {
            const arr = state.data[step.key] ?? [];
            const idx = arr.indexOf(opt);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(opt);
            state.data[step.key] = arr;
          }
          saveState();
          render();
        });

        choices.appendChild(b);
      });

      wrap.appendChild(choices);
      return wrap;
    }

    if (step.kind === "text" || step.kind === "textShort"){
      const wrap = document.createElement("div");
      wrap.innerHTML = head;

      const field = document.createElement("div");
      field.className = "field";
      field.innerHTML = `<label>${step.label}</label>`;

      const el = step.kind === "text" ? document.createElement("textarea") : document.createElement("input");
      el.className = step.kind === "text" ? "textarea" : "input";
      if (step.kind === "textShort") el.type = "text";
      el.value = state.data[step.key] ?? "";

      el.addEventListener("input", () => {
        state.data[step.key] = el.value;
        saveState();
        renderButtons();
      });

      field.appendChild(el);
      wrap.appendChild(field);
      return wrap;
    }

    if (step.kind === "budget"){
      const wrap = document.createElement("div");
      wrap.innerHTML = head;

      const choices = document.createElement("div");
      choices.className = "choices";

      const current = state.data.budget?.preset ?? null;

      step.options.forEach(opt => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice" + (current === opt ? " is-on" : "");
        b.textContent = opt;
        b.addEventListener("click", () => {
          state.data.budget.preset = opt;
          saveState();
          render();
        });
        choices.appendChild(b);
      });

      const field = document.createElement("div");
      field.className = "field";
      field.innerHTML = `<label>Комментарий к бюджету</label>`;
      const inp = document.createElement("input");
      inp.className = "input";
      inp.type = "text";
      inp.placeholder = "Например: бюджет фикс / нужно 2 сметы / есть потолок";
      inp.value = state.data.budget?.custom ?? "";
      inp.addEventListener("input", () => {
        state.data.budget.custom = inp.value;
        saveState();
      });
      field.appendChild(inp);

      wrap.appendChild(choices);
      wrap.appendChild(field);
      return wrap;
    }

    if (step.kind === "contacts"){
      const wrap = document.createElement("div");
      wrap.innerHTML = head;

      const c = state.data.contacts;

      const row = document.createElement("div");
      row.className = "row";

      const mk = (label, key, type="text", placeholder="") => {
        const f = document.createElement("div");
        f.className = "field";
        f.innerHTML = `<label>${label}</label>`;
        const i = document.createElement("input");
        i.className = "input";
        i.type = type;
        i.placeholder = placeholder;
        i.value = c[key] || "";
        i.addEventListener("input", () => {
          c[key] = i.value;
          saveState();
          renderButtons();
        });
        f.appendChild(i);
        return f;
      };

      row.appendChild(mk("Имя", "name", "text", "Иван"));
      row.appendChild(mk("Компания", "company", "text", "ООО …"));

      const row2 = document.createElement("div");
      row2.className = "row";
      row2.appendChild(mk("Email", "email", "email", "mail@company.com"));
      row2.appendChild(mk("Телефон", "phone", "tel", "+7 …"));

      wrap.appendChild(row);
      wrap.appendChild(row2);
      return wrap;
    }

    if (step.kind === "summary"){
      const wrap = document.createElement("div");
      wrap.innerHTML = head;

      const s = document.createElement("div");
      s.className = "summary";

      const d = state.data;
      const rows = [
        ["Тип проекта", d.type || "—"],
        ["Каналы", (d.channels || []).join(", ") || "—"],
        ["Задача", d.goal || "—"],
        ["Сроки", d.deadline || "—"],
        ["Бюджет", [d.budget?.preset, d.budget?.custom].filter(Boolean).join(" / ") || "—"],
        ["Контакт", `${d.contacts?.name || "—"} • ${d.contacts?.email || "—"}`],
        ["Референсы", d.refs || "—"]
      ];

      rows.forEach(([k,v]) => {
        const r = document.createElement("div");
        r.className = "sum-row";
        r.innerHTML = `<div class="sum-k">${k}</div><div class="sum-v">${escapeHtml(v)}</div>`;
        s.appendChild(r);
      });

      const actions = document.createElement("div");
      actions.className = "choices";

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "choice";
      copy.textContent = "Скопировать JSON";
      copy.addEventListener("click", async () => {
        try{
          await navigator.clipboard.writeText(JSON.stringify(state.data, null, 2));
          copy.textContent = "Скопировано";
          setTimeout(() => copy.textContent = "Скопировать JSON", 900);
        }catch{ alert("Не удалось скопировать."); }
      });

      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "choice";
      dl.textContent = "Скачать JSON";
      dl.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "brief_individni.json";
        a.click();
        URL.revokeObjectURL(a.href);
      });

      actions.appendChild(copy);
      actions.appendChild(dl);

      wrap.appendChild(s);
      wrap.appendChild(actions);
      return wrap;
    }

    const wrap = document.createElement("div");
    wrap.innerHTML = head;
    return wrap;
  }

  function renderButtons(){
    backBtn.disabled = state.idx === 0;
    const step = steps[state.idx];
    const isLast = state.idx === steps.length - 1;
    nextBtn.textContent = isLast ? "Готово" : "Продолжить";
    skipBtn.style.visibility = (step.required || isLast) ? "hidden" : "visible";
    nextBtn.disabled = !validateCurrent();
  }

  function render(dir){
    const step = steps[state.idx];
    renderTabs();

    const outClass = dir === "back" ? "anim-out-right" : "anim-out-left";
    const inClass  = dir === "back" ? "anim-in-left" : "anim-in-right";

    card.classList.remove("anim-in-left","anim-in-right","anim-out-left","anim-out-right");
    card.classList.add(outClass);

    setTimeout(() => {
      card.className = "stage-card " + inClass;
      card.innerHTML = "";
      card.appendChild(renderCard(step));
      renderButtons();
    }, 180);
  }

  backBtn.addEventListener("click", () => setIdx(state.idx - 1, "back"));
  nextBtn.addEventListener("click", () => {
    if (!validateCurrent()) return;
    const isLast = state.idx === steps.length - 1;
    if (!isLast) markDone();
    setIdx(Math.min(state.idx + 1, steps.length - 1), "next");
  });
  skipBtn.addEventListener("click", () => {
    const isLast = state.idx === steps.length - 1;
    if (isLast) return;
    markDone();
    setIdx(state.idx + 1, "next");
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("Сбросить бриф?")) return;
    state = structuredClone(defaultState);
    saveState();
    render("back");
  });

  homeBtn.addEventListener("click", (e) => { e.preventDefault(); setIdx(0, "back"); });

  // initial
  render("next");
})();
