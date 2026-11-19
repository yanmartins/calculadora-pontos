  // ===== NOTIFICATIONS =====
  function checkNotifications(st) {
    if (!notificationsEnabled || st.entrada == null) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var cd = toStr(new Date());
    if (cd !== notifDate) { notifiedToday = {}; notifDate = cd; }
    var now = nowMins();
    calcExits(st).forEach(function (e) {
      var rem = e.exit - now;
      if (rem > 0 && rem <= 5 && !notifiedToday[e.id]) {
        notifiedToday[e.id] = true;
        try { new Notification('Calculadora de Pontos', { body: e.label+' ('+e.desc+') em '+rem+' min — saída às '+fmtTime(e.exit), tag:'calc-'+e.id }); } catch(err){}
      }
    });
  }
  window.toggleNotifications = function () {
    if (!notificationsEnabled) {
      if (!('Notification' in window)) { alert('Seu navegador não suporta notificações. Abra via HTTP (não file://).'); return; }
      Notification.requestPermission().then(function (p) {
        if (p === 'granted') {
          notificationsEnabled = true;
          $('btnNotif').textContent = 'Desativar';
          $('btnNotif').classList.add('active');
          save();
        }
      });
    } else {
      notificationsEnabled = false;
      $('btnNotif').textContent = 'Ativar';
      $('btnNotif').classList.remove('active');
      save();
    }
  };

