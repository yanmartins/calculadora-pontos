  // ===== EXPORT / IMPORT =====
  // grupos do arquivo: chaves inteiras do localStorage (keys) ou campos dentro de calc-pontos (pontos)
  var XFER_GROUPS = [
    { id: 'aparencia', ico: 'palette', lbl: 'Tema e cor', keys: ['calc-theme', 'calc-accent'] },
    { id: 'layout', ico: 'dashboard', lbl: 'Layout dos cards', sub: 'ordem, largura e cards abertos', keys: ['calc-layout', 'calc-cards'] },
    { id: 'aniver', ico: 'cake', lbl: 'Aniversariantes', keys: ['icarus-aniver'] },
    { id: 'feriados', ico: 'trip', lbl: 'Feriados', sub: 'adicionados, desmarcados e datas alteradas', pontos: ['customHolidays', 'disabledHolidays', 'holidayOverrides'] },
    { id: 'projecao', ico: 'schedule', lbl: 'Projeção', sub: 'entrada, saída máxima, almoço e priorizar piso da tolerância', pontos: ['projEntrada', 'projSaidaMax', 'projAlmoco', 'projPrior', 'projPiso', 'projArred'] },
    { id: 'metas', ico: 'flag', lbl: 'Metas', pontos: ['customTargets'], pessoal: true },
    { id: 'ausencias', ico: 'beach_access', lbl: 'Férias, atestados e abonos', pontos: ['ferias', 'atestados', 'abonos'], pessoal: true },
    { id: 'batidas', ico: 'fingerprint', lbl: 'Batidas do dia e saldo', pontos: ['punches', 'punchesDate', 'saldoIcarus', 'saldoIcarusDate'], pessoal: true }
  ];
  var xferMode = '', xferData = null;
  function xferPontos() { try { return JSON.parse(localStorage.getItem('calc-pontos')) || {}; } catch (e) { return {}; } }
  function xferHas(g, src) {
    return (g.keys || []).some(function (k) { return src.keys[k] != null; }) || (g.pontos || []).some(function (k) { return src.pontos[k] !== undefined; });
  }
  function xferRender() {
    var avail = XFER_GROUPS.filter(function (g) { return xferHas(g, xferData); });
    setHTML($('xferList'), avail.length ? avail.map(function (g) {
      // exportar: pessoais vêm desmarcados (pensado para compartilhar); importar: tudo que veio no arquivo marcado
      var on = xferMode === 'import' || !g.pessoal;
      return '<label class="xfer-item"><input type="checkbox" value="' + g.id + '"' + (on ? ' checked' : '') + ' onchange="xferCount()">' +
        '<span class="ms" aria-hidden="true">' + g.ico + '</span><span class="xfer-txt">' + g.lbl + (g.sub ? '<small>' + g.sub + '</small>' : '') + '</span>' +
        (g.pessoal ? '<span class="xfer-tag">pessoal</span>' : '') + '</label>';
    }).join('') : '<div class="empty-hint">Nada para ' + (xferMode === 'import' ? 'importar neste arquivo' : 'exportar ainda') + '</div>');
    xferCount();
  }
  window.xferCount = function () {
    var n = document.querySelectorAll('#xferList input:checked').length;
    $('xferGo').disabled = !n;
    $('xferGo').textContent = (xferMode === 'import' ? 'Importar' : 'Exportar') + (n ? ' (' + n + ')' : '');
  };
  window.xferOpen = function (mode, data) {
    xferMode = mode;
    if (mode === 'export') {
      save();
      var keys = {};
      XFER_GROUPS.forEach(function (g) { (g.keys || []).forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) keys[k] = v; }); });
      data = { keys: keys, pontos: xferPontos() };
    }
    xferData = data;
    $('xferIco').textContent = mode === 'import' ? 'download' : 'upload';
    $('xferTitle').textContent = mode === 'import' ? 'Importar' : 'Exportar';
    $('xferSub').textContent = mode === 'import' ? 'Escolha o que trazer deste arquivo. O resto continua como está.' : 'Escolha o que vai no arquivo. O login do Ícarus nunca é exportado.';
    xferRender();
    $('xferScrim').hidden = false;
  };
  window.xferClose = function () { $('xferScrim').hidden = true; xferData = null; };
  window.xferGo = function () {
    var ids = [].map.call(document.querySelectorAll('#xferList input:checked'), function (c) { return c.value; });
    var groups = XFER_GROUPS.filter(function (g) { return ids.indexOf(g.id) >= 0; });
    if (!groups.length) return;
    if (xferMode === 'export') {
      var out = { app: 'calc-pontos-config', v: 2, exportado: new Date().toISOString(), grupos: ids, keys: {}, pontos: {} };
      groups.forEach(function (g) {
        (g.keys || []).forEach(function (k) { if (xferData.keys[k] != null) out.keys[k] = xferData.keys[k]; });
        (g.pontos || []).forEach(function (k) { if (xferData.pontos[k] !== undefined) out.pontos[k] = xferData.pontos[k]; });
      });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
      a.download = 'calculadora-pontos-' + toStr(new Date()) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      xferClose();
      return;
    }
    var d = xferPontos();
    groups.forEach(function (g) {
      (g.keys || []).forEach(function (k) { if (typeof xferData.keys[k] === 'string') localStorage.setItem(k, xferData.keys[k]); });
      (g.pontos || []).forEach(function (k) { if (xferData.pontos[k] !== undefined) d[k] = xferData.pontos[k]; });
    });
    localStorage.setItem('calc-pontos', JSON.stringify(d));
    location.reload();
  };
  // aceita o arquivo novo e também o texto do backup antigo (JSON cru de calc-pontos)
  window.importConfig = function (inp) {
    var f = inp.files && inp.files[0]; inp.value = ''; if (f) importFile(f);
  };
  function importFile(f) {
    f.text().then(function (text) {
      var cfg = JSON.parse(text.trim());
      if (!cfg || typeof cfg !== 'object') throw 0;
      var data = cfg.app === 'calc-pontos-config' ? { keys: cfg.keys || {}, pontos: cfg.pontos || {} } : { keys: {}, pontos: cfg };
      xferOpen('import', data);
    }).catch(function () { alert('Arquivo inválido.'); });
  }
  // arrastar o arquivo para qualquer lugar da página; só reage a arquivos (não ao arrastar de cards)
  (function () {
    var depth = 0, ov = $('dropOverlay');
    function isFile(e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
    document.addEventListener('dragenter', function (e) { if (!isFile(e)) return; e.preventDefault(); depth++; ov.hidden = false; });
    document.addEventListener('dragover', function (e) { if (!isFile(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    document.addEventListener('dragleave', function (e) { if (!isFile(e)) return; if (--depth <= 0) { depth = 0; ov.hidden = true; } });
    document.addEventListener('drop', function (e) {
      if (!isFile(e)) return;
      e.preventDefault(); depth = 0; ov.hidden = true;
      var f = e.dataTransfer.files[0]; if (f) importFile(f);
    });
  })();


