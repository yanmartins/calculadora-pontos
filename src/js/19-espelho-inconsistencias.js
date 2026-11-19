  // inconsistências: almoço curto, batidas ímpares, jornada sem intervalo/excessiva, interjornada curta, falta
  function espelhoIssues(days) {
    var todayStr = toStr(new Date()), out = [];
    function add(dy, txt, err) { out.push({ d: dy.d, dw: dy.dw, txt: txt, err: !!err }); }
    days.forEach(function (dy) {
      var n = dy.t.length, closed = dy.d < todayStr;
      if (!n) { if (dy.falta) add(dy, 'Falta injustificada', true); return; }
      var mins = dy.t.map(parseTime);
      if (closed && n % 2 === 1) add(dy, 'Batidas &iacute;mpares (<b>' + n + '</b>) &mdash; falta uma marca&ccedil;&atilde;o', true);
      if (n >= 3 && mins[2] - mins[1] < 30) add(dy, 'Almo&ccedil;o de <b>' + fmtDur(mins[2] - mins[1]) + '</b> (m&iacute;nimo 0:30)');
      if (closed && n === 2 && mins[1] - mins[0] > 360) add(dy, 'Jornada de <b>' + fmtDur(mins[1] - mins[0]) + '</b> sem intervalo');
      var trab = 0;
      for (var i = 1; i < n; i += 2) trab += mins[i] - mins[i - 1];
      var maxDia = regra(dy.d).maxDia; // jornada + 2h extras (CLT art. 59): 10h48 até 30/11/2026, 10h depois
      if (trab > maxDia) add(dy, 'Jornada de <b>' + fmtDur(trab) + '</b> (acima de ' + fmtDur(maxDia) + ')');
    });
    // interjornada: dias consecutivos (lista vem do mais recente para o mais antigo)
    for (var k = 0; k < days.length - 1; k++) {
      var cur = days[k], prev = days[k + 1];
      if (!cur.t.length || prev.t.length < 2 || prev.t.length % 2) continue;
      var nx = fromStr(prev.d); nx.setDate(nx.getDate() + 1);
      if (toStr(nx) !== cur.d) continue;
      var rest = 1440 - parseTime(prev.t[prev.t.length - 1]) + parseTime(cur.t[0]);
      if (rest < 660) add(cur, 'Interjornada de <b>' + fmtDur(rest) + '</b> (m&iacute;nimo 11:00)');
    }
    out.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : (b.err - a.err); });
    return out;
  }
  function renderEspelho() {
    var mEl = $('espelhoMetrics'), lEl = $('espelhoList');
    if (!mEl) return;
    function tile(v, l, c) { return '<div class="cal-stat"><div class="cal-stat-val ' + (c || '') + '">' + v + '</div><div class="cal-stat-lbl">' + l + '</div></div>'; }
    var days = (espelho && espelho.days) || [];
    if (!days.length) {
      setHTML(mEl, '<div class="empty-hint">Sem dados ainda — conecte o &Iacute;carus e toque em Atualizar.</div>');
      setHTML(lEl, '<div class="board-empty">Nenhuma batida carregada</div>');
      setHTML($('espelhoIssues'), '');
      return;
    }
    var m = espelhoMetrics(days);
    setHTML(mEl,
      tile(m.ent != null ? fmtTime(m.ent) : '--:--', 'Entrada m&eacute;dia', '') +
      tile(m.sai != null ? fmtTime(m.sai) : '--:--', 'Sa&iacute;da m&eacute;dia', '') +
      tile(m.alm != null ? fmtDur(m.alm) : '--:--', 'Almo&ccedil;o m&eacute;dio', '') +
      tile(m.trab != null ? fmtDur(m.trab) : '--:--', 'Trabalhado/dia', 'accent-c') +
      tile(m.n, 'Dias com registro no per&iacute;odo', 'positive'));
    var issues = espelhoIssues(days), byDay = {};
    issues.forEach(function (it) { (byDay[it.d] = byDay[it.d] || []).push(it); });
    setHTML($('espelhoIssues'), !issues.length
      ? '<div class="esp-issues-ok"><span class="ms" aria-hidden="true">check_circle</span>Nenhuma inconsist&ecirc;ncia no per&iacute;odo</div>'
      : '<div class="esp-issues-head"><span class="ms" aria-hidden="true">warning</span>Inconsist&ecirc;ncias <span class="esp-issues-count">' + issues.length + '</span></div>' +
        '<ul class="esp-issue-list">' + issues.map(function (it) {
          return '<li class="esp-issue' + (it.err ? ' err' : '') + '"><span class="esp-issue-dia">' + fmtDateBr(it.d) + ' <small>' + (it.dw || '') + '</small></span><span class="esp-issue-txt">' + it.txt + '</span></li>';
        }).join('') + '</ul>');
    var html = '<div class="esp-scroll"><table class="esp-table"><thead><tr>' +
      '<th scope="col">Dia</th><th scope="col">Batidas</th><th scope="col">Trabalhado</th><th scope="col">Devido</th><th scope="col">Intervalo</th></tr></thead><tbody>';
    days.forEach(function (dy) {
      var dow = fromStr(dy.d).getDay(), weekend = dow === 0 || dow === 6;
      var itv = dy.t.length >= 3 ? espelhoInterval(dy.t) : 0, dev = dy.f || 0;
      var cls = '', bat;
      if (dy.t.length) {                       // dia com batidas
        bat = dy.t.join(' ');
      } else if (dy.falta) {                    // falta injustificada
        cls = ' class="esp-tr-falta"'; bat = '<span class="esp-tag esp-tag-falta">Falta</span>';
      } else if (dy.ab || /abon|atest|f[e\u00e9]ri|afast|licen|folga|feriad/i.test(dy.re)) {
        var mot = (dy.abn || []).map(function (a) { return a.m; }).join(', ');
        cls = ' class="esp-tr-abono"'; bat = '<span class="esp-tag esp-tag-abono">' + (mot || dy.re || 'Abonado') + '</span>';
      } else if (weekend) {                     // s\u00e1bado/domingo sem batida
        cls = ' class="esp-tr-descanso"'; bat = '<span class="esp-tag esp-tag-descanso">Descanso</span>';
      } else {                                  // feriado/dia vazio
        bat = '<span class="esp-tag esp-tag-descanso">' + (dy.re && dy.re !== 'Nenhum ponto' ? dy.re : '\u2014') + '</span>';
      }
      var showNums = dy.t.length > 0;
      var he = dy.e || 0, trabTot = dy.w + he;
      var trabCell = showNums && dy.w
        ? '<span class="esp-trab' + (he > 0 ? ' esp-has-he' : '') + '"' + (he > 0 ? ' title="' + fmtDur(dy.w) + ' + ' + fmtDur(he) + ' HE"' : '') + '>' + fmtDur(trabTot) + '</span>'
        : '\u2014';
      html += '<tr' + cls + '>' +
        '<td class="esp-td-dia">' + fmtDateBr(dy.d) + ' <small>' + (dy.dw || '') + '</small>' + espWarn(byDay[dy.d]) + espAbono(dy.abn) + '</td>' +
        '<td class="esp-td-bat">' + bat + '</td>' +
        '<td class="esp-td-num">' + trabCell + '</td>' +
        '<td class="esp-td-num' + (showNums && dev > 0 ? ' negative' : '') + '">' + (showNums && dev > 0 ? fmtDur(dev) : '\u2014') + '</td>' +
        '<td class="esp-td-num">' + (itv > 0 ? fmtDur(itv) : '\u2014') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    setHTML(lEl, html);
    function espAbono(list) {
      if (!list || !list.length) return '';
      var tip = list.map(function (a) { return a.m + ' \u00b7 ' + (a.min ? fmtDur(a.min) : 'dia todo'); }).join(' \u2022 ');
      return '<span class="ms esp-abono-ico" title="' + tip + '" aria-label="Abono: ' + tip + '">medical_services</span>';
    }
    function espWarn(list) {
      if (!list) return '';
      var tip = list.map(function (it) { return it.txt.replace(/<[^>]+>/g, ''); }).join(' \u2022 ');
      var err = list.some(function (it) { return it.err; });
      return '<span class="ms esp-warn' + (err ? ' err' : '') + '" title="' + tip + '" aria-label="' + tip + '">warning</span>';
    }
  }
  // motivo e tempo dos abonos (só GET): detalha apenas os dias que o espelho marca com abono/ajuste
  function espelhoAbonos() {
    if (!espelho || !icarusAuth || !icarusAuth.token || !icarusAuth.idColaborador) return;
    var alvo = espelho.days.filter(function (dy) { return dy.ab && !dy.abn; }), ref = espelho, id = Number(icarusAuth.idColaborador);
    if (!alvo.length) return;
    Promise.all(alvo.map(function (dy) {
      return icarusGet('/solicitacao/buscarAjustesPorData/' + id + '/' + icarusDateParam(fromStr(dy.d))).then(function (list) {
        var abs = (list || []).filter(function (x) { return x.tipoAjuste === 'ABONO' && String(x.status).toUpperCase() === 'APROVADO' && x.idAjusteAbono; });
        return Promise.all(abs.map(function (x) { return icarusGet('/abonoPonto/' + x.idAjusteAbono); }));
      }).then(function (det) {
        dy.abn = det.map(function (a) {
          var tp = String(a.tipoPeriodoAbono || '').toUpperCase();
          var min = tp.indexOf('DIA') === 0 ? 0 : (hhmmToMin(a.tempoAbonoFormatado) || (a.horaInicio && a.horaFim ? hhmmToMin(a.horaFim) - hhmmToMin(a.horaInicio) : 0));
          return { m: (a.motivoAbono && a.motivoAbono.descricao) || 'Abono', min: min };
        });
      }, function () {}); // falha em um dia não derruba os outros; tenta de novo no próximo sync
    })).then(function () {
      if (espelho !== ref) return; // trocou de período no meio
      try { localStorage.setItem('icarus-espelho', JSON.stringify(espelho)); } catch (e) {}
      renderEspelho();
    });
  }
  window.espelhoSync = function (force) {
    if (espelhoSyncing) return;
    espelhoRenderNav();
    renderEspelho();
    if (!icarusAuth || !icarusAuth.token) { espelhoSetStatus('Conecte sua conta \u00cdcarus para carregar o espelho', 'err'); loginOpen(); return; }
    if (!icarusAuth.idColaborador) { espelhoSetStatus('Informe o ID do colaborador na aba Mais', 'err'); icarusAccount(); return; }
    var per = espelhoPeriod(), ini = toStr(per.inicio);
    if (!force && espelho && espelho.ini === ini && (Date.now() - espelho.at) < 15 * 60 * 1000) { espelhoAbonos(); return; }
    espelhoSyncing = true;
    $('btnIcarusSync').classList.add('spinning');
    espelhoSetStatus('Carregando espelho\u2026', '');
    var hoje = new Date(), fim = per.fim < hoje ? per.fim : hoje;
    fetch(ICARUS_BASE + '/ponto/consultarRegistrosPonto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + icarusAuth.token },
      body: JSON.stringify({
        idColaborador: Number(icarusAuth.idColaborador),
        dataInicio: ini + 'T00:00:00',
        dataFim: toStr(fim) + 'T23:59:59',
        esconderDiasDescanso: false
      })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error('sess\u00e3o expirada \u2014 conecte novamente na aba Mais');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var days = [];
        ((data && data.pontos) || []).forEach(function (p) {
          var d = icarusDayStr(p); if (!d) return;
          days.push({
            d: d,
            dw: p.diaSemanaAbreviado || '',
            t: icarusPunchTimes(p),
            w: p.minutosNormaisTotais || 0,
            e: p.minutosExtrasTotais || 0,
            f: p.minutoFaltante || 0,
            falta: String(p.falta).toUpperCase() === 'SIM',
            re: (p.registrosEspelho || '').trim(), // rótulo do próprio Ícarus (ex.: "Abono Aprovado")
            ab: !!p.temAbonoOuAjusteRegistrado
          });
        });
        days.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
        var old = {}; ((espelho && espelho.days) || []).forEach(function (o) { if (o.abn) old[o.d] = o.abn; });
        days.forEach(function (dy) { if (dy.ab && old[dy.d]) dy.abn = old[dy.d]; });
        espelho = { at: Date.now(), ini: ini, v: 4, days: days };
        try { localStorage.setItem('icarus-espelho', JSON.stringify(espelho)); } catch (e) {}
        espelhoSetStatus('Atualizado \u00e0s ' + nowTimeStr() + ' \u2014 ' + days.length + ' dia(s)', 'ok'); syncFlash();
        renderEspelho();
        espelhoAbonos();
      })
      .catch(function (e) { espelhoSetStatus('Erro: ' + e.message, 'err'); })
      .finally(function () { espelhoSyncing = false; $('btnIcarusSync').classList.remove('spinning'); });
  };

