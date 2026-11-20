// Filtre des projets par catégorie + fermeture du menu mobile.
// Fichier externe (pas de script inline) pour permettre une CSP stricte.
(function () {
  var box = document.querySelector('[data-filter]');
  if (box) {
    var buttons = box.querySelectorAll('button[data-cat]');
    var cards = document.querySelectorAll('[data-project]');
    var status = box.querySelector('[data-filter-status]');
    box.hidden = false;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-cat');
        var shown = 0;
        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        cards.forEach(function (card) {
          var match = cat === 'all' || card.getAttribute('data-category') === cat;
          card.hidden = !match;
          if (match) shown++;
        });
        if (status) {
          status.textContent = shown + ' ' + (shown > 1 ? box.dataset.liveMany : box.dataset.liveOne);
        }
      });
    });
  }

  // Menu mobile (<details>) : se ferme après un clic sur un lien ou avec Échap
  var menu = document.querySelector('[data-menu]');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) menu.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
  }
})();
