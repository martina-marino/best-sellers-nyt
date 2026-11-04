(() => {
  "use strict";

  const reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // =====================================
  // MENÚ LATERAL
  // =====================================

  const header = document.querySelector(".floating-header");
  const toggle = document.querySelector(".floating-toggle");
  const nav = document.querySelector(".floating-nav");

  function setMenu(open) {
    nav.hidden = !open;

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Cerrar menú" : "Abrir menú"
    );

    toggle.firstElementChild.textContent = open ? "×" : "☰";
  }

  toggle.addEventListener("click", () => {
    setMenu(nav.hidden);
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenu(false);
      toggle.focus({ preventScroll: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) {
      setMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !nav.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });

  header.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!header.contains(document.activeElement)) {
        setMenu(false);
      }
    });
  });

  // =====================================
  // AJUSTAR LOS EMBEDS SIN RECORTARLOS
  // =====================================

  const fitFrames = [
    ...document.querySelectorAll(".fit-frame")
  ];

  function fitFrame(frame) {
    const content = frame.querySelector(".fit-content");
    if (!frame.getClientRects().length) {
      content.style.width = `${Number(frame.dataset.width || 1100)}px`;
      return;
    }
    const availableWidth = frame.clientWidth;
    const mobile = window.innerWidth < 760;

    const nativeWidth = mobile
      ? availableWidth
      : Number(frame.dataset.width || 1100);

    content.style.width = `${nativeWidth}px`;

    // offsetHeight mide antes de aplicar la escala visual.
    const embed = content.querySelector('.flourish-embed');
    const fallback = embed.querySelector('.embed-fallback');
    if (fallback) {
      const loaded = Boolean(embed.querySelector('iframe'));
      if (fallback.hidden !== loaded) fallback.hidden = loaded;
    }
    const naturalHeight = content.offsetHeight;

    if (!naturalHeight || !availableWidth) return;

    let maxHeight = Math.max(220, window.innerHeight * 0.78);
    const section = frame.closest(".exceptions");
    if (section) {
      // Reservar el espacio real del texto, los controles y los márgenes.
      const surroundingHeight = section.offsetHeight - frame.offsetHeight;
      maxHeight = Math.max(100, window.innerHeight - surroundingHeight - 2);
    }

    const folder = frame.closest(".folder-stack");
    if (folder && !mobile) {
      const controlsAndText = folder.offsetHeight - frame.offsetHeight;
      maxHeight = Math.max(160, Math.min(window.innerHeight * 0.54,
        window.innerHeight - controlsAndText - 48));
    }

    // En celular o al ampliar, no limitar por altura.
    const fitHeight =
      mobile || frame.classList.contains("is-expanded")
        ? 1
        : maxHeight / naturalHeight;

    const fittedScale = Math.min(
      1,
      availableWidth / nativeWidth,
      fitHeight
    );

    const compactCards = section && !mobile && !frame.classList.contains("is-expanded");
    const scale = compactCards ? fittedScale * 0.95 : fittedScale;

    content.style.transform = `scale(${scale})`;

    content.style.left = `${
      Math.max(
        0,
        (availableWidth - nativeWidth * scale) / 2
      )
    }px`;

    frame.style.height =
      `${Math.ceil(naturalHeight * scale)}px`;
  }

  let fitQueued = false;

  function queueFit() {
    if (fitQueued) return;

    fitQueued = true;

    requestAnimationFrame(() => {
      fitQueued = false;
      fitFrames.forEach(fitFrame);
    });
  }

  // Flourish modifica la altura cuando termina de cargar.
  // Volvemos a medir cuando eso sucede.
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(queueFit);

    fitFrames.forEach((frame) => {
      observer.observe(frame);
      observer.observe(frame.querySelector(".fit-content"));
    });

    document.querySelectorAll(".section-heading").forEach(
      (element) => observer.observe(element)
    );
  }

  const mutationObserver = new MutationObserver(queueFit);

  fitFrames.forEach((frame) => {
    mutationObserver.observe(
      frame.querySelector(".flourish-embed"),
      {
        childList: true,
        subtree: true,
        attributes: true
      }
    );
  });

  // Alternar entre vista completa y lectura ampliada.
  document.querySelectorAll(".size-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = document.getElementById(
        button.getAttribute("aria-controls")
      );

      const expanded = frame.classList.toggle("is-expanded");

      button.setAttribute("aria-pressed", String(expanded));

      button.textContent = expanded
        ? "Ajustar a la pantalla"
        : "Ampliar para leer";

      queueFit();
    });
  });

  // =====================================
  // CARPETAS SUPERPUESTAS
  // =====================================

  document.querySelectorAll(".folder-stack").forEach((stack) => {
    const tabs = [
      ...stack.querySelectorAll('[role="tab"]')
    ];

    const panels = [
      ...stack.querySelectorAll('[role="tabpanel"]')
    ];

    function select(tab, focus = false) {
      tabs.forEach((item) => {
        const active = item === tab;

        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
      });

      panels.forEach((panel) => {
        const active =
          panel.id === tab.getAttribute("aria-controls");

        panel.hidden = !active;

        // Ampliación suave del contenido de la carpeta elegida.
        if (
          active &&
          !reducedMotion.matches &&
          panel.animate
        ) {
          panel.animate(
            [
              {
                opacity: 0.6,
                transform: "scale(0.975) translateY(8px)"
              },
              {
                opacity: 1,
                transform: "scale(1) translateY(0)"
              }
            ],
            {
              duration: 340,
              easing: "ease-out"
            }
          );
        }
      });

      if (focus) {
        tab.focus({ preventScroll: true });
      }

      queueFit();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));

      tab.addEventListener("keydown", (event) => {
        let next;

        if (event.key === "ArrowRight") {
          next = (index + 1) % tabs.length;
        }

        if (event.key === "ArrowLeft") {
          next = (index - 1 + tabs.length) % tabs.length;
        }

        if (event.key === "Home") {
          next = 0;
        }

        if (event.key === "End") {
          next = tabs.length - 1;
        }

        if (next !== undefined) {
          event.preventDefault();
          select(tabs[next], true);
        }
      });
    });
  });

  // =====================================
  // ANIMACIÓN DE LA COMPARACIÓN
  // =====================================

  const eras = [
    ...document.querySelectorAll(".timeline-era")
  ];

  let scrollQueued = false;

  function updateTimeline() {
    scrollQueued = false;

    eras.forEach((era) => {
      const rect = era.getBoundingClientRect();

      const progress = Math.max(
        -1,
        Math.min(
          1,
          (
            window.innerHeight / 2 -
            rect.top -
            rect.height / 2
          ) / window.innerHeight
        )
      );

      const movement = reducedMotion.matches
        ? 0
        : progress * 55;

      era.style.setProperty("--drift", `${movement}px`);
    });
  }

  if (
    "IntersectionObserver" in window &&
    !reducedMotion.matches
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    eras.forEach((era) => {
      era.classList.add("will-reveal");
      observer.observe(era);
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateTimeline);
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    queueFit();
    updateTimeline();
  });

  window.addEventListener("load", queueFit);

  document.fonts?.ready.then(queueFit);

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      eras.forEach((era) => {
        era.classList.add("is-visible");
      });
    }

    updateTimeline();
  });

  queueFit();
  updateTimeline();
})();

(() => {
  "use strict";

  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // Crear las casillas de las semanas.
  document.querySelectorAll(".week-grid").forEach((grid) => {
    const count = Number(grid.dataset.weeks);

    grid.replaceChildren();

    for (let index = 0; index < count; index += 1) {
      const cell = document.createElement("span");
      cell.className = "week-cell";
      grid.appendChild(cell);
    }
  });

  // Abrir el libro cuando entra en pantalla.
  const book = document.querySelector(".opening-book");

  if (book) {
    if (
      motionPreference.matches ||
      !("IntersectionObserver" in window)
    ) {
      book.classList.add("is-open");
    } else {
      const bookObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  book.classList.add("is-open");
                });
              });

              bookObserver.unobserve(book);
            }
          });
        },
        { threshold: 0.3 }
      );

      bookObserver.observe(book);
    }
  }

  // Zoom progresivo: aumenta al acercarse al centro
  // de la pantalla y disminuye al alejarse.
  const scenes = [
    ...document.querySelectorAll(".timeline-visual")
  ];

  let queued = false;

  function updateZoom() {
    queued = false;

    scenes.forEach((scene) => {
      const era = scene.closest(".timeline-era");
      const bounds = era.getBoundingClientRect();

      const sceneCenter = bounds.top + bounds.height / 2;
      const viewportCenter = window.innerHeight / 2;

      const distance = Math.abs(sceneCenter - viewportCenter);

      const proximity = Math.max(
        0,
        1 - distance / (window.innerHeight * 0.8)
      );

      const scale = motionPreference.matches
        ? 1
        : 0.84 + proximity * 0.2;

      scene.style.setProperty(
        "--scene-scale",
        scale.toFixed(3)
      );
    });
  }

  function requestZoomUpdate() {
    if (queued) return;

    queued = true;
    requestAnimationFrame(updateZoom);
  }

  window.addEventListener("scroll", requestZoomUpdate, {
    passive: true
  });

  window.addEventListener("resize", requestZoomUpdate);
  window.addEventListener("load", requestZoomUpdate);

  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches && book) {
      book.classList.add("is-open");
    }

    requestZoomUpdate();
  });

  updateZoom();
})();

// Señalador de lectura y entradas editoriales.
(() => {
  const progress = document.querySelector('.reading-progress span');
  const label = document.querySelector('.bookmark-chapter');
  const bookmark = document.querySelector('.reading-bookmark');
  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.floating-nav a')];
  const names = new Map(links.map(link => [link.hash.slice(1), link.textContent.trim()]));
  let queued = false;
  let currentId = '';
  function updateReading() {
    queued = false;
    const available = document.documentElement.scrollHeight - innerHeight;
    const amount = available > 0 ? Math.max(0, Math.min(1, scrollY / available)) : 0;
    progress.style.transform = `scaleX(${amount})`;
    let current = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= innerHeight * .35) current = section;
    });
    if (current && current.id !== currentId) {
      currentId = current.id;
      label.textContent = names.get(current.id) || 'Inicio';
      bookmark.setAttribute('aria-label', `${label.textContent}. Volver al comienzo`);
      links.forEach(link => {
        if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(updateReading); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('load', queue);
  if ('ResizeObserver' in window) new ResizeObserver(queue).observe(document.body);
  updateReading();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        observer.unobserve(entry.target);
      }
    }), { threshold: .08 });
    document.querySelectorAll('.prose-reveal').forEach(element => {
      // No ocultar un texto que ya está visible al cargar.
      if (element.getBoundingClientRect().top > innerHeight) element.classList.add('is-waiting');
      observer.observe(element);
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        document.querySelectorAll('.is-waiting').forEach(el => el.classList.remove('is-waiting'));
        observer.disconnect();
      }
    });
  }
})();
