  // ===== MAIN RENDER =====
  function render() {
    var st=getState();
    renderCalSummary(st);renderDash(st);renderBoard(st);renderHojeCountdown();
    renderBank(st);updatePunchSlots();
    checkNotifications(st);save();
  }
  function renderFeriasSlots() {
    var html='';
    for(var i=0;i<3;i++){
      var f=ferias[i]||null;
      var iniVal=f?f.inicio:'';
      var fimVal=f?f.fim:'';
      var info='';
      if(f){var d=Math.round((fromStr(f.fim)-fromStr(f.inicio))/86400000)+1;info='<span class="ferias-days">'+d+' dias</span>';}
      html+='<div class="ferias-slot"><div class="ferias-slot-header"><span class="ms lbl-ico" aria-hidden="true">beach_access</span><span class="ferias-slot-title">Período '+(i+1)+'</span>'+
        (f?'<button class="btn-remove" aria-label="Remover" onclick="clearFerias('+i+')">×</button>':'')+info+'</div>'+
        '<div class="grid-2"><div class="field"><label><span class="ms" aria-hidden="true">calendar_month</span>Início</label><input type="date" id="ferias'+i+'Inicio" value="'+iniVal+'" onchange="setFerias('+i+')"></div>'+
        '<div class="field"><label><span class="ms" aria-hidden="true">flag</span>Fim</label><input type="date" id="ferias'+i+'Fim" value="'+fimVal+'" onchange="setFerias('+i+')"></div></div></div>';
    }
    var total=0;
    ferias.forEach(function(f){if(f)total+=Math.round((fromStr(f.fim)-fromStr(f.inicio))/86400000)+1;});
    if(total>0) html+='<div class="ferias-total">Total: '+total+' dias</div>';
    $('feriasSlots').innerHTML=html;
  }
  function renderAll() {
    initHolidays();renderPeriodLabel();renderHolidays();renderFeriasSlots();
    renderRangeList('atestadoList',atestados,'removeAtestado',svgAtest);
    renderAbonos();render();renderProjection();
  }

