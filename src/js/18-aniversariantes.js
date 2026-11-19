  // ===== ANIVERSARIANTES: nomes digitados -> data de nascimento via Ícarus (cache local) =====
  var aniver = []; // [{q, nome, md:'MM-DD'}] — só dia/mês, o ano não é guardado
  function aniverLoad() { try { aniver = JSON.parse(localStorage.getItem('icarus-aniver')) || []; } catch (e) { aniver = []; } }
  function aniverSave() { try { localStorage.setItem('icarus-aniver', JSON.stringify(aniver)); } catch (e) {} }
  function aniverStatus(msg, cls) { var el = $('aniverStatus'); if (el) { el.textContent = msg || ''; el.className = 'icarus-status' + (cls ? ' ' + cls : ''); } }
  function escH(t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function normNome(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function aniverMD(p) {
    var d = String(p.dataNascimento || ''), f = String(p.dataNascimentoFormatado || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(5, 10);
    if (/^\d{2}\/\d{2}\/\d{4}/.test(f)) return f.slice(3, 5) + '-' + f.slice(0, 2);
    return null;
  }
  function aniverDaysUntil(md) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var mo = +md.slice(0, 2) - 1, dd = +md.slice(3, 5);
    var n = new Date(t.getFullYear(), mo, dd);
    if (n < t) n = new Date(t.getFullYear() + 1, mo, dd);
    return Math.round((n - t) / 864e5);
  }
  // pesquisa pelo filtro de nome; o filtro do lado do cliente garante o casamento mesmo se a API devolver a mais
  function aniverSearch(q) {
    if (!icarusAuth || !icarusAuth.token) return Promise.reject(new Error('conecte sua conta \u00cdcarus na aba Mais'));
    return fetch(ICARUS_BASE + '/pessoa/pesquisa/0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + icarusAuth.token },
      body: JSON.stringify({ nome: q })
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error('sess\u00e3o expirada \u2014 conecte novamente na aba Mais');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      var list = (data && (data.content || data)) || [], nq = normNome(q).split(/\s+/);
      if (!Array.isArray(list)) list = [];
      return {
        total: (data && data.totalElements) || list.length,
        people: list.filter(function (p) {
          var nn = normNome(p.nome);
          return p.nome && aniverMD(p) && nq.every(function (w) { return nn.indexOf(w) >= 0; });
        }).map(function (p) { return { nome: p.nome.trim(), md: aniverMD(p) }; })
      };
    });
  }
  function aniverPush(q, p) {
    if (aniver.some(function (a) { return a.nome === p.nome; })) { aniverStatus(p.nome + ' j\u00e1 est\u00e1 na lista', ''); return; }
    aniver.push({ q: q, nome: p.nome, md: p.md });
    aniverSave(); renderAniver();
    aniverStatus(p.nome + ' adicionado(a)', 'ok');
  }
  var aniverPending = null;
  window.addAniver = function () {
    var inp = $('aniverNome'), q = inp.value.trim();
    if (q.length < 3) { aniverStatus('Digite ao menos 3 letras do nome', 'err'); return; }
    setHTML($('aniverPick'), ''); aniverPending = null;
    aniverStatus('Buscando ' + q + '\u2026', '');
    aniverSearch(q).then(function (res) {
      if (!res.people.length) { aniverStatus('Ningu\u00e9m encontrado com "' + q + '"', 'err'); return; }
      inp.value = '';
      if (res.people.length === 1) { aniverPush(q, res.people[0]); return; }
      aniverPending = { q: q, people: res.people };
      setHTML($('aniverPick'), res.people.map(function (p, i) {
        return '<button class="aniver-pick-btn" onclick="pickAniver(' + i + ')">' + escH(p.nome) + '</button>';
      }).join(''));
      aniverStatus(res.people.length + ' pessoas encontradas \u2014 escolha uma' + (res.total > 10 ? ' (ou refine o nome)' : ''), '');
    }).catch(function (e) { aniverStatus('Erro: ' + e.message, 'err'); });
  };
  window.pickAniver = function (i) {
    if (!aniverPending || !aniverPending.people[i]) return;
    aniverPush(aniverPending.q, aniverPending.people[i]);
    aniverPending = null; setHTML($('aniverPick'), '');
  };
  window.removeAniver = function (i) { aniver.splice(i, 1); aniverSave(); renderAniver(); };
  // só roda quando o usuário pede: refaz a busca de cada nome e atualiza a data
  window.refreshAniver = function () {
    if (!aniver.length) return;
    var btn = $('aniverRefresh'); btn.disabled = true;
    aniverStatus('Atualizando ' + aniver.length + ' nome(s)\u2026', '');
    var falhas = 0;
    Promise.all(aniver.map(function (a) {
      return aniverSearch(a.nome).then(function (res) {
        var hit = res.people.filter(function (p) { return p.nome === a.nome; })[0];
        if (hit) a.md = hit.md; else falhas++;
      }, function (e) { falhas++; throw e; });
    })).then(function () {
      aniverSave(); renderAniver();
      aniverStatus('Atualizado \u00e0s ' + nowTimeStr() + (falhas ? ' \u2014 ' + falhas + ' n\u00e3o encontrado(s)' : ''), falhas ? 'err' : 'ok');
    }).catch(function (e) { aniverStatus('Erro: ' + e.message, 'err'); })
      .finally(function () { btn.disabled = false; });
  };
  function renderAniver() {
    renderHojeCountdown(); // bolha do header acompanha a lista
    var el = $('aniverList'); if (!el) return;
    $('aniverRefresh').hidden = !aniver.length;
    if (!aniver.length) { setHTML(el, '<div class="empty-hint">Nenhum nome adicionado</div>'); return; }
    var rows = aniver.map(function (a, i) { return { a: a, i: i, n: aniverDaysUntil(a.md) }; });
    rows.sort(function (x, y) { return x.n - y.n; });
    setHTML(el, rows.map(function (r) {
      var badge = r.n === 0 ? '<span class="aniver-badge today">hoje \ud83c\udf82</span>'
        : '<span class="aniver-badge' + (r.n <= 30 ? ' soon' : '') + '">' + (r.n === 1 ? 'amanh\u00e3' : 'em ' + r.n + 'd') + '</span>';
      return '<div class="holiday-item aniver-item"><span class="aniver-date">' + r.a.md.slice(3, 5) + '/' + r.a.md.slice(0, 2) + '</span>' +
        '<span class="holiday-name">' + escH(r.a.nome) + '</span>' + badge +
        '<button class="btn-remove" aria-label="Remover ' + escH(r.a.nome) + '" onclick="removeAniver(' + r.i + ')">\u00d7</button></div>';
    }).join(''));
  }

