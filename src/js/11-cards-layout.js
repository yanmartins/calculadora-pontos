  // ===== CARDS COLAPSÁVEIS (Calendário) =====
  window.toggleCard = function (id) {
    var c = $(id); if (!c) return;
    var open = c.classList.toggle('open');
    var h = c.querySelector('.card-head'); if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false');
    try {
      var st = JSON.parse(localStorage.getItem('calc-cards') || '{}');
      st[id] = open; localStorage.setItem('calc-cards', JSON.stringify(st));
    } catch (e) {}
  };
  function restoreCards() {
    try {
      var st = JSON.parse(localStorage.getItem('calc-cards') || '{}');
      Object.keys(st).forEach(function (k) {
        var c = $(k);
        if (c && c.classList.contains('collapsible')) {
          c.classList.toggle('open', !!st[k]);
          var h = c.querySelector('.card-head'); if (h) h.setAttribute('aria-expanded', st[k] ? 'true' : 'false');
        }
      });
    } catch (e) {}
  }

  // ===== LAYOUT DOS CARDS (arrastar pela alça; borda esq/dir do alvo = lado a lado) =====
  var DRAG_PAGES = ['hoje', 'banco', 'calendario', 'espelho'];
  var dragCard = null, dropTarget = null, dropMode = '';

  function layoutSave() {
    try {
      var st = {};
      DRAG_PAGES.forEach(function (p) {
        st[p] = [].map.call(document.querySelectorAll('.card-grid > .card[data-page="' + p + '"]'), function (c) {
          return { id: c.id, w: c.classList.contains('w-half') ? 'half' : 'full' };
        });
      });
      localStorage.setItem('calc-layout', JSON.stringify(st));
    } catch (e) {}
  }

  function layoutRestore() {
    var st; try { st = JSON.parse(localStorage.getItem('calc-layout')); } catch (e) {}
    if (!st) return;
    var grid = document.querySelector('.card-grid');
    DRAG_PAGES.forEach(function (p) {
      var saved = st[p]; if (!saved || !saved.length) return;
      var cards = grid.querySelectorAll('.card[data-page="' + p + '"]');
      if (!cards.length) return;
      // âncora na posição do primeiro card da página; cards fora do save ficam depois dela
      var marker = document.createComment('layout');
      grid.insertBefore(marker, cards[0]);
      saved.forEach(function (s) {
        var c = $(s.id);
        if (!c || c.getAttribute('data-page') !== p) return;
        c.classList.toggle('w-half', s.w === 'half');
        grid.insertBefore(c, marker);
      });
      grid.removeChild(marker);
    });
  }

  function dropClear() {
    if (dropTarget) dropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
    dropTarget = null; dropMode = '';
  }

  function initCardDrag() {
    var grid = document.querySelector('.card-grid');
    var sel = DRAG_PAGES.map(function (p) { return '.card[data-page="' + p + '"]'; }).join(',');
    [].forEach.call(grid.querySelectorAll(sel), function (card) {
      var head = card.querySelector('.card-head'); if (!head) return;

      var h = document.createElement('span');
      h.className = 'ms drag-handle';
      h.textContent = 'drag_indicator';
      h.title = 'Arrastar para reorganizar';
      h.setAttribute('aria-hidden', 'true');
      h.addEventListener('click', function (e) { e.stopPropagation(); }); // clique na alça não colapsa o card
      // draggable só enquanto o mouse está na alça: não interfere na seleção/inputs do card
      h.addEventListener('mousedown', function () { card.draggable = true; });
      head.appendChild(h);

      card.addEventListener('dragstart', function (e) {
        dragCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.id); } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        card.draggable = false;
        dropClear();
        dragCard = null;
      });
      card.addEventListener('dragover', function (e) {
        if (!dragCard || dragCard === card) return;
        if (card.getAttribute('data-page') !== dragCard.getAttribute('data-page')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var mode = x < .28 ? 'left' : x > .72 ? 'right'
                 : (e.clientY - r.top) / r.height < .5 ? 'top' : 'bottom';
        if (card !== dropTarget || mode !== dropMode) {
          dropClear();
          dropTarget = card; dropMode = mode;
          card.classList.add('drop-' + mode);
        }
      });
      card.addEventListener('dragleave', function (e) {
        if (card === dropTarget && !card.contains(e.relatedTarget)) dropClear();
      });
      card.addEventListener('drop', function (e) {
        if (!dragCard || dragCard === card || !dropMode) return;
        e.preventDefault();
        var mode = dropMode; dropClear();
        if (mode === 'left' || mode === 'right') {
          // lado a lado: arrastado e alvo viram meia largura
          dragCard.classList.add('w-half');
          card.classList.add('w-half');
          grid.insertBefore(dragCard, mode === 'left' ? card : card.nextSibling);
        } else {
          // empilhado: o arrastado volta à largura total
          dragCard.classList.remove('w-half');
          grid.insertBefore(dragCard, mode === 'top' ? card : card.nextSibling);
        }
        layoutSave();
      });
    });
  }

