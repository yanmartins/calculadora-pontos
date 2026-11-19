  // ===== CONTAGEM REGRESSIVA (aba Hoje) =====
  function daysUntil(dateStr) { return Math.round((fromStr(dateStr) - fromStr(toStr(new Date()))) / 86400000); }
  function nextHolidayInfo() {
    var today = toStr(new Date()), y = new Date().getFullYear();
    var list = applyOverrides(getNationalHolidays(y).concat(getNationalHolidays(y + 1)));
    customHolidays.forEach(function (ch) { list.push(ch); });
    list = list.filter(function (h) { return h.date >= today && !disabledHolidays[h.date]; });
    list.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return list[0] || null;
  }
  function nextFeriasInfo() {
    var today = toStr(new Date()), now = null, next = null;
    ferias.forEach(function (f) {
      if (!f) return;
      if (today >= f.inicio && today <= f.fim) now = { tipo: 'now', date: f.fim };
      else if (f.inicio > today && (!next || f.inicio < next.date)) next = { tipo: 'next', date: f.inicio };
    });
    return now || next;
  }
  function fmtDateFull(s) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function faltaNum(n) { return n <= 0 ? 'hoje' : (n === 1 ? 'amanhã' : n + 'd'); }
  function renderHojeCountdown() {
    var g = $('hojeCountdown'); if (!g) return;
    function item(num, label, cls) { return '<div class="cal-stat ' + cls + '"><div class="cal-stat-val">' + num + '</div><div class="cal-stat-lbl">' + label + '</div></div>'; }
    var h = nextHolidayInfo();
    var html = item(h ? faltaNum(daysUntil(h.date)) : '—',
                    h ? 'Feriado · ' + h.name + ' - (' + fmtDateFull(h.date) + ')' : 'Sem feriado à vista', 'cd-holiday');
    var f = nextFeriasInfo();
    html += f ? item(faltaNum(daysUntil(f.date)), 'Férias · ' + (f.tipo === 'now' ? 'até ' : '') + '(' + fmtDateFull(f.date) + ')', 'cd-ferias')
              : item('—', 'Férias · nenhuma marcada', 'cd-ferias');
    setHTML(g, html);
    // mesma contagem na bolha flutuante do topo
    var hc = $('hdrCountdown'); if (!hc) return;
    function chip(n, ico, tip, cls) {
      tip = tip.replace(/"/g, '&quot;');
      return '<button class="hdr-cd-chip ' + cls + '" data-tip="' + tip + '" aria-label="' + tip + '" onclick="switchPage(\'calendario\')">' +
        '<span class="ms" aria-hidden="true">' + ico + '</span>' + faltaNum(n) + '</button>';
    }
    var hh = '';
    if (h) hh += chip(daysUntil(h.date), 'celebration', 'Feriado · ' + h.name + ' (' + fmtDateFull(h.date) + ')', 'cd-holiday');
    if (f) hh += chip(daysUntil(f.date), 'beach_access', (f.tipo === 'now' ? 'Férias até ' : 'Férias em ') + fmtDateFull(f.date), 'cd-ferias');
    // aniversariante mais próximo (até 30 dias); empatados no mesmo dia entram juntos na dica
    var an = (aniver || []).map(function (a) { return { a: a, n: aniverDaysUntil(a.md) }; }).filter(function (x) { return x.n <= 30; });
    if (an.length) {
      var min = Math.min.apply(null, an.map(function (x) { return x.n; }));
      var quem = an.filter(function (x) { return x.n === min; }).map(function (x) { return x.a.nome.split(/\s+/)[0]; });
      var dm = an.filter(function (x) { return x.n === min; })[0].a.md;
      hh += chip(min, 'cake', 'Aniversário · ' + quem.join(', ') + ' (' + dm.slice(3, 5) + '/' + dm.slice(0, 2) + ')', 'cd-aniver');
    }
    setHTML(hc, hh);
  }

  // ===== TODAY LABEL =====
  function updateTodayLabel() {
    var el=$('todayLabel'); if(!el) return;
    var dias=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    var d=new Date();
    el.textContent=dias[d.getDay()]+' · '+fmtDateBr(toStr(d));
  }


