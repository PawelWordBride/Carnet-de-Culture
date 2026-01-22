/* =========================================================
   app.js — Carnet de Culture
   - chemins robustes (chapitres + fiches) même via injection
   - loader avec messages d’erreur utiles
   - recherche plein-texte compatible avec chemins relatifs
   ========================================================= */

(() => {
  "use strict";

  // -----------------------
  // Utils
  // -----------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Résout un href relatif en URL fetchable (clé pour ton bug)
  const resolveUrl = (href) => new URL(href, document.baseURI).toString();

  const setReaderEmpty = (content, title = "Ouvre un chapitre", desc = "Le contenu s’affichera ici, sans quitter la page.") => {
    content.innerHTML = `
      <div class="reader-empty">
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>`;
  };

  // =====================================================
  // DOMContentLoaded #1 : UI (filtre, question, topics)
  // =====================================================
  document.addEventListener("DOMContentLoaded", () => {
    // ==============================
    // 1) Filtre recherche catégories
    // ==============================
    const input = $("#search");
    const cards = $$("#cards > a");

    if (input && cards.length) {
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        cards.forEach((card) => {
          const text = (card.innerText + " " + (card.dataset.keywords || "")).toLowerCase();
          card.style.display = q ? (text.includes(q) ? "" : "none") : "";
        });
      });
    }

    // ==============================
    // 2) Question du jour
    // ==============================
    const questions = [
      "Pourquoi la glace flotte-t-elle sur l’eau ?",
      "Qu’est-ce qui différencie une théorie scientifique d’une hypothèse ?",
      "Pourquoi la lumière peut-elle être décrite comme onde et particule ?",
      "Comment les villes changent-elles quand elles grandissent trop vite ?",
      "Pourquoi certaines innovations transforment-elles toute une société ?",
      "Qu’est-ce qui fait qu’un récit historique devient un mythe ?",
      "Comment l’énergie se transforme-t-elle dans les systèmes vivants ?",
      "Peut-on mesurer objectivement la beauté d’un design ?",
      "Qu’est-ce qu’on gagne (et perd) quand on simplifie une idée complexe ?",
      "Pourquoi certaines civilisations se sont développées autour des fleuves alors que d’autres ont prospéré en milieu aride ?",
      "Qu’est-ce qui distingue réellement une révolution technologique d’une simple amélioration technique ?",
      "Comment une invention scientifique modifie-t-elle la société au-delà de son usage initial ?",
      "Pourquoi certains animaux deviennent-ils des symboles culturels forts dans certaines civilisations ?",
      "À partir de quand peut-on dire qu’un territoire devient une nation ?"
    ];

    const questionEl = $("#question");
    const btnNew = $("#new-question");

    function setRandomQuestion() {
      if (!questionEl) return;
      const i = Math.floor(Math.random() * questions.length);
      questionEl.textContent = questions[i];
    }

    setRandomQuestion();
    if (btnNew) btnNew.addEventListener("click", setRandomQuestion);

    // ==============================
    // 3) Nouveau sujet (bulles)
    // ==============================
    const topics = [
      {
        date: "Dimanche 11 janvier 2026",
        title: "Pourquoi certaines villes sont construites autour de l’eau ?",
        desc: "De Venise à Amsterdam, l’eau façonne l’urbanisme, l’économie et l’imaginaire des villes à travers l’histoire.",
        link: "pages/geo/chapitres_pays_regions_et_villes/villes_autour_de_leau.html"
      },
      {
        date: "Dimanche 18 janvier 2026",
        title: "Les États-Unis : géographie, population, puissance",
        desc: "Puissance mondiale, territoire-continent et mosaïque de régions aux dynamiques contrastées.",
        link: "pages/geo/chapitres_pays_regions_et_villes/usa.html"
      },
      {
        date: "Dimanche 25 janvier 2026",
        title: "sujet à venir",
        desc: "patience",
        link: "#"
      }
    ];

    let currentTopic = 0;

    const dateEl = $("#latest-date");
    const titleEl = $("#latest-title");
    const descEl = $("#latest-desc");
    const linkEl = $("#latest-link");
    const dotsContainer = $("#topic-dots");

    const hasTopicBlock = dateEl && titleEl && descEl && linkEl && dotsContainer;

    function updateTopic(index) {
      if (!hasTopicBlock) return;
      const topic = topics[index];

      dateEl.textContent = topic.date;
      titleEl.textContent = topic.title;
      descEl.textContent = topic.desc;
      linkEl.href = topic.link;

      const dots = dotsContainer.querySelectorAll("button");
      dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    }

    function createDots() {
      if (!hasTopicBlock) return;
      dotsContainer.innerHTML = "";

      topics.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Sujet ${index + 1}`);

        dot.addEventListener("click", () => {
          currentTopic = index;
          updateTopic(currentTopic);
        });

        dotsContainer.appendChild(dot);
      });
    }

    if (hasTopicBlock && topics.length) {
      createDots();
      updateTopic(currentTopic);
    }
  });

  // =====================================================
  // 4) Loader (clic .load-page -> fetch -> injecte #page-content)
  //    ✅ corrige ton bug : resolveUrl() + debug HTTP
  // =====================================================
  document.addEventListener("click", async (e) => {
    const link = e.target.closest("a.load-page");
    if (!link) return;

    const content = $("#page-content");
    if (!content) return; // pas sur une page catégorie

    e.preventDefault();

    const activeClass = "is-active";
    const rawHref = link.getAttribute("href") || "";

    // toggle : reclic sur la même carte = fermer
    const isAlreadyActive = link.classList.contains(activeClass);
    $$("a.load-page." + activeClass).forEach((a) => a.classList.remove(activeClass));

    if (isAlreadyActive) {
      setReaderEmpty(content);
      return;
    }

    // état chargement
    content.innerHTML = `
      <div class="reader-empty">
        <h3>Chargement…</h3>
        <p>📄 ${rawHref}</p>
      </div>`;

    // URL robuste (clé)
    const url = resolveUrl(rawHref);
    console.log("📥 Chargement:", url);

    try {
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        console.error("❌ HTTP", res.status, res.statusText, url);
        content.innerHTML = `
          <div class="reader-empty">
            <h3>Erreur de chargement</h3>
            <p>HTTP ${res.status} — ${res.statusText}</p>
            <p><code>${url}</code></p>
          </div>`;
        return;
      }

      const html = await res.text();
      content.innerHTML = html;

      link.classList.add(activeClass);
      content.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (err) {
      console.error("❌ Exception fetch:", err, url);
      content.innerHTML = `
        <div class="reader-empty">
          <h3>Erreur lors du chargement</h3>
          <p>${String(err)}</p>
          <p><code>${url}</code></p>
        </div>`;
    }
  });

  // Optionnel : hook render (si tu as une fonction globale)
  requestAnimationFrame(() => {
    if (typeof window.renderRomanceBooks === "function") {
      window.renderRomanceBooks();
    }
  });

  // =====================================================
  // 5) Recherche plein-texte dans les chapitres
  //    ✅ fetch avec resolveUrl() pour éviter les 404
  // =====================================================
  document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = $("#search");
    const resultsBox = $("#search-results");
    const reader = $("#page-content");

    if (!searchInput || !resultsBox || !reader) return;

    const chapterLinks = $$("a.load-page[href]");

    // Petit index en mémoire
    const chapterIndex = [];

    // util : extraire texte + titre depuis un fragment html
    const parseChapter = (html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const h2 = doc.querySelector("h2")?.innerText?.trim() || "Chapitre";
      const text = doc.body.innerText.replace(/\s+/g, " ").trim();
      return { title: h2, text };
    };

    // Charger tous les chapitres (1 fois)
    try {
      const fetches = chapterLinks.map(async (a) => {
        const rawHref = a.getAttribute("href") || "";
        const url = resolveUrl(rawHref); // ✅

        const label = a.querySelector("h4")?.innerText?.trim() || a.innerText.trim();

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);

        const html = await res.text();
        const parsed = parseChapter(html);

        chapterIndex.push({
          url,                       // ✅ url absolue (résolue)
          rawHref,                   // href d’origine (utile si tu veux)
          cardLabel: label,
          chapterTitle: parsed.title,
          text: parsed.text,
          rawHtml: html
        });
      });

      await Promise.all(fetches);
    } catch (e) {
      console.warn("Indexation chapitres : erreur", e);
    }

    const makeSnippet = (text, q) => {
      const i = text.toLowerCase().indexOf(q);
      if (i === -1) return text.slice(0, 120) + (text.length > 120 ? "…" : "");
      const start = Math.max(0, i - 50);
      const end = Math.min(text.length, i + 70);
      let snippet = text.slice(start, end);
      if (start > 0) snippet = "…" + snippet;
      if (end < text.length) snippet = snippet + "…";
      return snippet;
    };

    const showResults = (items, q) => {
      if (!q) {
        resultsBox.hidden = true;
        resultsBox.innerHTML = "";
        return;
      }

      if (!items.length) {
        resultsBox.hidden = false;
        resultsBox.innerHTML = `
          <p class="sr-title">Résultats</p>
          <div class="sr-item">
            <strong>Aucun résultat</strong>
            <small>Essaie un autre mot-clé.</small>
          </div>
        `;
        return;
      }

      const html = items.slice(0, 8).map((item) => {
        const snippet = makeSnippet(item.text, q);
        // href + data-url = URL résolue pour que le clic marche partout
        return `
          <a class="sr-item" href="${item.url}" data-url="${item.url}">
            <strong>${item.chapterTitle}</strong>
            <small>${snippet}</small>
          </a>
        `;
      }).join("");

      resultsBox.hidden = false;
      resultsBox.innerHTML = `<p class="sr-title">Résultats</p>${html}`;
    };

    // Recherche
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();

      // Filtre cartes en même temps
      chapterLinks.forEach((card) => {
        const text = (card.innerText + " " + (card.dataset.keywords || "")).toLowerCase();
        card.style.display = q ? (text.includes(q) ? "" : "none") : "";
      });

      if (!q || q.length < 2) {
        showResults([], "");
        return;
      }

      const hits = chapterIndex
        .filter((ch) => ch.text.toLowerCase().includes(q) || ch.chapterTitle.toLowerCase().includes(q))
        .map((ch) => {
          const t = ch.chapterTitle.toLowerCase().includes(q) ? 2 : 0;
          const b = ch.text.toLowerCase().includes(q) ? 1 : 0;
          return { ...ch, score: t + b };
        })
        .sort((a, b) => b.score - a.score);

      showResults(hits, q);
    });

    // Clic résultat => ouvre le chapitre dans le reader
    resultsBox.addEventListener("click", async (e) => {
      const a = e.target.closest("a.sr-item");
      if (!a) return;

      e.preventDefault();

      // data-url est déjà absolue (mais on sécurise quand même)
      const url = resolveUrl(a.dataset.url || a.getAttribute("href") || "");

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const html = await res.text();
        reader.innerHTML = html;

        // active la carte correspondante si elle existe
        $$("a.load-page.is-active").forEach((x) => x.classList.remove("is-active"));

        // Comme les cartes ont souvent des href relatifs,
        // on compare via URL résolue
        const card = $$("a.load-page[href]").find((cardEl) => {
          const cardUrl = resolveUrl(cardEl.getAttribute("href"));
          return cardUrl === url;
        });

        if (card) card.classList.add("is-active");

        reader.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        reader.innerHTML = `<p>Erreur lors du chargement du chapitre.</p>`;
      }
    });
  });

  // =====================================================
  // 6) Active state "alpha" (liste A-Z) - inchangé
  // =====================================================
  document.addEventListener("click", (e) => {
    const alpha = e.target.closest(".alpha__item.load-page");
    if (!alpha) return;

    $$(".alpha__item.is-active").forEach((x) => x.classList.remove("is-active"));
    alpha.classList.add("is-active");
  });

})();


  // =====================================================
  //  Saviez vous bloc
  // =====================================================


(function () {
  const banks = {
    home: [
      "Un carnet de savoir est plus efficace quand il relie les idées plutôt que d’accumuler des pages.",
      "La mémoire humaine retient mieux une information quand elle est associée à une histoire ou une image.",
      "Les liens entre disciplines (sciences, histoire, arts) améliorent la compréhension à long terme."
    ],
    ingenierie: [
      "En ingénierie, une grande partie des pannes viennent des interfaces entre systèmes, pas des pièces seules.",
      "Le cycle en V sert surtout à garantir la traçabilité entre exigences et tests.",
      "Une estimation d’ordre de grandeur évite souvent des erreurs de conception coûteuses."
    ],
    geographie: [
      "La géographie étudie autant les sociétés que les milieux : c’est une science des relations.",
      "Les fleuves ont structuré les réseaux urbains bien avant les routes modernes.",
      "Les frontières sont souvent des constructions politiques plus que des limites naturelles."
    ],
    histoire: [
      "Les sources historiques ne racontent pas le passé : elles donnent des traces à interpréter.",
      "La même période peut être vécue très différemment selon les régions du monde.",
      "Comprendre une époque, c’est aussi comprendre ses techniques et ses ressources."
    ]
    // Ajoute les autres catégories ici quand tu veux.
  };

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  document.querySelectorAll(".saviez-vous").forEach((box) => {
    const scope = box.dataset.scope || "home";
    const facts = banks[scope] || banks.home;

    const textEl = box.querySelector(".saviez-texte");
    if (!textEl) return;

    textEl.textContent = pickRandom(facts);
  });
})();
