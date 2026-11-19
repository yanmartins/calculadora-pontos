  // ===== ESPELHO: batidas de todo o período via Ícarus =====
  var espelho = null; // {at, ini, days:[{d,dw,t,w,s,falta}]}
  var espelhoSyncing = false;
  var espelhoOffset = 0; // 0 = período atual; -1 = anterior; ...
  function espelhoPeriod() { return periodByOffset(espelhoOffset); }
  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  function espelhoRenderNav() {
    var p = espelhoPeriod();
    var nome = 'Período de ' + MESES[p.fim.getMonth()]; // nomeado pelo mês em que fecha (ano já vem na data)
    var datas = fmtDateFull(toStr(p.inicio)) + ' — ' + fmtDateFull(toStr(p.fim)) + (espelhoOffset === 0 ? ' · atual' : '');
    var el = $('espelhoPeriodLabel');
    if (el) el.innerHTML = '<span class="esp-nav-name">' + nome + '</span><span class="esp-nav-dates">' + datas + '</span>';
    var nx = $('espelhoNext'); if (nx) nx.disabled = espelhoOffset >= 0;
    var pv = $('espelhoPrev'); if (pv) pv.disabled = espelhoOffset <= -24;
    var td = $('espelhoToday'); if (td) td.hidden = espelhoOffset === 0;
  }
  window.espelhoNav = function (delta, toCurrent) {
    var next = toCurrent ? 0 : espelhoOffset + delta;
    if (next > 0 || next < -24 || next === espelhoOffset) return;
    espelhoOffset = next;
    espelhoRenderNav();
    espelhoSync(true); // troca de período sempre busca (cache guarda só o último visto)
  };
  function espelhoLoad() { try { espelho = JSON.parse(localStorage.getItem('icarus-espelho')); if (espelho && espelho.v !== 4) espelho = null; } catch (e) { espelho = null; } }
  function espelhoSetStatus(msg, cls) {
    var el = $('espelhoStatus'); if (!el) return;
    el.textContent = msg || '';
    el.className = 'icarus-status' + (cls ? ' ' + cls : '');
  }
  function espelhoInterval(times) {
    var mins = times.map(parseTime), itv = 0;
    for (var i = 2; i < mins.length; i += 2) itv += mins[i] - mins[i - 1];
    return itv;
  }
  function espelhoMetrics(days) {
    var todayStr = toStr(new Date());
    var ent = [], sai = [], alm = [], trab = [], n = 0;
    days.forEach(function (dy) {
      if (!dy.t.length) return;
      n++;
      var mins = dy.t.map(parseTime);
      ent.push(mins[0]);
      // saída/trabalhado só de dias fechados (passados, nº par de batidas)
      if (dy.d < todayStr && dy.t.length >= 2 && dy.t.length % 2 === 0) {
        sai.push(mins[mins.length - 1]);
        if (dy.w) trab.push(dy.w + (dy.e || 0)); // trabalhado inclui as horas extras
      }
      if (dy.t.length >= 4) alm.push(espelhoInterval(dy.t));
    });
    function avg(a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : null; }
    return { n: n, ent: avg(ent), sai: avg(sai), alm: avg(alm), trab: avg(trab) };
  }
