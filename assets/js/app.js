document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // 1) Filtre recherche catégories
  // ==============================
  const input = document.getElementById("search");
  const cards = [...document.querySelectorAll("#cards > a")];

  if (input) {
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      cards.forEach(card => {
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

  const questionEl = document.getElementById("question");
  const btnNew = document.getElementById("new-question");

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
      link: "../villes_autour_de_leau.html"
    },
    {
      date: "Dimanche 18 janvier 2026",
      title: "sujet à venir",
      desc: "patience",
      link: "#"
    },
    {
      date: "Dimanche 25 janvier 2026",
      title: "sujet à venir",
      desc: "patience",
      link: "#"
    },
  ];

  let currentTopic = 0;

  const dateEl = document.getElementById("latest-date");
  const titleEl = document.getElementById("latest-title");
  const descEl = document.getElementById("latest-desc");
  const linkEl = document.getElementById("latest-link");
  const dotsContainer = document.getElementById("topic-dots");

  // Si tu n'es pas sur une page qui a le bloc "Nouveau sujet", on n'exécute pas
  const hasTopicBlock = dateEl && titleEl && descEl && linkEl && dotsContainer;

  function updateTopic(index) {
    if (!hasTopicBlock) return;
    const topic = topics[index];

    dateEl.textContent = topic.date;
    titleEl.textContent = topic.title;
    descEl.textContent = topic.desc;
    linkEl.href = topic.link;

    // Active la bulle correspondante
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
// 4) Loader de pages (clic -> fetch -> injecte dans #page-content)
// =====================================================
document.addEventListener("click", async (e) => {
  const link = e.target.closest("a.load-page");
  if (!link) return;

  const content = document.getElementById("page-content");
  if (!content) return; // si on n’est pas sur une page catégorie

  e.preventDefault();

  const url = link.getAttribute("href");
  const activeClass = "is-active";

  // toggle : reclic sur la même carte = fermer
  const isAlreadyActive = link.classList.contains(activeClass);
  document.querySelectorAll("a.load-page." + activeClass).forEach(a => a.classList.remove(activeClass));

  if (isAlreadyActive) {
    content.innerHTML = `
      <div class="reader-empty">
        <h3>Ouvre un chapitre</h3>
        <p>Le contenu s’affichera ici, sans quitter la page.</p>
      </div>`;
    return;
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const html = await res.text();

    content.innerHTML = html;
    link.classList.add(activeClass);
    content.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    content.innerHTML = `<p>Erreur lors du chargement de la page.</p>`;
  }
});

// =======================================
// 5) Recherche plein-texte dans les chapitres
// =======================================
document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("search");
  const resultsBox = document.getElementById("search-results");
  const reader = document.getElementById("page-content");

  // On active seulement si on est sur une page qui a #page-content + #search-results
  if (!searchInput || !resultsBox || !reader) return;

  const chapterLinks = [...document.querySelectorAll("a.load-page[href]")];

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
      const url = a.getAttribute("href");
      const label = a.querySelector("h4")?.innerText?.trim() || a.innerText.trim();

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const html = await res.text();
      const parsed = parseChapter(html);

      chapterIndex.push({
        url,
        cardLabel: label,           // titre côté carte
        chapterTitle: parsed.title, // titre h2 du chapitre
        text: parsed.text,
        rawHtml: html
      });
    });

    await Promise.all(fetches);
  } catch (e) {
    // Si un chapitre manque, on n'empêche pas la page de fonctionner
    console.warn("Indexation chapitres : erreur", e);
  }

  // util : extrait autour de la requête
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

    const html = items.slice(0, 8).map(item => {
      const snippet = makeSnippet(item.text, q);
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
    chapterLinks.forEach(card => {
      const text = (card.innerText + " " + (card.dataset.keywords || "")).toLowerCase();
      card.style.display = q ? (text.includes(q) ? "" : "none") : "";
    });

    if (!q || q.length < 2) {
      showResults([], "");
      return;
    }

    const hits = chapterIndex
      .filter(ch => ch.text.toLowerCase().includes(q) || ch.chapterTitle.toLowerCase().includes(q))
      .map(ch => {
        // score simple : titre > texte
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
    const url = a.dataset.url;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      reader.innerHTML = html;

      // active la carte correspondante si elle existe
      document.querySelectorAll("a.load-page.is-active").forEach(x => x.classList.remove("is-active"));
      const card = document.querySelector(`a.load-page[href="${CSS.escape(url)}"]`);
      if (card) card.classList.add("is-active");

      reader.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      reader.innerHTML = `<p>Erreur lors du chargement du chapitre.</p>`;
    }
  });
});

document.addEventListener("click", (e) => {
  const alpha = e.target.closest(".alpha__item.load-page");
  if (!alpha) return;

  document.querySelectorAll(".alpha__item.is-active")
    .forEach(x => x.classList.remove("is-active"));

  alpha.classList.add("is-active");
});
