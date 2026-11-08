// Yishu Studio Col — render dinámico del catálogo a partir de YISHU_DATA
// No usa fetch() a propósito: el sitio debe poder abrirse directo con file://

(function () {
  "use strict";

  const DATA = typeof YISHU_DATA !== "undefined" ? YISHU_DATA : window.YISHU_DATA;
  if (!DATA) {
    console.error("YISHU_DATA no está disponible. Revisa que data/products.js se cargue antes de js/app.js.");
    return;
  }

  const WA_NUMBER = DATA.whatsappNumber;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wideScreen = window.matchMedia("(min-width: 1100px)");

  // ---------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------

  function waUrl(text) {
    return `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodeURIComponent(text)}`;
  }

  function waLink(product) {
    const text = product.quote
      ? `¡Hola! Me interesa "${product.name}" (${product.price}) y quisiera una cotización personalizada.`
      : `¡Hola! Me interesa "${product.name}" (${product.waPrice}). ¿Está disponible? Quisiera pedirlo o resolver unas dudas.`;
    return waUrl(text);
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function txt(tag, className, text) {
    const node = el(tag, className);
    node.textContent = text;
    return node;
  }

  function photosOf(product) {
    if (product.gallery && product.gallery.length) return product.gallery;
    return product.image ? [product.image] : [];
  }

  // Cada precio alterno ("$30.000 con luz · $25.000 sin luz") va en su propia línea.
  function fillPrice(node, product) {
    String(product.price)
      .split(" · ")
      .forEach((part) => node.appendChild(txt("span", "", part)));
    if (product.quote) node.appendChild(txt("small", "", "Cotización según diseño"));
  }

  // ---------------------------------------------------------------------
  // Capas superpuestas (detalle de producto y categorías).
  // Cada una apila una entrada en el historial: el botón "atrás" del
  // celular la cierra en vez de sacar a la persona de la página.
  // ---------------------------------------------------------------------

  const overlayStack = [];
  let afterClose = null;

  function syncScrollLock() {
    document.body.classList.toggle("no-scroll", overlayStack.some((o) => o.lock));
  }

  function openOverlay(closeFn, lock) {
    overlayStack.push({ close: closeFn, lock: lock });
    // Mientras haya una capa abierta, el navegador no debe "devolver" el scroll al
    // cerrarla: si no, pisaría el desplazamiento hacia la categoría elegida.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    history.pushState({ yishuOverlay: true }, "");
    syncScrollLock();
  }

  function dismissOverlay(closeFn, then) {
    if (!overlayStack.some((o) => o.close === closeFn)) {
      if (then) then();
      return;
    }
    afterClose = then || null;
    history.back();
  }

  window.addEventListener("popstate", () => {
    if (!overlayStack.length) return;
    const top = overlayStack.pop();
    top.close();
    syncScrollLock();
    if (afterClose) {
      const fn = afterClose;
      afterClose = null;
      fn();
    }
    if (!overlayStack.length && "scrollRestoration" in history) {
      setTimeout(() => {
        if (!overlayStack.length) history.scrollRestoration = "auto";
      }, 800);
    }
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && overlayStack.length) {
      dismissOverlay(overlayStack[overlayStack.length - 1].close);
    }
  });

  // ---------------------------------------------------------------------
  // Detalle de producto: hoja que sube desde abajo en celular y ventana
  // centrada en computador. Fotos (con deslizar), descripción completa,
  // precio y botón de WhatsApp.
  // ---------------------------------------------------------------------

  let pv = null;
  let pvPhotos = [];
  let pvIndex = 0;
  let pvLastFocus = null;

  function ensureProductView() {
    if (pv) return pv;
    const root = el("div", "pview");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "pview-name");
    root.innerHTML = `
      <div class="pview__panel">
        <button class="pview__close" type="button" aria-label="Cerrar">✕</button>
        <div class="pview__media">
          <img class="pview__img" alt="">
          <div class="pview__thumbs"></div>
        </div>
        <div class="pview__body">
          <h3 class="pview__name" id="pview-name"></h3>
          <p class="pview__desc"></p>
          <p class="pview__pers"></p>
          <div class="pview__price"></div>
          <a class="btn-wa btn-wa--lg" target="_blank" rel="noopener"></a>
        </div>
      </div>`;

    pv = {
      root: root,
      panel: root.querySelector(".pview__panel"),
      close: root.querySelector(".pview__close"),
      media: root.querySelector(".pview__media"),
      img: root.querySelector(".pview__img"),
      thumbs: root.querySelector(".pview__thumbs"),
      name: root.querySelector(".pview__name"),
      desc: root.querySelector(".pview__desc"),
      pers: root.querySelector(".pview__pers"),
      price: root.querySelector(".pview__price"),
      cta: root.querySelector(".btn-wa"),
    };

    pv.close.addEventListener("click", () => dismissOverlay(closeProductView));
    root.addEventListener("click", (ev) => {
      if (ev.target === root) dismissOverlay(closeProductView);
    });

    // Deslizar la foto hacia los lados cambia de foto
    let startX = null;
    pv.img.addEventListener("touchstart", (ev) => { startX = ev.touches[0].clientX; }, { passive: true });
    pv.img.addEventListener("touchend", (ev) => {
      if (startX === null || pvPhotos.length < 2) return;
      const dx = ev.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) showPhoto(pvIndex + (dx < 0 ? 1 : -1));
    });

    document.body.appendChild(root);
    return pv;
  }

  function showPhoto(i) {
    pvIndex = (i + pvPhotos.length) % pvPhotos.length;
    pv.img.src = pvPhotos[pvIndex];
    pv.thumbs.querySelectorAll("button").forEach((b, n) => b.classList.toggle("active", n === pvIndex));
  }

  function openProductView(product) {
    const v = ensureProductView();
    pvPhotos = photosOf(product);

    v.name.textContent = product.name;
    v.desc.textContent = product.desc || "";
    v.desc.hidden = !product.desc;
    v.pers.textContent = product.personalizable ? "✎ Personalizable: cuéntanos qué quieres que lleve." : "";
    v.pers.hidden = !product.personalizable;
    v.price.innerHTML = "";
    fillPrice(v.price, product);
    v.cta.href = waLink(product);
    v.cta.textContent = product.quote ? "Cotizar por WhatsApp" : "Pedir por WhatsApp";

    v.media.classList.toggle("pview__media--empty", !pvPhotos.length);
    v.thumbs.innerHTML = "";
    if (pvPhotos.length) {
      v.img.alt = product.name;
      v.img.hidden = false;
      if (pvPhotos.length > 1) {
        pvPhotos.forEach((src, n) => {
          const b = el("button");
          b.type = "button";
          b.setAttribute("aria-label", `Ver foto ${n + 1} de ${pvPhotos.length}`);
          const t = el("img");
          t.src = src;
          t.alt = "";
          b.appendChild(t);
          b.addEventListener("click", () => showPhoto(n));
          v.thumbs.appendChild(b);
        });
      }
      showPhoto(0);
    } else {
      v.img.hidden = true;
    }
    v.thumbs.hidden = pvPhotos.length < 2;

    pvLastFocus = document.activeElement;
    v.root.classList.add("pview--open");
    v.panel.scrollTop = 0;
    openOverlay(closeProductView, true);
    v.close.focus({ preventScroll: true });
  }

  function closeProductView() {
    if (!pv) return;
    pv.root.classList.remove("pview--open");
    if (pvLastFocus && pvLastFocus.focus) pvLastFocus.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------
  // Tarjetas y categorías
  // ---------------------------------------------------------------------

  function buildCard(product) {
    const card = el("article", "card");
    const photos = photosOf(product);

    const media = el("button", "card__media");
    media.type = "button";
    media.setAttribute("aria-label", `Ver fotos y detalle: ${product.name}`);
    let mainImg = null;
    if (photos.length) {
      mainImg = el("img");
      mainImg.src = photos[0];
      mainImg.alt = product.name;
      mainImg.loading = "lazy";
      mainImg.decoding = "async";
      media.appendChild(mainImg);
      if (photos.length > 1) media.appendChild(txt("span", "card__count", "▣ " + photos.length));
    } else {
      // Sin foto todavía — estado de espera, honesto, sin inventar imagen
      media.classList.add("card__media--placeholder");
      media.innerHTML = `<span>📸</span><span>Foto próximamente</span>`;
    }
    card.appendChild(media);

    // Miniaturas (solo en pantallas grandes; en celular las fotos están en el detalle)
    if (photos.length > 1) {
      const thumbs = el("div", "card__thumbs");
      photos.forEach((src, i) => {
        const t = el("img");
        t.src = src;
        t.alt = product.name + " - foto " + (i + 1);
        t.loading = "lazy";
        if (i === 0) t.classList.add("active");
        t.addEventListener("click", () => {
          mainImg.src = src;
          thumbs.querySelectorAll("img").forEach((n) => n.classList.remove("active"));
          t.classList.add("active");
        });
        thumbs.appendChild(t);
      });
      card.appendChild(thumbs);
    }

    const body = el("div", "card__body");

    const name = txt("button", "card__name", product.name);
    name.type = "button";
    body.appendChild(name);
    if (product.desc) body.appendChild(txt("p", "card__desc", product.desc));
    if (product.personalizable) body.appendChild(txt("p", "card__personalized", "✎ Personalizable"));

    const footer = el("div", "card__footer");
    const priceWrap = el("div", "card__price");
    fillPrice(priceWrap, product);
    footer.appendChild(priceWrap);

    const btn = el("a", "btn-wa", product.quote ? "Cotizar por WhatsApp" : "Pedir por WhatsApp");
    btn.href = waLink(product);
    btn.target = "_blank";
    btn.rel = "noopener";
    footer.appendChild(btn);

    body.appendChild(footer);
    card.appendChild(body);

    // Tocar la tarjeta (menos el botón de WhatsApp y las miniaturas) abre el detalle
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("a, .card__thumbs")) return;
      openProductView(product);
    });

    return card;
  }

  function renderGrid(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;
    products.forEach((p) => container.appendChild(buildCard(p)));
  }

  function renderCatalogSection(section) {
    const wrap = el("section", "category");
    wrap.id = section.id;

    const head = el("div", "category__head");
    const titleClass = section.id === "smokeshop" ? "category__title category__title--plain" : "category__title";
    head.appendChild(txt("h3", titleClass, section.label));
    head.appendChild(
      el(
        "p",
        "category__cta",
        `<strong>¿Buscas algo distinto?</strong> Hacemos pedidos personalizados y algunos colores se cambian sin costo extra.`
      )
    );
    if (section.badge) head.appendChild(txt("p", "category__badge", section.badge));
    wrap.appendChild(head);

    const grid = el("div", "grid");
    section.products.forEach((p) => grid.appendChild(buildCard(p)));
    wrap.appendChild(grid);

    return wrap;
  }

  function buildAgeDisclaimer() {
    const banner = el("div", "age-disclaimer");
    banner.innerHTML = `<span class="age-disclaimer__badge">+18</span><p>Esta sección es solo para mayores de 18 años.</p>`;
    return banner;
  }

  // ---------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------

  function renderNav() {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    // El catálogo +18 vive aparte (smokeshop.html), no sale en el menú principal.
    // Las categorías con "hidden": true se saltan (se quitan por ahora, sin borrar sus productos).
    DATA.sections
      .filter((s) => s.id !== "smokeshop" && !s.hidden)
      .forEach((section) => {
        const a = el("a", null, section.label);
        a.href = "#" + section.id;
        nav.appendChild(a);
      });
  }

  // Halloween vive al final dentro de un desplegable. Si llegan por el menú
  // o por un enlace con #halloween, se abre solo para que no parezca vacío.
  function setupHalloweenFold() {
    const fold = document.getElementById("halloween-fold");
    if (!fold) return;
    const openIfNeeded = () => {
      if (location.hash === "#halloween") fold.open = true;
    };
    openIfNeeded();
    window.addEventListener("hashchange", () => {
      openIfNeeded();
      if (location.hash === "#halloween") {
        const target = document.getElementById("halloween");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // -------------------------------------------------------------------
  // Menú de categorías
  //  - Computador: rueda fija a la izquierda. Muestra la categoría actual y
  //    las vecinas; "Ver todas" abre la lista completa para elegir cualquiera.
  //  - Celular: botón flotante con la categoría actual; al tocarlo sube una
  //    hoja con TODAS las categorías para elegir.
  // -------------------------------------------------------------------
  function setupCategoryNav() {
    const sections = DATA.sections.filter(
      (s) => !s.hidden && s.id !== "smokeshop" && document.getElementById(s.id)
    );
    if (!sections.length) return;

    const ITEM_H = 38;
    let active = -1;
    let panelOpen = false;

    // ---- Contenedor fijo: botón (celular) + rueda (computador) -----------
    const nav = el("nav", "wheel");
    nav.setAttribute("aria-label", "Categorías del catálogo");

    const pill = el("button", "wheel__pill");
    pill.type = "button";
    pill.setAttribute("aria-haspopup", "dialog");
    pill.setAttribute("aria-label", "Abrir todas las categorías");
    pill.innerHTML =
      '<svg class="wheel__icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">' +
      '<path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';
    const pillLabel = el("span", "wheel__pill-label");
    pill.appendChild(pillLabel);
    nav.appendChild(pill);

    const drum = el("div", "wheel__drum");
    const track = el("div", "wheel__track");
    drum.appendChild(track);
    const items = sections.map((s, i) => {
      const a = el("a", "wheel__item");
      a.href = "#" + s.id;
      a.appendChild(el("span", "wheel__dot"));
      a.appendChild(txt("span", "wheel__text", s.label));
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        goTo(i);
      });
      track.appendChild(a);
      return a;
    });
    nav.appendChild(drum);

    const allBtn = txt("button", "wheel__all", "Ver todas ▸");
    allBtn.type = "button";
    allBtn.setAttribute("aria-haspopup", "dialog");
    nav.appendChild(allBtn);

    // ---- Lista completa de categorías ------------------------------------
    const panel = el("div", "catpanel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Categorías");
    const scrim = el("div", "catpanel__scrim");
    const sheet = el("div", "catpanel__sheet");
    const head = el("div", "catpanel__head");
    head.appendChild(txt("p", "catpanel__title", "Categorías"));
    const closeBtn = txt("button", "catpanel__close", "✕");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Cerrar");
    head.appendChild(closeBtn);
    sheet.appendChild(head);

    const list = el("ul", "catpanel__list");
    const panelItems = sections.map((s, i) => {
      const li = el("li");
      const a = el("a", "catpanel__item");
      a.href = "#" + s.id;
      a.appendChild(el("span", "catpanel__dot"));
      a.appendChild(txt("span", "catpanel__label", s.label));
      a.appendChild(txt("span", "catpanel__count", String(s.products.length)));
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        goTo(i);
      });
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    sheet.appendChild(list);
    panel.appendChild(scrim);
    panel.appendChild(sheet);

    function openPanel() {
      if (panelOpen) return;
      panelOpen = true;
      panel.classList.add("catpanel--open");
      openOverlay(closePanel, !wideScreen.matches);
      const current = panelItems[Math.max(active, 0)];
      if (current) {
        current.focus({ preventScroll: true });
        current.scrollIntoView({ block: "center" });
      }
    }

    function closePanel() {
      panelOpen = false;
      panel.classList.remove("catpanel--open");
    }

    pill.addEventListener("click", openPanel);
    allBtn.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", () => dismissOverlay(closePanel));
    scrim.addEventListener("click", () => dismissOverlay(closePanel));

    // ---- Comportamiento ----------------------------------------------------
    function layout() {
      items.forEach((a, i) => {
        const o = i - active;
        const ao = Math.abs(o);
        const visible = ao <= 3;
        a.style.transform = `translateY(${o * ITEM_H * 0.94}px) rotateX(${-o * 17}deg) scale(${1 - ao * 0.06})`;
        a.style.opacity = visible ? String(Math.max(0, 1 - ao * 0.3)) : "0";
        a.style.pointerEvents = visible ? "auto" : "none";
        a.tabIndex = visible ? 0 : -1;
        a.classList.toggle("is-active", o === 0);
        if (o === 0) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      panelItems.forEach((a, i) => {
        a.classList.toggle("is-active", i === active);
        if (i === active) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }

    function setActive(i) {
      if (i === active) return;
      const first = active === -1;
      active = i;
      layout();
      pillLabel.textContent = sections[i].label;
      if (!first && !reduceMotion) {
        pillLabel.classList.remove("wheel__pill-label--roll");
        void pillLabel.offsetWidth; // reinicia la animación
        pillLabel.classList.add("wheel__pill-label--roll");
      }
    }

    function currentIndex() {
      const doc = document.documentElement;
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) return sections.length - 1;
      const mid = window.innerHeight * 0.4;
      let idx = 0;
      sections.forEach((s, i) => {
        const t = document.getElementById(s.id);
        if (t && t.getBoundingClientRect().top <= mid) idx = i;
      });
      return idx;
    }

    function goTo(i) {
      const id = sections[i].id;
      const go = () => {
        if (id === "halloween") {
          const fold = document.getElementById("halloween-fold");
          if (fold) fold.open = true;
        }
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      };
      if (panelOpen) dismissOverlay(closePanel, go);
      else go();
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setActive(currentIndex());
        // En celular el botón aparece cuando ya se pasó el encabezado
        nav.classList.toggle("wheel--show", window.scrollY > 260);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    document.body.appendChild(nav);
    document.body.appendChild(panel);
    setActive(currentIndex());
    nav.classList.toggle("wheel--show", window.scrollY > 260);
    // Las transiciones se activan después del primer acomodo para que no "salte" al cargar.
    requestAnimationFrame(() => nav.classList.add("wheel--ready"));
  }

  // ---------------------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------------------

  // Enlaces generales de WhatsApp (sin producto): <a data-wa="mensaje">
  function setupGeneralLinks() {
    document.querySelectorAll("[data-wa]").forEach((a) => {
      a.href = waUrl(a.getAttribute("data-wa"));
    });
  }

  // Página principal: todo el catálogo excepto el +18.
  function initMainCatalog() {
    renderNav();

    const bySectionId = {};
    DATA.sections.forEach((s) => (bySectionId[s.id] = s));

    if (bySectionId.halloween) renderGrid("grid-halloween", bySectionId.halloween.products);
    if (bySectionId.navidad) renderGrid("grid-navidad", bySectionId.navidad.products);

    setupHalloweenFold();

    const catalogRoot = document.getElementById("catalog-sections");
    if (catalogRoot) {
      DATA.sections
        .filter((s) => s.id !== "halloween" && s.id !== "navidad" && s.id !== "smokeshop" && !s.hidden)
        .forEach((section) => catalogRoot.appendChild(renderCatalogSection(section)));
    }

    setupCategoryNav();
  }

  // Página aparte del catálogo +18 (smokeshop.html): solo esa categoría, con su aviso.
  function initSmokeshopCatalog(root) {
    const section = DATA.sections.find((s) => s.id === "smokeshop");
    if (!section) return;
    root.appendChild(buildAgeDisclaimer());
    root.appendChild(renderCatalogSection(section));
  }

  function init() {
    const smokeshopRoot = document.getElementById("smokeshop-catalog");
    if (smokeshopRoot) {
      initSmokeshopCatalog(smokeshopRoot);
    } else {
      initMainCatalog();
    }
    setupGeneralLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
