  // ===== CONSTANTS =====
  var LUNCH_MIN_WORK = 360; // até 6h de trabalho não exige intervalo
  // Jornada: até 30/11/2026 eram 44h semanais (jornada 8h48 com abono de 48 min/dia trabalhado = 8h líquidas).
  // A partir de 01/12/2026 são 40h: jornada de 8h, sem abono; hora extra já conta a partir das 8h.
  var CORTE_40H = '2026-12-01', TOLERANCIA = 10;
  // regras do dia (string AAAA-MM-DD; padrão = hoje). Tolerância de 10 min (CLT art. 58 §1º) em torno da jornada:
  // 44h → 8h38..8h58 valem 8h48; 40h → 7h50..8h10 valem 8h. Limite CLT = jornada + 2h extras (art. 59).
  function regra(ds) {
    ds = ds || toStr(new Date());
    var abono = ds < CORTE_40H ? 48 : 0, jornada = 480 + abono;
    return { abono: abono, jornada: jornada, tolMin: jornada - TOLERANCIA, tolMax: jornada + TOLERANCIA, maxDia: jornada + 120 };
  }
  // quanto um dia útil trabalhado vale no banco (já com o abono): dentro da tolerância vale a jornada inteira
  function tolWork(w, r) { r = r || regra(); return w >= r.tolMin && w <= r.tolMax ? r.jornada : w; }
  // menor jornada diária que rende pelo menos m: dentro da faixa não rende nada além do piso, então vira o piso ou tolMax+1
  function tolMeta(m, r) { r = r || regra(); return m > r.tolMin - 1 && m <= r.tolMax ? (m <= r.jornada ? r.tolMin : r.tolMax + 1) : m; }
  // limite de saldo negativo da PLR: uma jornada (−8h48 na escala de 44h, −8h na de 40h), pela regra do fim do período
  function plrLimit() { return -regra(toStr(period.fim)).jornada; }
  // metas fixas da regra de hoje
  function baseTargets() {
    var r = regra();
    return [
      { id: 'okr',      label: 'OKR',        desc: '8h',               mins: 480,          color: 'green' },
      { id: 'completo', label: 'Completo',   desc: fmtHoras(r.tolMin), mins: r.tolMin,     color: 'green' },
      { id: 'extra',    label: 'Hora Extra', desc: fmtHoras(r.tolMax + 1), mins: r.tolMax + 1, color: 'amber' },
      { id: 'limite',   label: 'Limite CLT', desc: fmtHoras(r.maxDia), mins: r.maxDia,     color: 'red' }
    ];
  }

  // metas fixas + personalizadas, ordenadas por minutos trabalhados
  function fmtHoras(m) { var h=Math.floor(m/60),mm=m%60; return h+'h'+String(mm).padStart(2,'0'); }
  function getTargets() {
    var all = baseTargets();
    customTargets.forEach(function (t) {
      all.push({ id:t.id, label:t.label, desc:fmtHoras(t.mins), mins:t.mins, color:'purple', custom:true });
    });
    all.sort(function (a,b) { return a.mins-b.mins; });
    return all;
  }

