  // ===== IMPORT FILE HANDLER =====
  // ===== ICARUS =====
  var ICARUS_BASE = 'https://backendicarus.pontoicarus.com.br';
  var icarusAuth = null; // {token, username, idColaborador} — senha nunca é persistida
  var icarusSyncing = false;

  function icarusLoadAuth() { try { icarusAuth = JSON.parse(localStorage.getItem('icarus-auth')); } catch (e) { icarusAuth = null; } }
  function icarusSaveAuth() {
    try {
      if (icarusAuth) localStorage.setItem('icarus-auth', JSON.stringify(icarusAuth));
      else localStorage.removeItem('icarus-auth');
    } catch (e) {}
  }
  function icarusStatus(msg, cls) {
    ['icarusSyncStatus', 'icarusLoginStatus', 'dlgLoginStatus'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.textContent = msg || '';
      el.className = 'icarus-status' + (cls ? ' ' + cls : '');
    });
  }
  function icarusRenderUI() {
    var logged = !!(icarusAuth && icarusAuth.token);
    $('icarusLoginForm').style.display = logged ? 'none' : '';
    $('icarusConnected').style.display = logged ? '' : 'none';
    $('icarusHeadStatus').textContent = logged ? 'conectado' : '';
    if (icarusAuth && icarusAuth.username) {
      $('icarusUser').value = icarusAuth.username;
      $('icarusWho').textContent = 'Conectado como ' + icarusAuth.username;
    }
    $('icarusIdColab').value = (icarusAuth && icarusAuth.idColaborador) || '';
    // ícone de conta no header reflete o estado
    var ab = $('acctBtn'), ai = $('acctIco');
    if (ab) { ab.classList.toggle('logged', logged); ab.setAttribute('aria-label', logged ? 'Conta Ícarus (conectado)' : 'Conectar ao Ícarus'); }
    if (ai) ai.textContent = logged ? 'account_circle' : 'login';
  }

  // ícone do header: logado abre a gestão completa na aba Mais; deslogado abre o popup
  var screenFrom = 'hoje';
  function openScreen(page) {
    var cur = document.querySelector('.nav-item.active');
    screenFrom = (cur && cur.getAttribute('data-page')) || 'hoje';
    switchPage(page);
  }
  window.icarusAccount = function () { openScreen('conta'); };
  window.openConfig = function () { openScreen('config'); };
  window.screenBack = function () { switchPage(screenFrom); };

  // popup de login obrigatório (não tira o usuário da tela atual)
  window.loginOpen = function () {
    $('loginScrim').hidden = false;
    $('dlgUser').value = (icarusAuth && icarusAuth.username) || '';
    $('dlgPass').value = '';
    $('dlgLoginStatus').textContent = '';
    setTimeout(function () { ($('dlgUser').value ? $('dlgPass') : $('dlgUser')).focus(); }, 50);
  };
  window.loginClose = function () { $('loginScrim').hidden = true; };
  window.icarusDlgLogin = function () {
    icarusLoginCore($('dlgUser').value.trim(), $('dlgPass').value, 'dlgLoginBtn').then(function (ok) {
      if (ok && icarusAuth.idColaborador) { loginClose(); icarusSync(); }
    });
  };

  // a resposta do login é um map genérico: procura o JWT e o id do colaborador em qualquer nível
  function icarusFindToken(obj) {
    var byKey = null, any = null;
    (function walk(o) {
      if (byKey || !o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        if (byKey) return;
        var v = o[k];
        if (typeof v === 'string' && v.indexOf('ey') === 0 && v.split('.').length === 3) {
          if (k.toLowerCase().indexOf('token') >= 0) byKey = v;
          else if (!any) any = v;
        } else if (v && typeof v === 'object') walk(v);
      });
    })(obj);
    return byKey || any;
  }
  function icarusFindId(obj) {
    if (!obj) return null;
    var KEYS = ['idcolaborador', 'idmutuario', 'colaboradorid', 'mutuarioid'];
    var found = null;
    (function walk(o) {
      if (found || !o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        if (found) return;
        var v = o[k];
        if (KEYS.indexOf(k.toLowerCase()) >= 0 && (typeof v === 'number' || /^\d+$/.test(v))) found = Number(v);
        else if (v && typeof v === 'object') walk(v);
      });
    })(obj);
    return found;
  }
  function icarusJwtPayload(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  // núcleo de login compartilhado (card da aba Mais + popup) → Promise<bool sucesso>
  function icarusLoginCore(u, p, btnId) {
    if (!u || !p) { icarusStatus('Preencha usuário e senha', 'err'); return Promise.resolve(false); }
    var btn = btnId && $(btnId); if (btn) btn.disabled = true;
    icarusStatus('Conectando…', '');
    return fetch(ICARUS_BASE + '/usuario/logar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p, web: true })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, json: j }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error((res.json && (res.json.message || res.json.error)) || 'HTTP ' + res.status);
        var token = icarusFindToken(res.json);
        if (!token) throw new Error('resposta sem token (conta com MFA?)');
        var id = icarusFindId(res.json) || icarusFindId(icarusJwtPayload(token));
        icarusAuth = { token: token, username: u, idColaborador: id || (icarusAuth && icarusAuth.idColaborador) || null };
        icarusSaveAuth();
        $('icarusPass').value = ''; var dp = $('dlgPass'); if (dp) dp.value = '';
        icarusRenderUI();
        if (icarusAuth.idColaborador) icarusStatus('Conectado', 'ok');
        else icarusStatus('Conectado — informe o ID do colaborador na aba Mais', 'err');
        return true;
      })
      .catch(function (e) { icarusStatus('Falha no login: ' + e.message, 'err'); return false; })
      .finally(function () { if (btn) btn.disabled = false; });
  }
  window.icarusLogin = function () {
    icarusLoginCore($('icarusUser').value.trim(), $('icarusPass').value, 'btnIcarusLogin').then(function (ok) {
      if (ok && icarusAuth.idColaborador) icarusSync();
    });
  };
  window.icarusLogout = function () {
    icarusAuth = null;
    icarusSaveAuth();
    icarusRenderUI();
    icarusStatus('', '');
  };
  window.icarusSetId = function (v) {
    v = String(v).replace(/\D/g, '');
    if (!icarusAuth) return;
    icarusAuth.idColaborador = v ? Number(v) : null;
    icarusSaveAuth();
    if (icarusAuth.idColaborador && icarusAuth.token) icarusSync();
  };

  // aceita date-time como string ISO, epoch millis, array [y,m,d] ou objeto LocalDate/LocalDateTime
  // do Jackson ({year, monthValue, dayOfMonth, hour, minute}) — o backend usa este último
  function icarusToDateStr(v) {
    if (v == null) return null;
    if (typeof v === 'number') return toStr(new Date(v));
    if (Array.isArray(v)) return v[0] + '-' + String(v[1]).padStart(2, '0') + '-' + String(v[2]).padStart(2, '0');
    if (typeof v === 'object') {
      if (v.year != null && typeof v.monthValue === 'number' && v.dayOfMonth != null)
        return v.year + '-' + String(v.monthValue).padStart(2, '0') + '-' + String(v.dayOfMonth).padStart(2, '0');
      return null;
    }
    var m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    var d = new Date(v);
    return isNaN(d) ? null : toStr(d);
  }
  function icarusToTimeStr(v) {
    if (v == null) return null;
    if (typeof v === 'number') { var d = new Date(v); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    if (typeof v === 'object') {
      if (v.hour != null && v.minute != null) return String(v.hour).padStart(2, '0') + ':' + String(v.minute).padStart(2, '0');
      return null;
    }
    var s = String(v);
    var m = s.match(/T(\d{2}:\d{2})/) || s.match(/^(\d{2}:\d{2})/);
    if (m) return m[1];
    var d2 = new Date(s);
    return isNaN(d2) ? null : String(d2.getHours()).padStart(2, '0') + ':' + String(d2.getMinutes()).padStart(2, '0');
  }
  function icarusDayStr(p) { return icarusToDateStr(p.dataBatidaLocalDate) || icarusToDateStr(p.dataBatida); }
  function icarusPunchTimes(rec, max) {
    var times = [];
    (rec.pontosHorariosBatidasOrdenados || []).forEach(function (b) {
      if (String(b.tipoMarcacao || '').toUpperCase().indexOf('DESCONSIDER') === 0) return;
      var t = icarusToTimeStr(b.horarioFormatadoSemData) || icarusToTimeStr(b.horarioDateTime) || icarusToTimeStr(b.horario);
      if (t) times.push(t);
    });
    return max ? times.slice(0, max) : times;
  }

  function icarusApply(data) {
    // guarda a resposta crua para diagnóstico (console + localStorage)
    try { console.log('[icarus] resposta consultarRegistrosPonto:', data); localStorage.setItem('icarus-debug', JSON.stringify(data)); } catch (e) {}
    var pontos = (data && data.pontos) || [];
    if (!pontos.length && data && typeof data === 'object') {
      // fallback: procura um array de dias em qualquer nível da resposta
      (function walk(o) {
        if (pontos.length || !o || typeof o !== 'object') return;
        Object.keys(o).forEach(function (k) {
          if (pontos.length) return;
          var v = o[k];
          if (Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' &&
              (v[0].dataBatida != null || v[0].dataBatidaLocalDate != null)) pontos = v;
          else if (v && typeof v === 'object') walk(v);
        });
      })(data);
    }
    var todayStr = toStr(new Date());
    var todayRec = null, prevRec = null, prevDay = null;
    pontos.forEach(function (p) {
      var d = icarusDayStr(p);
      if (!d) return;
      if (d === todayStr) todayRec = p;
      else if (d < todayStr && p.saldoBanco != null && (!prevDay || d > prevDay)) { prevDay = d; prevRec = p; }
    });
    var applied = [];
    if (todayRec) {
      var times = icarusPunchTimes(todayRec);
      if (times.length) {
        // mantém intervalos extras abertos hoje à mão (ex.: em pausa e o Ícarus ainda não tem a volta)
        var cur = punchValues();
        if (punchesDate === todayStr) while (times.length < cur.length - 1) times.push('');
        renderPunchSlots(times); punchesDate = todayStr;
        applied.push(times.length + ' batida' + (times.length > 1 ? 's' : ''));
      }
    }
    if (prevRec) {
      $('saldoIcarus').value = fmtSaldo(prevRec.saldoBanco);
      saldoIcarusDate = prevDay;
      applied.push('saldo de ' + fmtDateBr(prevDay));
    }
    if (!applied.length) {
      var diag;
      if (!pontos.length) diag = 'a API não retornou dias — confira o ID do colaborador (' + icarusAuth.idColaborador + ')';
      else if (!todayRec) diag = pontos.length + ' dia(s) retornado(s), nenhum é hoje';
      else diag = 'hoje veio sem batidas e sem saldo anterior';
      icarusStatus('Nada aplicado: ' + diag, 'err');
    } else { icarusStatus('Sincronizado às ' + nowTimeStr() + ' — ' + applied.join(' · '), 'ok'); syncFlash(); }
    refreshViews();
    // espelho do período atual também recebe as batidas de hoje, mesmo fora da aba Espelho
    if (applied.length && espelhoOffset === 0) espelhoSync(true);
  }
  // faixa de luz percorrendo a tela ao concluir uma sincronização
  function syncFlash() {
    var el = $('syncSweep'); if (!el) return;
    el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
    setTimeout(function () { el.classList.remove('run'); }, 850);
  }

  // botão de sync do header: sincroniza o espelho quando essa aba está ativa, senão o dia
  // abre a tela de bater ponto (iframe do site oficial), carregando sob demanda
  window.baterPontoIcarus = function () {
    var f = $('baterFrame');
    if (f && f.src.indexOf('pontoicarus') < 0) f.src = 'https://web.pontoicarus.com.br/ponto';
    openScreen('bater');
  };
  window.headerSync = function () {
    var cur = document.querySelector('.nav-item.active');
    if (cur && cur.getAttribute('data-page') === 'espelho') espelhoSync(true);
    else icarusSync();
  };
  window.icarusSync = function () {
    if (icarusSyncing) return;
    if (!icarusAuth || !icarusAuth.token) { loginOpen(); return; }
    if (!icarusAuth.idColaborador) { icarusAccount(); icarusStatus('Informe o ID do colaborador para sincronizar', 'err'); return; }
    icarusSyncing = true;
    $('btnIcarusSync').classList.add('spinning');
    icarusStatus('Sincronizando…', '');
    var hoje = new Date();
    fetch(ICARUS_BASE + '/ponto/consultarRegistrosPonto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + icarusAuth.token },
      body: JSON.stringify({
        idColaborador: Number(icarusAuth.idColaborador),
        dataInicio: toStr(addDays(hoje, -10)) + 'T00:00:00',
        dataFim: toStr(hoje) + 'T23:59:59',
        esconderDiasDescanso: false
      })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          icarusAuth.token = null;
          icarusSaveAuth();
          icarusRenderUI();
          throw new Error('sessão expirada — conecte novamente na aba Mais');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(icarusApply)
      .catch(function (e) { icarusStatus('Erro ao sincronizar: ' + e.message, 'err'); })
      .finally(function () { icarusSyncing = false; $('btnIcarusSync').classList.remove('spinning'); });
  };

