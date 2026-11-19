  // ===== TIME HELPERS =====
  function nowMins() { var d=new Date(); return d.getHours()*60+d.getMinutes(); }
  function nowSecs() { var d=new Date(); return d.getHours()*3600+d.getMinutes()*60+d.getSeconds(); }
  function parseTime(v) { if(!v) return null; var p=v.split(':').map(Number); return p[0]*60+p[1]; }
  function parseDur(s) { // "6:30" -> 390, "6" ou "6.5" -> horas decimais
    if(!s) return null; s=s.trim().replace(',','.');
    if(s.indexOf(':')>=0){ var p=s.split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0); }
    var n=parseFloat(s); if(isNaN(n)) return null; return Math.round(n*60);
  }
  function fmtTime(m) { if(m==null||isNaN(m)) return '--:--'; var mm=((m%1440)+1440)%1440; return String(Math.floor(mm/60)).padStart(2,'0')+':'+String(mm%60).padStart(2,'0'); }
  function fmtDur(m) { var a=Math.abs(Math.round(m)); return Math.floor(a/60)+':'+String(a%60).padStart(2,'0'); }
  function fmtSaldo(m) { return (m<0?'-':'+')+fmtDur(m); }
  function parseSaldo(s) {
    if(!s||!s.trim()) return null;
    s=s.trim(); var neg=s.charAt(0)==='-'; var clean=s.replace(/^[+-]/,'');
    var p=clean.split(':'); if(p.length!==2) return null;
    var t=(parseInt(p[0])||0)*60+(parseInt(p[1])||0);
    return neg?-t:t;
  }
  function fmtRem(mins) { if(mins<=0) return 'LIVRE'; var h=Math.floor(mins/60),m=mins%60; return h===0?m+'min':h+'h'+String(m).padStart(2,'0'); }
  function nowTimeStr() { var d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  var DEFAULT_LUNCH = 30; // estimativa usada nas previsões até o intervalo real ser batido
  // intervalos já fechados; enquanto não houver nenhum, vale a estimativa (ou o intervalo em curso, se maior)
  function plannedLunch() {
    var s=punchSummary(nowMins());
    if(s&&s.closedBreaks>0) return s.closedBreaks;
    return Math.max(DEFAULT_LUNCH, s?s.breaks:0);
  }

  // ===== GETSTATE =====
  function getState() {
    var cal = calcCalendar(), ps = punchSummary(nowMins());
    return {
      entrada: ps ? ps.entrada : null,
      almoco: plannedLunch(),
      worked: ps ? ps.worked : 0,
      breaks: ps ? ps.breaks : 0,
      saidaReal: ps ? ps.saida : null,
      saldoIcarus: parseSaldo($('saldoIcarus').value),
      diasUteis:cal.diasUteis, diasTrab:cal.diasTrab,
      diasAtest:cal.diasAtest, diasFerias:cal.diasFerias, diasAbono:cal.diasAbono,
      diasRest:cal.diasRest, abonoMinutos:cal.abonoMinutos,
      abonoTrab:cal.abonoTrab, abonoRest:cal.abonoRest, diasTrabAbono:cal.diasTrabAbono
    };
  }

  // ===== CALCULATIONS =====
  function calcExits(st) {
    if (st.entrada == null) return [];
    return getTargets().map(function (t) {
      var noLunch = t.mins <= LUNCH_MIN_WORK;
      return { id:t.id, label:t.label, desc:t.desc, color:t.color, mins:t.mins, exit:st.entrada+t.mins+(noLunch?0:st.almoco), custom:t.custom, noLunch:noLunch };
    });
  }
  function calcBank(st) {
    if (st.saldoIcarus == null || !st.diasUteis) return null;
    var dr = st.diasRest; if (dr <= 0) return null;
    var abono = st.abonoTrab, saldoPos = st.saldoIcarus + abono + (st.abonoMinutos||0);
    var porDia = saldoPos / dr, margemPlr = saldoPos - plrLimit(), plrPorDia = margemPlr / dr;
    var saidaBonus = null;
    if (st.entrada != null) saidaBonus = st.entrada + tolMeta(480 - porDia) + st.almoco;
    return {diasRest:dr,abono:abono,saldoPos:saldoPos,porDia:porDia,margemPlr:margemPlr,plrPorDia:plrPorDia,saidaBonus:saidaBonus};
  }

