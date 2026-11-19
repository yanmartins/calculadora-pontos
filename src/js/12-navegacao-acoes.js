  // ===== PAGE NAVIGATION =====
  window.switchPage = function(page){
    document.querySelectorAll('[data-page]').forEach(function(el){
      el.classList.toggle('page-active',el.getAttribute('data-page')===page);
    });
    document.querySelectorAll('.nav-item').forEach(function(n){
      var on=n.getAttribute('data-page')===page;
      n.classList.toggle('active',on);
      if(on)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
    });
    window.scrollTo({top:0,behavior:'smooth'});
    if(page==='espelho')espelhoSync(false);
    if(page==='calendario')abonoAutoSync();
  };

  // ===== GLOBAL ACTIONS =====
  window.toggleSection = function(id){ $(id).classList.toggle('open'); };
  window.toggleHoliday = function(date,en){ if(en)delete disabledHolidays[date];else disabledHolidays[date]=true; render(); };
  window.addCustomHoliday = function(){
    var date=$('feriadoData').value,name=$('feriadoNome').value.trim();
    if(!date||!name)return;
    if(!customHolidays.some(function(h){return h.date===date;})){
      customHolidays.push({date:date,name:name,custom:true});
      $('feriadoData').value='';$('feriadoNome').value='';renderAll();
    }
  };
  window.removeCustomHoliday = function(date){ customHolidays=customHolidays.filter(function(h){return h.date!==date;}); delete disabledHolidays[date]; renderAll(); };
  window.updateHolidayDate = function(name,oldDate,newDate){
    if(!newDate||newDate===oldDate)return;
    if(parseInt(newDate.substring(0,4))<2000)return;
    if(disabledHolidays[oldDate]){delete disabledHolidays[oldDate];disabledHolidays[newDate]=true;}
    var year=oldDate.substring(0,4);
    holidayOverrides[name+'_'+year]=newDate;
    renderAll();
  };
  window.setFerias = function(idx){
    var ini=$('ferias'+idx+'Inicio').value,fim=$('ferias'+idx+'Fim').value;
    if(!ini||!fim)return;
    if(parseInt(ini.substring(0,4))<2000||parseInt(fim.substring(0,4))<2000)return;
    if(fim<ini){var t=ini;ini=fim;fim=t;}
    ferias[idx]={inicio:ini,fim:fim};
    renderAll();
  };
  window.clearFerias = function(idx){ferias[idx]=null;renderAll();};
  window.addAtestado = function(){
    var ini=$('atestadoInicio').value,fim=$('atestadoFim').value;
    if(!ini)return;if(!fim)fim=ini;
    if(parseInt(ini.substring(0,4))<2000)return;
    if(fim<ini){var t=ini;ini=fim;fim=t;}
    atestados.push({inicio:ini,fim:fim});$('atestadoInicio').value='';$('atestadoFim').value='';renderAll();
  };
  window.removeAtestado = function(idx){atestados.splice(idx,1);renderAll();};
  window.toggleAbonoHoras = function(){ $('abonoHorasField').style.display=$('abonoTipo').value==='parcial'?'':'none'; };
  window.addAbono = function(){
    var date=$('abonoData').value,tipo=$('abonoTipo').value;
    if(!date)return;
    if(parseInt(date.substring(0,4))<2000)return;
    var entry={date:date,tipo:tipo};
    if(tipo==='parcial'){var h=parseInt($('abonoHoras').value)||4;entry.minutos=Math.max(1,Math.min(8,h))*60;}
    abonos.push(entry);$('abonoData').value='';$('abonoTipo').value='integral';$('abonoHorasField').style.display='none';renderAll();
  };
  window.removeAbono = function(idx){abonos.splice(idx,1);renderAll();};

