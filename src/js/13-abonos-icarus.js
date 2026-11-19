  // ===== ABONOS/ATESTADOS DO ÍCARUS (só GET) =====
  // 1 GET por dia útil do período (buscarAjustesPorData) + 1 GET por abono aprovado (/abonoPonto/{id}) para ler o motivo.
  // Só abonos de dia inteiro: "Atestado Médico" vai para Atestados, os demais motivos viram Abonos.
  // Abonos de horas ficam de fora porque já estão no saldo do Ícarus.
  var ABONO_MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var abonoSyncing = false;
  function abonoStatus(msg, cls) {
    [].forEach.call(document.querySelectorAll('.abono-sync-status'), function (el) { el.textContent = msg || ''; el.className = 'icarus-status abono-sync-status' + (cls ? ' ' + cls : ''); });
  }
  function icarusGet(path) {
    return fetch(ICARUS_BASE + path, { headers: { 'Authorization': 'Bearer ' + icarusAuth.token } }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error('sessão expirada — conecte novamente na aba Mais');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  // a API só aceita a data no formato java.util.Date legado: "Oct 21 2026"
  function icarusDateParam(d) { return encodeURIComponent(ABONO_MESES[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear()); }
  function hhmmToMin(t) { var m = /(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  window.abonoSync = function (manual) {
    if (abonoSyncing) return;
    if (!icarusAuth || !icarusAuth.token || !icarusAuth.idColaborador) {
      if (manual) { abonoStatus('Conecte sua conta Ícarus na aba Mais', 'err'); loginOpen(); }
      return;
    }
    var ini = toStr(period.inicio), fim = toStr(period.fim), dias = [];
    for (var d = new Date(period.inicio); d <= period.fim; d = addDays(d, 1)) if (!isWeekend(d)) dias.push(new Date(d));
    abonoSyncing = true;
    abonoStatus('Buscando no Ícarus… 0/' + dias.length, '');
    var id = Number(icarusAuth.idColaborador), achados = [], feitos = 0, i = 0;
    function worker() {
      if (i >= dias.length) return Promise.resolve();
      var dia = dias[i++], ds = toStr(dia);
      return icarusGet('/solicitacao/buscarAjustesPorData/' + id + '/' + icarusDateParam(dia)).then(function (list) {
        var abs = (list || []).filter(function (x) { return x.tipoAjuste === 'ABONO' && String(x.status).toUpperCase() === 'APROVADO' && x.idAjusteAbono; });
        return Promise.all(abs.map(function (x) {
          return icarusGet('/abonoPonto/' + x.idAjusteAbono).then(function (a) {
            var mot = (a.motivoAbono && a.motivoAbono.descricao) || 'Abono';
            var tp = String(a.tipoPeriodoAbono || '').toUpperCase();
            var min = hhmmToMin(a.tempoAbonoFormatado) || (a.horaInicio && a.horaFim ? hhmmToMin(a.horaFim) - hhmmToMin(a.horaInicio) : 0);
            achados.push({ date: ds, id: x.idAjusteAbono, motivo: mot, integral: tp.indexOf('DIA') === 0 || !min, minutos: min });
          });
        }));
      }).then(function () { feitos++; abonoStatus('Buscando no Ícarus… ' + feitos + '/' + dias.length, ''); return worker(); });
    }
    Promise.all([worker(), worker(), worker(), worker()]).then(function () {
      // troca só o que veio do Ícarus neste período; lançamentos manuais ficam
      atestados = atestados.filter(function (r) { return !(r && r.src === 'icarus' && r.inicio >= ini && r.fim <= fim); });
      abonos = abonos.filter(function (a) { return !(a.src === 'icarus' && a.date >= ini && a.date <= fim); });
      achados.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var nAt = 0, nAb = 0, last = null;
      achados.forEach(function (a) {
        // abono de horas já entra no saldo do Ícarus; importar contaria em dobro
        if (!a.integral) return;
        if (/atestado/i.test(a.motivo)) {
          if (isInRanges(a.date, atestados)) return; // já coberto por um atestado manual
          // emenda com o anterior quando só há fim de semana entre eles
          var gap = last && a.motivo === last.motivo ? addDays(fromStr(last.fim), 1) : null;
          while (gap && isWeekend(gap) && toStr(gap) < a.date) gap = addDays(gap, 1);
          if (gap && toStr(gap) === a.date) { last.fim = a.date; return; }
          last = { inicio: a.date, fim: a.date, src: 'icarus', motivo: a.motivo };
          atestados.push(last); nAt++;
        } else {
          if (abonos.some(function (b) { return b.date === a.date; })) return; // manual no mesmo dia prevalece
          abonos.push({ date: a.date, tipo: 'integral', src: 'icarus', motivo: a.motivo }); nAb++;
        }
      });
      atestados.sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
      try { localStorage.setItem('icarus-abonos-sync', JSON.stringify({ ini: ini, at: Date.now() })); } catch (e) {}
      renderAll();
      abonoStatus('Atualizado às ' + nowTimeStr() + ' — ' + nAt + ' atestado(s), ' + nAb + ' abono(s) no período', 'ok');
    }).catch(function (e) { abonoStatus('Erro: ' + e.message, 'err'); })
      .finally(function () { abonoSyncing = false; });
  };
  // automático ao abrir o Calendário: no máximo 1x a cada 12h por período
  function abonoAutoSync() {
    var st = null; try { st = JSON.parse(localStorage.getItem('icarus-abonos-sync')); } catch (e) {}
    if (st && st.ini === toStr(period.inicio) && Date.now() - st.at < 12 * 3600 * 1000) return;
    abonoSync(false);
  }

