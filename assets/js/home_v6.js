
(() => {
  if (!document.body.classList.contains("home")) return;

  // ===== Tape: duplicate content for seamless scroll =====
  document.querySelectorAll(".tape__track, .stills-track").forEach((track) => {
    // prevent double-run
    if (track.dataset.duped) return;
    track.dataset.duped = "1";
    track.innerHTML = track.innerHTML + track.innerHTML;
  });

  // ===== Spotlight hover: track pointer position in cards =====
  const spotlightSel = ".work-card, .num-card, .value-card, .price-card, .workflow-card, .acc-item";
  document.querySelectorAll(spotlightSel).forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    });
  });

  // ===== Scroll reveals (GSAP if available) =====
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!prefersReduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    revealEls.forEach((el) => {
      gsap.fromTo(
        el,
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });
  } else {
    // fallback: just show
    revealEls.forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  }
})();
