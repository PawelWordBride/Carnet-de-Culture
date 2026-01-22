(function () {
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Récupère la banque globale définie dans facts.js
  const banks = window.CDC_FACTS || {};

  document.querySelectorAll(".saviez-vous").forEach((box) => {
    const scope = box.dataset.scope || "home";
    const facts = banks[scope] || banks.home || [];

    const textEl = box.querySelector(".saviez-texte");
    if (!textEl) return;

    textEl.textContent = facts.length ? pickRandom(facts) : "Ajoute des faits dans assets/js/facts.js";
  });
})();
