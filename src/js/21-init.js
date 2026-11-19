  // pop dos ícones do header ao clicar (mesma animação da barra inferior)
  document.querySelectorAll('.acct-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      setTimeout(function () { b.classList.remove('pop'); }, 400);
    });
  });

  // fechar popup de login: clique fora ou ESC
  $('loginScrim').addEventListener('click', function (e) { if (e.target === this) loginClose(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('loginScrim').hidden) loginClose(); });

  // redesenha tudo que não roda no timer de 1s (listas com contagem, projeção, espelho)
  function refreshViews() {
    renderAll(); renderAniver(); espelhoRenderNav(); renderEspelho(); updateTodayLabel();
  }
  // virada do dia com o app aberto (ou ao voltar para ele): período, batidas e datas passam para hoje
  var viewDay = toStr(new Date());
  function checkNewDay() {
    var hoje = toStr(new Date());
    if (hoje === viewDay) return;
    viewDay = hoje;
    period = getCurrentPeriod();
    if (punchesDate && punchesDate !== hoje) { punchesDate = null; renderPunchSlots([]); }
    refreshViews();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkNewDay(); });

  // ===== INIT =====
  renderPunchSlots([]); load(); renderAll(); updateClock(); updateTimer(); updateTodayLabel();
  icarusLoadAuth(); icarusRenderUI();
  espelhoLoad(); espelhoRenderNav(); renderEspelho();
  aniverLoad(); renderAniver();
  restoreCards();
  layoutRestore(); initCardDrag();
  if (icarusAuth && icarusAuth.token && icarusAuth.idColaborador) icarusSync();
  setInterval(function(){ checkNewDay(); updateClock(); updateTimer(); render(); }, 1000);
  $('saldoIcarus').addEventListener('input', function(){ saldoIcarusDate=toStr(new Date()); });
  $('saldoIcarus').addEventListener('input', render);
  $('saldoIcarus').addEventListener('change', renderProjection);
  // slots de batida são recriados dinamicamente: eventos delegados ao container
  var punchRow=$('punchRow');
  punchRow.addEventListener('input', function(){ punchesDate=toStr(new Date()); render(); });
  punchRow.addEventListener('change', renderProjection);
  // tocar num slot vazio bate o ponto com a hora atual (ajustável em seguida)
  punchRow.addEventListener('focusin', function(e){
    var t=e.target;
    if(t.tagName==='INPUT'&&!t.value){ t.value=nowTimeStr(); punchesDate=toStr(new Date()); render(); renderProjection(); }
  });

  // versões antigas (servidas pelo abrir-app) registravam um service worker; o arquivo único não usa mais
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
  }
