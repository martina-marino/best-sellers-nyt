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

    const fitHeight =
      (isCards || folder) && !mobile
        ? Infinity
        : mobile || frame.classList.contains("is-expanded")
        ? 1
        : maxHeight / naturalHeight;

    const scale = Math.min(
      isCards && !mobile ? Infinity : 1,
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

  if (!document.getElementById('author-picks')) return;

  const catalog = window.NYT_AUTHORS_DATA;
  const shelf = document.getElementById('author-book-collection');
  // Unificamos únicamente errores de transcripción identificables a partir
  // del autor y de su obra; NO modificamos el dataset original.
  // Ejemplo: CUJO figura bajo «Step hen King» en una fila, pero pertenece
  // a Stephen King. Se muestra una sola ficha y se suman sus registros.
  const verifiedNameCorrections = {
    'Step hen King': 'Stephen King',
    'James Michener': 'James A. Michener',
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
  // El resumen aportado de King incluye cuatro títulos escritos en coautoría.
  // Conservamos también sus entradas originales en el buscador.
  if (authorCatalog['Stephen King']) {
    const kingRows = new Map(authorCatalog['Stephen King'].map(row => [row[0], row]));
    ['Stephen King and Owen King', 'Stephen King and Peter Straub', 'Stephen King and Richard Chizmar'].forEach(name => {
      (authorCatalog[name] || []).forEach(row => kingRows.set(row[0], row));
    });
    authorCatalog['Stephen King'] = [...kingRows.values()];
  }
  const names = Object.keys(authorCatalog).sort((a, b) => a.localeCompare(b, 'es'));
  const number = new Intl.NumberFormat('es-AR');
  const profiles = {
  "John Grisham": {
    "slug": "grisham",
    "source": "https://www.esquire.com/entertainment/books/a41456526/john-grisham-what-ive-learned/",
    "bio": "Antes de ser escritor, Grisham era abogado en Mississippi, y de ahí salen sus historias de juicios y conspiraciones. Tuvo 35 libros en la lista y, sumando todos, pasó más de 15 años en ella. Casi todos llegaron al puesto número 1: 34 de los 35.",
    "books": [
      {
        "title": "The Pelican Brief",
        "cover": "assets/autores/grisham-0.jpg",
        "description": "Dos jueces de la Corte Suprema aparecen asesinados, y una joven estudiante de derecho, Darby Shaw, escribe un informe con una teoría sobre el crimen. Sin darse cuenta, descubre un secreto tan peligroso que la convierte en el blanco de personas muy poderosas. Fue la tercera novela de Grisham y estuvo en la lista 49 semanas, casi un año entero. Años después se hizo película, con Julia Roberts y Denzel Washington."
      },
      {
        "title": "The Client",
        "cover": "assets/autores/grisham-1.jpg"
      },
      {
        "title": "The Firm",
        "cover": "assets/autores/grisham-2.jpg"
      },
      {
        "title": "Skipping Christmas",
        "cover": "assets/autores/grisham-3.jpg"
      }
    ],
    "photo": "assets/autores/grisham.jpg"
  },
  "Stephen King": {
    "slug": "king",
    "source": "https://newengland.com/yankee/magazine/stephen-king/",
    "bio": "Nacido en Maine en 1947, King es el maestro del terror moderno, y muchas de sus novelas terminaron en cine y series. Tuvo 60 libros en la lista, que sumados representan más de 18 años, y 43 de ellos llegaron al puesto número 1.",
    "books": [
      {
        "title": "The Stand",
        "cover": "assets/autores/king-0.jpg",
        "description": "Un virus creado en un laboratorio escapa y acaba con casi toda la humanidad. Los pocos que sobreviven empiezan a tener los mismos sueños: algunos se sienten atraídos por una anciana bondadosa, y otros por un hombre misterioso y oscuro. Todos se preparan para una batalla final entre el bien y el mal. Es una de las novelas más queridas de King, estuvo en la lista 38 semanas (casi 9 meses) y tuvo dos series de televisión."
      },
      {
        "title": "It",
        "cover": "assets/autores/king-1.jpg"
      },
      {
        "title": "Firestarter",
        "cover": "assets/autores/king-2.jpg"
      },
      {
        "title": "Cujo",
        "cover": "assets/autores/king-3.jpg"
      }
    ],
    "photo": "assets/autores/king.jpg",
    "photoSource": "https://en.wikipedia.org/wiki/Stephen_King",
    "photoNote": "Retrato alternativo · Wikimedia Commons"
  },
  "James A. Michener": {
    "slug": "michener",
    "source": "https://www.google.com/imgres?q=James%20A.%20Michener%3A&imgurl=https%3A%2F%2Fm.media-amazon.com%2Fimages%2FM%2FMV5BMzcyZTEwN2UtYzQzNy00YzI2LWJkYzYtMTAxODk5ODk0MjBlXkEyXkFqcGc%40._V1_.jpg&imgrefurl=https%3A%2F%2Fwww.imdb.com%2Fes-es%2Fname%2Fnm0585151%2Fbio%2F&docid=lnU4iHPGJvL6yM&tbnid=4n8FKSnL_X4y4M&vet=12ahUKEwi-nMT9s5GYAxVmqZUCHfkZMB0QnPAOegUIyQEQAA..i&w=465&h=600&hcb=2&ved=2ahUKEwi-nMT9s5GYAxVmqZUCHfkZMB0QnPAOegUIyQEQAA",
    "bio": "Michener escribía sagas enormes que contaban la historia de un lugar entero a lo largo de siglos, como Hawái, Texas o Alaska. Ganó el premio Pulitzer en 1948. Tuvo 21 libros en la lista, y entre todos estuvieron unos 12 años y medio.",
    "books": [
      {
        "title": "Hawaii",
        "cover": "assets/autores/michener-0.jpg",
        "description": "Michener empieza la historia mucho antes de que existiera una sola persona en las islas: con el nacimiento de Hawái por erupciones volcánicas. Después sigue a los primeros navegantes polinesios, a los misioneros que llegaron desde Nueva Inglaterra y a los inmigrantes de China y Japón. Salió el mismo año en que Hawái se convirtió en un estado de Estados Unidos, estuvo en la lista 94 semanas (casi 2 años) y también se llevó al cine."
      },
      {
        "title": "The Source",
        "cover": "assets/autores/michener-1.jpg"
      },
      {
        "title": "Centennial",
        "cover": "assets/autores/michener-2.jpg"
      },
      {
        "title": "Chesapeake",
        "cover": "assets/autores/michener-3.jpg"
      }
    ],
    "photo": "assets/autores/michener.jpg"
  },
  "Danielle Steel": {
    "slug": "steel",
    "source": "https://www.tvinsider.com/people/danielle-steel/",
    "bio": "Nacida en Nueva York en 1947, Steel escribe novelas románticas y dramas familiares, y vendió más de 500 millones de libros. Es la que más libros colocó en la lista: 116, que sumados estuvieron más de 18 años.",
    "books": [
      {
        "title": "Wanderlust",
        "cover": "assets/autores/steel-0.jpg",
        "description": "Audrey Driscoll es una mujer estadounidense con ganas de conocer el mundo, y sus viajes la llevan a China, Alemania, Inglaterra y el norte de África. En cada lugar se enamora y vive nuevas aventuras, pero también tiene que decidir una y otra vez entre seguir su deseo de libertad o hacer lo que su conciencia le pide. Fue la vigésima novela de Steel, llegó al puesto número 1 y se quedó en la lista más de 6 meses."
      },
      {
        "title": "Changes",
        "cover": "assets/autores/steel-1.jpg"
      },
      {
        "title": "The Gift",
        "cover": "assets/autores/steel-2.jpg"
      },
      {
        "title": "Kaleidoscope",
        "cover": "assets/autores/steel-3.jpg"
      }
    ],
    "photo": "assets/autores/steel.jpg"
  },
  "Herman Wouk": {
    "slug": "wouk",
    "source": "https://en.wikipedia.org/wiki/Herman_Wouk",
    "bio": "Wouk escribió historias de guerra y de vida cotidiana de su época, y vivió hasta los 103 años. Solo tuvo 9 libros en la lista, pero entre todos sumaron más de 7 años. Ganó el Pulitzer por The Caine Mutiny.",
    "books": [
      {
        "title": "The Caine Mutiny",
        "cover": "assets/autores/wouk-0.jpg",
        "description": "Durante la Segunda Guerra Mundial, un joven oficial llega a un viejo barco de la Marina de Estados Unidos, el Caine, comandado por un capitán cada vez más inestable. En medio de una tormenta, la tripulación decide quitarle el mando, y la historia termina en un juicio que plantea quién tenía la razón. Ganó el premio Pulitzer, estuvo en la lista 123 semanas (más de 2 años) y se hizo película en 1954 con Humphrey Bogart."
      },
      {
        "title": "The Winds of War",
        "cover": "assets/autores/wouk-1.jpg"
      },
      {
        "title": "War and Remembrance",
        "cover": "assets/autores/wouk-2.jpg"
      },
      {
        "title": "Marjorie Morningstar",
        "cover": "assets/autores/wouk-3.jpg"
      }
    ],
    "photo": "assets/autores/wouk.jpg"
  }
};
  let selectedBooks = [];
  let selectedBookIndex = 0;
  let currentName = '';

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

  if (!names.length) return;

  function imageNode(src, alt, className) {
    const img = element('img', className);
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.replaceWith(element('span', 'editorial-image-fallback', alt));
    }, { once: true });
    return img;
  }

  function selectBook(index) {
    selectedBookIndex = (index + selectedBooks.length) % selectedBooks.length;
    const book = selectedBooks[selectedBookIndex];
    const [, , year, weeks, rank] = book.row;
    const cover = document.getElementById('featured-cover');
    cover.replaceChildren(book.cover
      ? imageNode(book.cover, `Portada de ${book.title}`, 'featured-cover-image')
      : element('span', 'editorial-image-fallback', book.title));
    document.getElementById('featured-title').textContent = book.title;
    document.getElementById('featured-meta').textContent = `${currentName} · Debut en el ranking: ${year}`;
    document.getElementById('featured-description').textContent = book.description ||
      `Este libro forma parte del recorrido de ${currentName} por la lista de ficción de tapa dura del New York Times.`;
    document.getElementById('featured-weeks').textContent = `${number.format(weeks)} semanas en la lista`;
    document.getElementById('featured-rank').textContent = `Mejor puesto: #${rank}`;
    shelf.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === selectedBookIndex));
    });
  }

  function renderShelf(rows) {
    const profile = profiles[currentName];
    selectedBooks = profile ? profile.books.map(book => ({
      ...book, row: rows.find(row => normalized(row[1]) === normalized(book.title))
    })).filter(book => book.row) : rows.slice(0, 8).map(row => ({ title: row[1], row }));
    shelf.replaceChildren();
    selectedBooks.forEach((book, index) => {
      const button = element('button', 'editorial-thumbnail');
      button.type = 'button';
      button.setAttribute('aria-label', `Ver ${book.title}`);
      button.setAttribute('aria-controls', 'featured-book');
      if (book.cover) button.appendChild(imageNode(book.cover, '', 'thumbnail-cover'));
      button.appendChild(element('span', '', book.title));
      button.addEventListener('click', () => selectBook(index));
      shelf.appendChild(button);
    });
    selectBook(0);
  }

  const picks = document.getElementById('author-picks');
  Object.keys(profiles).forEach(name => {
    const button = element('button', 'editorial-author-pick', name);
    button.type = 'button';
    button.addEventListener('click', () => { renderAuthor(name); });
    picks.appendChild(button);
  });

  function renderAuthor(name) {
    currentName = name;
    document.getElementById('author-results').hidden = false;
    const rows = [...authorCatalog[name]].sort((a, b) => b[3] - a[3] || a[1].localeCompare(b[1], 'es'));
    const weeks = rows.reduce((sum, row) => sum + row[3], 0);
    const firstYear = Math.min(...rows.map(row => row[2]));

    const nameParts = name.split(' ');
    const surname = nameParts.pop();
    document.getElementById('author-name').replaceChildren(
      element('span', 'author-name-line', nameParts.join(' ')),
      element('span', 'author-name-line', surname)
    );
    const profile = profiles[name];
    const portrait = document.getElementById('author-photo');
    portrait.replaceChildren();
    portrait.hidden = !profile;
    document.getElementById('author-hero').classList.toggle('without-portrait', !profile);
    if (profile) {
      portrait.appendChild(imageNode(profile.photo, `Retrato de ${name}`, 'editorial-portrait-image'));
    }
    document.getElementById('author-bio').textContent = profile ? profile.bio :
      `Explorá los títulos de ${name} registrados en el archivo de ficción de tapa dura del New York Times entre 1931 y 2020.`;
    picks.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === name)));
    document.getElementById('author-title-count').textContent = number.format(rows.length);
    document.getElementById('author-week-count').textContent = number.format(weeks);
    document.getElementById('author-first-year').textContent = String(firstYear);
    renderShelf(rows);
  }

  renderAuthor(authorCatalog['John Grisham'] ? 'John Grisham' : names[0]);
})();

// Reproducción al entrar en pantalla, sin reiniciar el video al volver.
(() => {
  const frame = document.getElementById('story-video');
  if (!frame || !('IntersectionObserver' in window)) return;
  const url = new URL(frame.src);
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    url.searchParams.set('origin', location.origin);
    frame.src = url.href;
  }
  let player;
  let ready = false;
  let visible = false;
  let started = false;
  let resume = false;
  function syncPlayback() {
    if (!ready) return;
    if (visible && !document.hidden) {
      if (!started) {
        player.mute();
        player.playVideo();
        started = true;
      } else if (resume) {
        resume = false;
        player.playVideo();
      }
    } else if (player.getPlayerState() === 1 || player.getPlayerState() === 3) {
      resume = true;
      player.pauseVideo();
    }
  }
  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (previousReady) previousReady();
    player = new YT.Player('story-video', {
      events: { onReady: () => { ready = true; syncPlayback(); } }
    });
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
    syncPlayback();
  }, { threshold: [0, 0.35] }).observe(frame);
  document.addEventListener('visibilitychange', syncPlayback);
  if (window.YT && window.YT.Player) window.onYouTubeIframeAPIReady();
  else {
    const api = document.createElement('script');
    api.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(api);
  }
})();
