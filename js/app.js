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

  function waLink(product) {
    let text;
    if (product.quote) {
      text = `¡Hola! Me interesó el ${product.name} (${product.price}) y quisiera una cotización personalizada.`;
    } else {
      text = `¡Hola! Me interesó el ${product.name} (${product.waPrice}) y quisiera comprarlo / tengo unas preguntas.`;
    }
    return `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodeURIComponent(text)}`;
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function buildMedia(product) {
    const media = el("div", "card__media");

    if (product.gallery && product.gallery.length) {
      const img = el("img");
      img.src = product.gallery[0];
      img.alt = product.name;
      img.loading = "lazy";
      img.classList.add("zoomable");
      img.addEventListener("click", () => openLightbox(img.src, img.alt));
      media.appendChild(img);

      const thumbs = el("div", "card__thumbs");
      product.gallery.forEach((src, i) => {
        const t = el("img");
        t.src = src;
        t.alt = product.name + " — variante " + (i + 1);
        t.loading = "lazy";
        if (i === 0) t.classList.add("active");
        t.addEventListener("click", () => {
          img.src = src;
          thumbs.querySelectorAll("img").forEach((n) => n.classList.remove("active"));
          t.classList.add("active");
        });
        thumbs.appendChild(t);
      });

      const wrapper = el("div");
      wrapper.appendChild(media);
      wrapper.appendChild(thumbs);
      return wrapper;
    }

    if (product.image) {
      const img = el("img");
      img.src = product.image;
      img.alt = product.name;
      img.loading = "lazy";
      img.classList.add("zoomable");
      img.addEventListener("click", () => openLightbox(img.src, img.alt));
      media.appendChild(img);
      return media;
    }

    // Sin foto todavía — estado de espera, honesto, sin inventar imagen
    media.classList.add("card__media--placeholder");
    media.innerHTML = `<span>📸</span><span>Foto próximamente</span>`;
    return media;
  }

  function buildCard(product) {
    const card = el("div", "card");
    card.appendChild(buildMedia(product));

    const body = el("div", "card__body");

    body.appendChild(el("div", "card__name", product.name));
    if (product.desc) body.appendChild(el("p", "card__desc", product.desc));

    if (product.personalizable) {
      body.appendChild(el("p", "card__personalized", "✎ Personalizable con el nombre que quieras"));
    }

    const footer = el("div", "card__footer");

    const priceWrap = el("div", "card__price");
    if (product.quote) {
      priceWrap.innerHTML = `${product.price}<small>Cotización según diseño</small>`;
    } else {
      priceWrap.textContent = product.price;
    }
    footer.appendChild(priceWrap);

    const btn = el("a", "btn-wa", product.quote ? "Cotizar por WhatsApp" : "Comprar por WhatsApp");
    btn.href = waLink(product);
    btn.target = "_blank";
    btn.rel = "noopener";
    footer.appendChild(btn);

    body.appendChild(footer);
    card.appendChild(body);
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
    head.appendChild(el("h3", titleClass, section.label));
    head.appendChild(el("p", "category__cta", `<strong>¿Buscas algo distinto?</strong> Aceptamos pedidos personalizados y tus propias ideas — escríbenos.`));
    head.appendChild(el("p", "category__color-note", "🎨 Todos los colores se pueden personalizar sin cambio de precio."));
    wrap.appendChild(head);

    const grid = el("div", "grid");
    section.products.forEach((p) => grid.appendChild(buildCard(p)));
    wrap.appendChild(grid);

    return wrap;
  }

  // -------------------------------------------------------------------
  // Lightbox: click en una foto de producto la abre en grande; clic
  // afuera (o Escape) la cierra y se vuelve exactamente a donde estaba,
  // porque es un overlay sobre la misma página, no una navegación.
  // -------------------------------------------------------------------
  let lightboxEl = null;
  let lightboxImg = null;

  function ensureLightbox() {
    if (lightboxEl) return;
    lightboxEl = el("div", "lightbox");
    lightboxImg = el("img");
    lightboxImg.alt = "";
    lightboxEl.appendChild(lightboxImg);
    lightboxEl.addEventListener("click", (ev) => {
      if (ev.target === lightboxEl) closeLightbox();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeLightbox();
    });
    document.body.appendChild(lightboxEl);
  }

  function openLightbox(src, alt) {
    ensureLightbox();
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightboxEl.classList.add("lightbox--open");
    document.body.classList.add("no-scroll");
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove("lightbox--open");
    document.body.classList.remove("no-scroll");
  }

  function buildAgeDisclaimer() {
    const banner = el("div", "age-disclaimer wrap");
    banner.innerHTML = `<span class="age-disclaimer__badge">+18</span><p>Lo que sigue es para mayores de edad. Adelante bajo tu propio criterio.</p>`;
    return banner;
  }

  function renderNav() {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    DATA.sections.forEach((section) => {
      const a = el("a", null, section.label);
      a.href = "#" + section.id;
      nav.appendChild(a);
    });
  }

  function init() {
    renderNav();

    const bySectionId = {};
    DATA.sections.forEach((s) => (bySectionId[s.id] = s));

    if (bySectionId.halloween) renderGrid("grid-halloween", bySectionId.halloween.products);
    if (bySectionId.navidad) renderGrid("grid-navidad", bySectionId.navidad.products);

    const catalogRoot = document.getElementById("catalog-sections");
    if (catalogRoot) {
      DATA.sections
        .filter((s) => s.id !== "halloween" && s.id !== "navidad")
        .forEach((section) => {
          if (section.id === "smokeshop") catalogRoot.appendChild(buildAgeDisclaimer());
          catalogRoot.appendChild(renderCatalogSection(section));
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
