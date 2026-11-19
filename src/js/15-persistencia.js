  // ===== PERSISTENCE =====
  var _lastSave='';
  function save() {
    try {
      var _s=JSON.stringify({
        punches:punchValues(), punchesDate:punchesDate,
        saldoIcarus:$('saldoIcarus').value,
        saldoIcarusDate:saldoIcarusDate,
        ferias:ferias, atestados:atestados, abonos:abonos,
        customHolidays:customHolidays, disabledHolidays:disabledHolidays,
        holidayOverrides:holidayOverrides,
        notificationsEnabled:notificationsEnabled,
        customTargets:customTargets,
        projEntrada:$('projEntrada').value, projSaidaMax:$('projSaidaMax').value, projAlmoco:$('projAlmoco').value,
        projPrior:$('projPrior').checked, projPiso:$('projPiso').value, projArred:$('projArred').value
      });
      if(_s!==_lastSave){ _lastSave=_s; localStorage.setItem('calc-pontos',_s); }
    } catch(e){}
  }
  function load() {
    try {
      var data=JSON.parse(localStorage.getItem('calc-pontos'));
      if(!data) return;
      // formato antigo tinha 4 campos fixos
      var pv=Array.isArray(data.punches)?data.punches:[data.entrada,data.saidaAlmoco,data.voltaAlmoco,data.saidaReal].map(function(v){return v||'';});
      if(data.punchesDate) punchesDate=data.punchesDate;
      // intervalos extras vazios de outro dia não sobrevivem
      if(punchesDate&&punchesDate!==toStr(new Date())) pv=[]; // batidas de outro dia não valem para hoje
      renderPunchSlots(pv);
      if(data.saldoIcarus) $('saldoIcarus').value=data.saldoIcarus;
      if(data.saldoIcarusDate) saldoIcarusDate=data.saldoIcarusDate;
      if(data.ferias){
        var f=data.ferias;
        if(Array.isArray(f)&&f.length>0&&f[0]&&f[0].inicio&&typeof f[0]==='object'){
          ferias=[f[0]||null,f[1]||null,f[2]||null];
        } else { ferias=f; }
      }
      if(data.atestados) atestados=data.atestados;
      if(data.abonos) abonos=data.abonos;
      if(data.customHolidays) customHolidays=data.customHolidays;
      if(data.disabledHolidays) disabledHolidays=data.disabledHolidays;
      if(data.holidayOverrides) holidayOverrides=data.holidayOverrides;
      if(data.customTargets) customTargets=data.customTargets;
      if(data.projEntrada) $('projEntrada').value=data.projEntrada;
      if(data.projSaidaMax) $('projSaidaMax').value=data.projSaidaMax;
      if(data.projAlmoco) $('projAlmoco').value=data.projAlmoco;
      if(data.projPrior){ $('projPrior').checked=true; $('projPriorOpts').hidden=false; }
      if(data.projPiso) $('projPiso').value=data.projPiso;
      if(data.projArred!=null&&data.projArred!=='') $('projArred').value=data.projArred;
      if(data.notificationsEnabled) {
        notificationsEnabled=true;
        $('btnNotif').textContent='Desativar';
        $('btnNotif').classList.add('active');
      }
    } catch(e){}
  }

