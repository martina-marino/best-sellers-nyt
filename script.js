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
    const isCards = frame.id === "frame-cards";
    const folder = frame.closest(".folder-stack");

    // Las portadas de las excepciones son el elemento principal de la escena:
    // no reducirlas para que toda la sección entre artificialmente en 1 pantalla.
    // Se ajustan al ancho disponible y la sección puede crecer naturalmente.
    if (folder && !mobile) {
      // Carpetas editoriales: un poco más de alto que antes, manteniendo
      // visible el encabezado y la carpeta en una misma pantalla de escritorio.
      maxHeight = Math.max(290, Math.min(420, window.innerHeight * 0.465));
    }

    const fitHeight =
      mobile || isCards || frame.classList.contains("is-expanded")
        ? 1
        : maxHeight / naturalHeight;

    const scale = Math.min(
      1,
      availableWidth / nativeWidth,
      fitHeight
    );

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

// ============================================================
// EXPLORADOR DE AUTORES · Archivo Post45 (1931–2020)
// Los datos provienen del archivo local autores-data.js.
// ============================================================
(() => {
  'use strict';

  const form = document.getElementById('author-search-form');
  if (!form) return;

  const catalog = window.NYT_AUTHORS_DATA;
  const input = document.getElementById('author-search');
  const suggestions = document.getElementById('author-suggestions');
  const feedback = document.getElementById('author-feedback');
  const shelf = document.getElementById('author-book-collection');
  const list = document.getElementById('author-books');
  const moreButton = document.getElementById('author-show-more');
  // Unificamos únicamente errores de transcripción identificables a partir
  // del autor y de su obra; NO modificamos el dataset original.
  // Ejemplo: CUJO figura bajo «Step hen King» en una fila, pero pertenece
  // a Stephen King. Se muestra una sola ficha y se suman sus registros.
  const verifiedNameCorrections = {
    'Step hen King': 'Stephen King',
    'A.A. Milnei': 'A. A. Milne',
    'Elizabeth Forsythe Halley': 'Elizabeth Forsythe Hailey',
    'Maz De La Roche': 'Mazo de la Roche',
    'Mazo De La Roche': 'Mazo de la Roche',
    'Mazo De la Roche': 'Mazo de la Roche',
    'A. J. Cronin': 'A. J. Cronin',
    'A.J. Cronin': 'A. J. Cronin'
  };

  // Preparación de nombres mostrados al público. El archivo fuente se mantiene
  // intacto: se corrigen puntuación exterior, espacios y las variantes auditadas.
  // Una atribución rota (p. ej. '"Elizabeth.') no se ofrece como autor.
  function canonicalName(raw) {
    const original = String(raw).replace(/[\u2009\u00a0]/g, ' ').trim().replace(/\s+/g, ' ');
    if (!original || original === original.toUpperCase() && original === 'NO AUTHOR') return null;
    if (/^(anonymous(?:\s|$)|various authors$)/i.test(original)) return null;
    if (/^(adapted|compiled|edited|illustrated) by\s/i.test(original)) return null;
    if (/^"[^"']*$/.test(original)) return null; // comillas sin cierre
    if (/[^"']"$/.test(original) && !original.startsWith('"')) return null;
    let name = original.replace(/^"(.+)"$/, '$1').trim();
    // Un punto tras el apellido suele ser un error de captura, no parte del nombre.
    if (/\.$/.test(name) && !/(?:Jr|Sr|St)\.$/i.test(name)) {
      name = name.slice(0, -1);
    }
    name = verifiedNameCorrections[name] || name;
    return name.length >= 3 ? name : null;
  }

  const indexed = new Map();
  if (catalog) {
    Object.entries(catalog).forEach(([rawName, rows]) => {
      const display = canonicalName(rawName);
      if (!display) return;
      if (!indexed.has(display)) indexed.set(display, new Map());
      const byId = indexed.get(display);
      rows.forEach(row => { if (!byId.has(row[0])) byId.set(row[0], row); });
    });
  }
  const authorCatalog = Object.fromEntries(
    [...indexed.entries()].map(([name, byId]) => [name, [...byId.values()]])
  );
  const names = Object.keys(authorCatalog).sort((a, b) => a.localeCompare(b, 'es'));
  const searchableNames = names.map(name => ({name, normalized: normalized(name)}));
  const number = new Intl.NumberFormat('es-AR');
  const motionReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#6B0005', '#1B263B', '#84665B', '#775147', '#4D5361', '#7B4542', '#5C6466', '#8B7060'];
  let currentName = '';
  let expanded = false;

  function normalized(value) {
    return value.toLocaleLowerCase('es')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().replace(/^[\"'“”]+|[\"'“”]+$/g, '')
      .replace(/\.$/, '').trim();
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }

  if (!names.length) {
    form.querySelector('button[type="submit"]').disabled = true;
    feedback.textContent = 'No se pudieron cargar los datos de autores. Comprobá que autores-data.js esté junto a index.html.';
    return;
  }

  // No desplegar miles de nombres crudos: sugerir un máximo de doce coincidencias.
  function updateSuggestions(query) {
    suggestions.replaceChildren();
    const term = normalized(query);
    if (term.length < 2) return;
    const matches = searchableNames
      .filter(item => item.normalized.includes(term))
      .sort((a, b) => {
        const aStarts = a.normalized.startsWith(term) ? 0 : 1;
        const bStarts = b.normalized.startsWith(term) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name, 'es');
      })
      .slice(0, 12);
    const fragment = document.createDocumentFragment();
    matches.forEach(({name}) => {
      const option = document.createElement('option');
      option.value = name;
      fragment.appendChild(option);
    });
    suggestions.appendChild(fragment);
  }
  input.addEventListener('input', () => updateSuggestions(input.value));
  input.addEventListener('focus', () => updateSuggestions(input.value));

  function findName(search) {
    const term = normalized(search);
    if (!term) return null;
    // La búsqueda libre sugiere coincidencias, pero nunca convierte un texto
    // parcial o mal escrito en un autor inventado. Hay que elegir el nombre
    // completo ofrecido por el catálogo (se ignoran solo tildes/caja/punto final).
    return searchableNames.find(item => item.normalized === term)?.name || null;
  }

  function renderRows(rows) {
    list.replaceChildren();
    const selectedRows = expanded ? rows : rows.slice(0, 3);
    const maximum = Math.max(1, ...rows.map(row => row[3]));

    selectedRows.forEach(row => {
      const [id, title, year, weeks, rank] = row;
      const item = element('li', 'author-book-row');
      item.id = `author-title-${id}`;
      item.tabIndex = -1;

      const copy = element('div', 'author-book-detail');
      copy.append(
        element('span', 'author-book-title', title),
        element('span', 'author-book-meta', `${year} · Mejor puesto: #${rank}`)
      );

      const value = element('strong', 'author-book-weeks', `${number.format(weeks)} sem.`);
      const bar = element('div', 'author-book-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = element('span', 'author-book-bar-fill');
      fill.style.width = `${Math.max(3, (weeks / maximum) * 100)}%`;
      bar.appendChild(fill);
      item.append(copy, value, bar);
      list.appendChild(item);
    });
    moreButton.hidden = rows.length <= 3;
    moreButton.setAttribute('aria-expanded', String(expanded));
    moreButton.textContent = expanded ? 'Mostrar solo tres títulos' : `Ver los ${number.format(rows.length)} títulos`;
  }

  function renderShelf(rows) {
    shelf.replaceChildren();
    const maximum = Math.max(1, ...rows.map(row => row[3]));
    rows.slice(0, 8).forEach((row, index) => {
      const [id, title, year, weeks] = row;
      const spine = element('button', 'author-book-spine');
      spine.type = 'button';
      spine.style.setProperty('--spine-color', colors[index % colors.length]);
      spine.style.setProperty('--spine-height', `${Math.round(62 + (weeks / maximum) * 38)}%`);
      spine.setAttribute('aria-label', `${title}, ${year}; ${number.format(weeks)} semanas. Ver en la lista`);
      spine.appendChild(element('span', 'author-spine-title', title));
      spine.addEventListener('click', () => {
        const destination = document.getElementById(`author-title-${id}`);
        if (!destination) return;
        list.querySelectorAll('.is-highlighted').forEach(el => el.classList.remove('is-highlighted'));
        destination.classList.add('is-highlighted');
        destination.scrollIntoView({ behavior: motionReduced.matches ? 'auto' : 'smooth', block: 'center' });
        destination.focus({ preventScroll: true });
      });
      shelf.appendChild(spine);
    });
  }

  function renderAuthor(name) {
    currentName = name;
    expanded = false;
    document.getElementById('author-results').hidden = false;
    input.value = name;
    const rows = [...authorCatalog[name]].sort((a, b) => b[3] - a[3] || a[1].localeCompare(b[1], 'es'));
    const weeks = rows.reduce((sum, row) => sum + row[3], 0);
    const bestRank = Math.min(...rows.map(row => row[4]));
    const firstYear = Math.min(...rows.map(row => row[2]));

    document.getElementById('author-name').textContent = name;
    document.getElementById('author-library-heading').textContent = name;
    document.getElementById('author-title-count').textContent = number.format(rows.length);
    document.getElementById('author-week-count').textContent = number.format(weeks);
    document.getElementById('author-best-rank').textContent = `#${bestRank}`;
    document.getElementById('author-first-year').textContent = String(firstYear);
    renderRows(rows);
    renderShelf(rows);
    feedback.textContent = `Mostrando ${number.format(rows.length)} ${rows.length === 1 ? 'título' : 'títulos'} registrados para ${name}.`;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = findName(input.value);
    if (!name) {
      feedback.textContent = 'No encontramos ese nombre completo en el catálogo. Elegí uno de los autores sugeridos.';
      document.getElementById('author-results').hidden = true;
      input.focus();
      return;
    }
    renderAuthor(name);
    updateSuggestions(name);
  });

  moreButton.addEventListener('click', () => {
    if (!currentName) return;
    expanded = !expanded;
    const rows = [...authorCatalog[currentName]].sort((a, b) => b[3] - a[3] || a[1].localeCompare(b[1], 'es'));
    renderRows(rows);
  });

  renderAuthor(authorCatalog['John Grisham'] ? 'John Grisham' : names[0]);
})();
