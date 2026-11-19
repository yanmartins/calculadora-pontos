  // ===== BATIDAS =====
  // lista dinâmica: entrada, N pares saída/volta de intervalo e saída final (sempre em número par)
  var MIN_PUNCHES = 4;
  var punchesDate = null; // dia em que os slots foram editados (intervalos extras não passam para o dia seguinte)
  function punchInputs() { return Array.prototype.slice.call(document.querySelectorAll('#punchRow input')); }
  function punchValues() { return punchInputs().map(function (i) { return i.value; }); }
  function firstPunch() { var v = punchValues()[0]; return v ? parseTime(v) : null; }
  function punchLabel(i, n) {
    if (i === 0) return { ico: 'login', txt: 'Entrada' };
    if (i === n - 1) return { ico: 'logout', txt: 'Sa&iacute;da' };
    var k = (i + 1) >> 1; // nº do intervalo (1 = almoço)
    if (i % 2) return k === 1 ? { ico: 'restaurant', txt: 'Sa&iacute;da Almo&ccedil;o' } : { ico: 'coffee', txt: 'Sa&iacute;da Intervalo ' + k };
    return { ico: 'keyboard_return', txt: k === 1 ? 'Volta Almo&ccedil;o' : 'Volta Intervalo ' + k };
  }
  function renderPunchSlots(values) {
    var n = Math.max(MIN_PUNCHES, values.length + (values.length % 2));
    var html = '';
    for (var i = 0; i < n; i++) {
      var l = punchLabel(i, n);
      html += '<label class="punch-slot"><span class="ms" aria-hidden="true">' + l.ico + '</span>' +
        '<span class="punch-lbl">' + l.txt + '</span><input type="time" data-idx="' + i + '" value="' + (values[i] || '') + '"></label>';
    }
    $('punchRow').innerHTML = html;
    updatePunchSlots();
  }
  // novo par entra antes da saída final
  window.addPunchPair = function () {
    var v = punchValues(); v.splice(v.length - 1, 0, '', '');
    punchesDate = toStr(new Date());
    renderPunchSlots(v); render(); renderProjection();
  };
  // remove o último par de intervalo vazio
  window.removePunchPair = function () {
    var v = punchValues();
    for (var i = v.length - 3; i >= 1 && v.length > MIN_PUNCHES; i -= 2) {
      if (!v[i] && !v[i + 1]) { v.splice(i, 2); break; }
    }
    renderPunchSlots(v); render(); renderProjection();
  };
  // trabalhado = soma dos pares entrada/saída; intervalo = lacunas entre eles (em curso conta até agora)
  function punchSummary(now) {
    var vals = punchValues(), p = vals.map(parseTime).filter(function (m) { return m != null; });
    if (!p.length) return null;
    var finished = !!vals[vals.length - 1] && p.length % 2 === 0;
    var end = finished ? p[p.length - 1] : now;
    var worked = 0, closedBreaks = 0, running = 0;
    for (var i = 0; i < p.length; i += 2) worked += Math.max(0, (i + 1 < p.length ? p[i + 1] : end) - p[i]);
    for (var j = 1; j < p.length; j += 2) {
      if (j + 1 < p.length) closedBreaks += Math.max(0, p[j + 1] - p[j]);
      else if (!finished) running = Math.max(0, end - p[j]);
    }
    return { entrada: p[0], saida: finished ? p[p.length - 1] : null, worked: worked, closedBreaks: closedBreaks, breaks: closedBreaks + running };
  }
  function nextPunchIdx() { return punchValues().indexOf(''); }
  function updatePunchSlots() {
    var idx = nextPunchIdx(), v = punchValues();
    punchInputs().forEach(function (inp, i) {
      var slot = inp.parentNode;
      slot.classList.toggle('done', !!inp.value);
      slot.classList.toggle('next', i === idx);
    });
    var canRemove = false;
    for (var i = v.length - 3; i >= 1 && v.length > MIN_PUNCHES; i -= 2) if (!v[i] && !v[i + 1]) canRemove = true;
    $('btnPunchRemove').hidden = !canRemove;
  }

