  // ===== SVG ICONS =====
  var svgFerias = '<span class="ms range-item-icon" aria-hidden="true">beach_access</span>';
  var svgAtest = '<span class="ms range-item-icon" aria-hidden="true">coronavirus</span>';

  // ===== RENDERERS =====
  function renderPeriodLabel() {
    var lbl = fmtDateBr(toStr(period.inicio))+' — '+fmtDateBr(toStr(period.fim));
    $('periodLabel').textContent = lbl;
    $('bankPeriodLabel').textContent = lbl;
  }

  function renderCalSummary(st) {
    var ausencias = st.diasFerias + st.diasAtest + st.diasAbono;
    var items = [
      {v:st.diasUteis,l:'Úteis',c:''},
      {v:st.diasTrab,l:'Trabalhados',c:'accent-c'},
      {v:st.diasRest,l:'Restantes',c:st.diasRest<=3?'warn':''},
      {v:ausencias,l:'Ausências',c:ausencias>0?'negative':''}
    ];
    // abono de 48 min só nos dias úteis trabalhados até 30/11/2026 (escala 44h) + abonos parciais do Ícarus
    var abonoTotal = st.abonoTrab + st.abonoRest + (st.abonoMinutos||0);
    items.push({v:fmtDur(abonoTotal),l:'Abono Período',c:'positive'});
    setHTML($('calSummary'), items.map(function(i){
      return '<div class="cal-stat"><div class="cal-stat-val '+i.c+'">'+i.v+'</div><div class="cal-stat-lbl">'+i.l+'</div></div>';
    }).join(''));
  }

  // mesmo visual da lista de aniversariantes: próximos primeiro com contagem, os que já passaram no fim
  function renderHolidays() {
    var ini=toStr(period.inicio),fim=toStr(period.fim);
    var rows=allYearHolidays.map(function(h){ return {h:h,n:daysUntil(h.date)}; });
    rows.sort(function(a,b){ var pa=a.n<0,pb=b.n<0; return pa!==pb?(pa?1:-1):(pa?b.n-a.n:a.n-b.n); });
    var sep=false;
    $('holidayList').innerHTML = rows.map(function(r){
      var h=r.h,n=r.n,inPeriod=h.date>=ini&&h.date<=fim; // só os do período ficam destacados
      var checked=!disabledHolidays[h.date]?'checked':'';
      var isCustom=customHolidays.some(function(c){return c.date===h.date;});
      var cls=isCustom?' holiday-custom':'';
      var rm=isCustom?'<button class="btn-remove" aria-label="Remover" onclick="removeCustomHoliday(\''+h.date+'\')">×</button>':'';
      var nameEsc=h.name.replace(/'/g,"\\'");
      var badge=n<0?'<span class="aniver-badge">passou</span>'
        :'<span class="aniver-badge'+(n===0&&inPeriod?' hol-today':inPeriod||n<=30?' hol-soon':'')+'">'+(n===0?'hoje':n===1?'amanhã':'em '+n+'d')+'</span>';
      // data em texto; o input de data invisível por cima mantém a edição
      // divisória antes do primeiro feriado que já passou
      var div=(n<0&&!sep)?(sep=true,'<div class="hol-sep">J\u00e1 passaram</div>'):'';
      return div+'<div class="holiday-item aniver-item'+(inPeriod?'':' holiday-dim')+'"><input type="checkbox" aria-label="Considerar feriado" '+checked+' onchange="toggleHoliday(\''+h.date+'\',this.checked)">'+
        '<label class="aniver-date hol-date" title="Alterar data">'+fmtDateBr(h.date)+' <small>'+['dom','seg','ter','qua','qui','sex','sáb'][fromStr(h.date).getDay()]+'</small>'+
        '<input type="date" aria-label="Alterar data de '+h.name+'" value="'+h.date+'" onclick="try{this.showPicker()}catch(e){}" onchange="updateHolidayDate(\''+nameEsc+'\',\''+h.date+'\',this.value)"></label>'+
        '<span class="holiday-name'+cls+'">'+h.name+'</span>'+badge+rm+'</div>';
    }).join('');
  }

  function renderAbonos() {
    var ini=toStr(period.inicio),fim=toStr(period.fim);
    var c=$('abonoList');
    if(!abonos.length){c.innerHTML='<div class="empty-hint">Nenhum abono registrado</div>';return;}
    var sorted=abonos.slice().sort(function(a,b){return a.date<b.date?-1:1;});
    c.innerHTML=sorted.map(function(a,idx){
      var inPeriod=a.date>=ini&&a.date<=fim;
      var dim=inPeriod?'':' abono-dim';
      var badge=inPeriod?'<span class="abono-period-badge">período</span>':'';
      var tipoLabel=(a.tipo==='integral'?'Dia inteiro':fmtDur(a.minutos)+' de abono')+(a.motivo?' <span class="src-motivo">'+a.motivo+'</span>':'');
      if(a.src==='icarus') badge+='<span class="src-icarus">Ícarus</span>';
      var realIdx=abonos.indexOf(a);
      return '<div class="abono-item'+dim+'"><span class="abono-date">'+fmtDateBr(a.date)+'</span><span class="abono-tipo">'+tipoLabel+'</span>'+badge+'<button class="btn-remove" aria-label="Remover" onclick="removeAbono('+realIdx+')">×</button></div>';
    }).join('');
  }

  function renderRangeList(containerId, ranges, removeFunc, icon) {
    var c = $(containerId);
    if (!ranges.length) { c.innerHTML = '<div class="empty-hint">Nenhum registro</div>'; return; }
    c.innerHTML = ranges.map(function(r, idx){
      var days = Math.round((fromStr(r.fim)-fromStr(r.inicio))/86400000)+1;
      var src=r.src==='icarus'?'<span class="src-icarus" title="'+(r.motivo||'')+'">Ícarus</span>':'';
      return '<div class="range-item">'+icon+'<span class="range-item-text">'+fmtDateBr(r.inicio)+' — '+fmtDateBr(r.fim)+(r.motivo?' <span class="src-motivo">'+r.motivo+'</span>':'')+'</span>'+src+'<span class="range-item-days">'+days+'d</span><button class="btn-remove" aria-label="Remover" onclick="'+removeFunc+'('+idx+')">×</button></div>';
    }).join('');
  }

  // ===== VIDA (M3 Expressive): helpers =====
  // só toca o DOM quando o HTML muda — preserva animações CSS entre os ticks de 1s
  function setHTML(el, html) { if (el.__h !== html) { el.__h = html; el.innerHTML = html; } }
  // odômetro: dígitos que mudaram rolam de baixo pra cima
  function odoSet(el, str) {
    var prev = el.__od || '';
    if (prev === str) return;
    var html = '';
    for (var i = 0; i < str.length; i++) {
      html += '<span class="od' + (prev[i] !== str[i] ? ' od-t' : '') + '">' + str[i] + '</span>';
    }
    el.innerHTML = html; el.__od = str;
  }
  // confete discreto ao cumprir as 8h (1x por dia)
  function celebrate() {
    var host = $('secPanorama'); if (!host || host.querySelector('.confetti')) return;
    var wrap = document.createElement('div'); wrap.className = 'confetti';
    var cores = ['var(--accent)', 'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--orange)'];
    for (var i = 0; i < 26; i++) {
      var p = document.createElement('i');
      p.style.left = (6 + Math.random() * 88) + '%';
      p.style.background = cores[i % cores.length];
      p.style.animationDelay = (Math.random() * .4) + 's';
      p.style.animationDuration = (1.2 + Math.random() * .9) + 's';
      wrap.appendChild(p);
    }
    host.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 2600);
  }

  function renderBoard(st) {
    var board=$('board'), exits=calcExits(st);
    if(!exits.length){setHTML(board,'<div class="board-empty">Insira o horário de entrada</div>');return;}
    var now=nowMins(),foundNext=false,placedNow=false;
    var nowRow='<div class="tl-now"><span class="tl-now-dot"></span><span class="tl-now-chip">'+nowTimeStr()+' &middot; agora</span><span class="tl-now-line"></span></div>';
    var html='<div class="tl">';
    exits.forEach(function(e){
      var rem=e.exit-now,status='future';
      if(rem<=0)status='passed'; else if(!foundNext){status='next';foundNext=true;}
      if(status!=='passed'&&!placedNow){html+=nowRow;placedNow=true;}
      var badge=status==='passed'?'LIVRE':fmtRem(rem);
      var rm=e.custom?'<button class="tl-remove" aria-label="Remover meta" onclick="removeMeta(\''+e.id+'\')" title="Remover meta">&times;</button>':'';
      var nl=e.noLunch?' <span class="nolunch-chip">sem almo&ccedil;o</span>':'';
      html+='<div class="tl-item '+status+'" data-color="'+e.color+'">'+
        '<span class="tl-dot">'+(status==='passed'?'<span class="ms" aria-hidden="true">check</span>':'')+'</span>'+
        '<span class="tl-time">'+fmtTime(e.exit)+'</span>'+
        '<span class="tl-info"><span class="tl-name">'+e.label+'</span><span class="tl-dur">'+e.desc+nl+'</span></span>'+
        '<span class="tl-badge">'+badge+'</span>'+rm+'</div>';
    });
    if(!placedNow)html+=nowRow; // todas as metas já passaram: agora fica no fim da linha
    html+='</div>';
    setHTML(board,html);
  }


  function renderBank(st) {
    var c=$('bankResults'),bank=calcBank(st);
    if(!bank){
      setHTML(c,'<div class="empty-hint">'+(st.saldoIcarus==null
        ?'Informe o Saldo Icarus na aba Hoje para ver o banco.'
        :'Nenhum dia útil restante no período.')+'</div>');
      return;
    }
    function tile(v,l,cls){ return '<div class="cal-stat"><div class="cal-stat-val '+(cls||'')+'">'+v+'</div><div class="cal-stat-lbl">'+l+'</div></div>'; }
    var todayStr=toStr(new Date());

    // Hero: saldo atual + de onde ele vem
    var html='<div class="bank-hero '+(bank.saldoPos>=0?'pos':'neg')+'">'+
      '<div class="bank-hero-val '+(bank.saldoPos>=0?'positive':'negative')+'">'+fmtSaldo(bank.saldoPos)+'</div>'+
      '<div class="bank-hero-src">Icarus <b>'+fmtSaldo(st.saldoIcarus)+'</b>'+
        (saldoIcarusDate?' ('+fmtDateBr(saldoIcarusDate)+')':'')+
        (st.diasTrabAbono?' + abono <b>'+fmtDur(48)+'</b> × <b>'+st.diasTrabAbono+'</b> dias trabalhados':'')+
        (st.abonoMinutos?' + <b>'+fmtDur(st.abonoMinutos)+'</b> de abonos parciais':'')+'</div>';
    // o saldo é naturalmente "de ontem"; só está defasado se houver dia ÚTIL completo depois dele
    var saldoStale=false;
    if(saldoIcarusDate){
      var hdStale=getActiveHolidayDates(), dStale=addDays(fromStr(saldoIcarusDate),1);
      while(toStr(dStale)<todayStr){
        if(!isWeekend(dStale)&&!hdStale[toStr(dStale)]){saldoStale=true;break;}
        dStale=addDays(dStale,1);
      }
    }
    if(saldoStale)
      html+='<div class="bank-stale">Saldo de '+fmtDateBr(saldoIcarusDate)+' — há dias úteis mais recentes, sincronize na aba Hoje</div>';
    html+='</div>';

    // Para zerar até o fim do período
    var metaDia=tolMeta(Math.max(0,480-bank.porDia)); // 8h líquidas/dia ± ajuste do saldo, respeitando a tolerância de hoje
    html+='<div class="bank-sec-title">Para zerar até '+fmtDateBr(toStr(period.fim))+'</div>';
    html+='<div class="bank-tiles">';
    html+=tile(bank.diasRest,'Dias úteis restantes','');
    html+=tile(fmtDur(metaDia),'Trabalhe por dia',bank.porDia<0?'warn':'positive');
    // saída de hoje vem do mesmo motor da Projeção (respeita travas, faltas e saída máxima)
    var proj=calcProjection(bank),saidaHoje=null,hojeNaProj=false;
    if(proj) proj.dayConfigs.forEach(function(dc){ if(dc.date===proj.todayStr){hojeNaProj=true;saidaHoje=dc.saida;} });
    if(!hojeNaProj&&bank.saidaBonus!=null) saidaHoje=Math.round(bank.saidaBonus);
    if(saidaHoje!=null)
      html+=tile(fmtTime(saidaHoje),'Saindo hoje às','accent-c');
    html+='</div>';

    // PLR
    html+='<div class="bank-sec-title">PLR</div>';
    html+='<div class="bank-tiles">';
    html+=tile(fmtSaldo(plrLimit()),'Limite do período','');
    html+=tile(fmtSaldo(bank.margemPlr),'Margem até o limite',bank.margemPlr>0?'positive':'negative');
    html+=tile(fmtSaldo(bank.plrPorDia),'Tolerância por dia',bank.plrPorDia>0?'positive':'negative');
    html+='</div>';

    setHTML(c,html);
  }

  function renderDash(st) {
    var trabEl=$('trabalhado'), restEl=$('dashRestante'), intEl=$('dashIntervalo'), bancoEl=$('dashBanco');

    // Banco (independe da entrada; depende do saldo Icarus)
    var bank=calcBank(st);
    if(bank){
      bancoEl.textContent=fmtSaldo(bank.saldoPos);
      bancoEl.className='dash-tile-val '+(bank.saldoPos>=0?'positive':'negative');
    } else {
      bancoEl.textContent='--:--'; bancoEl.className='dash-tile-val';
    }

    if(st.entrada==null){
      trabEl.textContent='--:--';
      restEl.textContent='--:--'; restEl.className='dash-tile-val';
      intEl.textContent='--:--';
      return;
    }
    // fim do dia: saída batida congela o cálculo; intervalo em andamento não conta como trabalho
    var worked=st.worked,lunch=st.breaks;
    trabEl.textContent=fmtDur(worked);
    // 8h cumpridas: celebração discreta, uma vez por dia
    if(worked>=480){ try{ var tk=toStr(new Date()); if(localStorage.getItem('calc-celebrated')!==tk){ localStorage.setItem('calc-celebrated',tk); celebrate(); } }catch(e2){} }
    var restante=Math.max(0,480-worked);
    restEl.textContent=fmtDur(restante);
    restEl.className='dash-tile-val'+(restante<=0?' positive':'');
    intEl.textContent=fmtDur(lunch);

  }

  function updateClock() {
    var d=new Date(), el=$('clock');
    if(!el.__built){ el.innerHTML='<span id="clockMain"></span><span class="clock-sec" id="clockSec"></span>'; el.__built=true; }
    odoSet($('clockMain'), String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'));
    odoSet($('clockSec'), String(d.getSeconds()).padStart(2,'0'));
  }
  function updateTimer() {
    var entrada=firstPunch();
    if(entrada==null){$('timer').textContent='';return;}
    var now=nowSecs(),entry=entrada*60;
    if(now<entry){$('timer').textContent='';return;}
    var e=now-entry;
    $('timer').textContent='No local há '+Math.floor(e/3600)+':'+String(Math.floor((e%3600)/60)).padStart(2,'0')+':'+String(e%60).padStart(2,'0');
  }

