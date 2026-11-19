  // ===== PROJECAO =====
  function getRemainingWorkDays() {
    var hd=getActiveHolidayDates(),abonoInt=getAbonoIntegralDates(),todayStr=toStr(new Date()),days=[];
    var d=new Date(period.inicio);
    while(d<=period.fim){
      var ds=toStr(d);
      if(ds>=todayStr){
        if(isWeekend(d)){
          // fim de semana: opcional (hora extra), não conta na meta diária
          days.push({date:ds,weekend:true});
        } else if(!hd[ds]&&!abonoInt[ds]&&!isInRanges(ds,ferias)&&!isInRanges(ds,atestados)){
          days.push({date:ds,weekend:false});
        }
      }
      d=addDays(d,1);
    }
    return days;
  }
  // enche sempre o dia mais leve, minuto a minuto, contando cada dia pelo que vale no banco (tolWork).
  // Na faixa de tolerância não adianta ficar: do piso (8h38 / 7h50, já vale a jornada) o próximo passo útil é tolMax+1.
  function distributeWork(dayConfigs,totalWork){
    var n=dayConfigs.length,w=dayConfigs.map(function(){return 0;});
    if(totalWork<=0||!n) return w;
    // ponto de partida: divisão igual abaixo da faixa de cada dia (o laço só acerta o resto)
    var base=Math.floor(totalWork/n),got=0;
    dayConfigs.forEach(function(dc,i){ w[i]=Math.max(0,Math.min(base,dc.r.tolMin-1,Math.floor(dc.maxWork))); got+=w[i]; });
    function next(v,r){ return v===r.tolMin?r.tolMax+1:v+1; }
    while(got<totalWork){
      var best=-1;
      for(var i=0;i<n;i++) if(next(w[i],dayConfigs[i].r)<=dayConfigs[i].maxWork&&(best<0||w[i]<w[best])) best=i;
      if(best<0) break; // todos no limite de saída
      var r=dayConfigs[best].r,nx=next(w[best],r);
      got+=tolWork(nx,r)-tolWork(w[best],r); w[best]=nx;
    }
    return w;
  }
  // "Priorizar piso da tolerância" (8h38 na escala 44h, 7h50 na de 40h): fixa o piso do primeiro dia em diante enquanto
  // isso diminui o trabalho total e os outros dias não ficam abaixo do piso; no fim, quem ficou a até `arred` min do
  // piso sobe para ele (você aceita trabalhar um pouco a mais)
  var priorCache={key:null,val:null};
  function priorWork(dayConfigs,totalWork,piso,arred){
    var key=JSON.stringify([dayConfigs.map(function(dc){return [dc.date,dc.maxWork];}),totalWork,piso,arred]);
    if(priorCache.key===key) return priorCache.val.slice();
    var n=dayConfigs.length,fix=dayConfigs.map(function(){return false;});
    function plan(){
      var rest=[],idx=[],need=totalWork,w=[];
      dayConfigs.forEach(function(dc,i){ if(fix[i]){w[i]=dc.r.tolMin;need-=dc.r.jornada;} else {rest.push(dc);idx.push(i);} });
      var a=distributeWork(rest,need);
      idx.forEach(function(i,j){w[i]=a[j];});
      var vale=a.reduce(function(t,v,j){return t+tolWork(v,rest[j].r);},0);
      return {w:w,ok:vale>=need-0.5&&idx.every(function(i){return w[i]>=piso;}),total:w.reduce(function(t,v){return t+v;},0)};
    }
    var best=plan(),i;
    if(best.ok) for(i=0;i<n;i++){
      if(dayConfigs[i].maxWork<dayConfigs[i].r.tolMin) continue;
      fix[i]=true; var p=plan();
      if(p.ok&&p.total<=best.total) best=p; else { fix[i]=false; break; }
    }
    for(i=0;i<n;i++){
      var w=best.w[i],tm=dayConfigs[i].r.tolMin;
      if(fix[i]||w>=tm||w<tm-arred||dayConfigs[i].maxWork<tm) continue;
      fix[i]=true; var q=plan();
      if(q.ok) best=q; else { fix[i]=false; best.w[i]=tm; } // os outros já estão no piso: só este sobe
    }
    priorCache={key:key,val:best.w.slice()};
    return best.w;
  }
  window.projPriorToggle=function(){
    $('projPriorOpts').hidden=!$('projPrior').checked;
    renderProjection(); save();
  };
  function calcProjection(bank){
    var days=getRemainingWorkDays();
    if(!days.length) return null;
    var saldoPos=bank.saldoPos;
    var entradaDef=parseTime($('projEntrada').value)||480;
    var saidaMaxMins=parseTime($('projSaidaMax').value)||1080;
    var almocoDef=parseInt($('projAlmoco').value)||60;
    var todayStr=toStr(new Date()),entradaHoje=firstPunch();
    var almocoHoje=plannedLunch();
    var dayConfigs=days.map(function(rd){
      var ds=rd.date, weekend=rd.weekend, hoje=ds===todayStr;
      var ov=projOverrides[ds]||{};
      var falta=!!ov.falta;
      // hoje herda entrada e almoço reais da aba Hoje (a menos que haja override na projeção)
      var entrada=(hoje&&entradaHoje!=null&&ov.entrada==null)?entradaHoje:(ov.entrada!=null?ov.entrada:entradaDef);
      var almoco=ov.almoco!=null?ov.almoco:(hoje?almocoHoje:almocoDef);
      var maxWork=falta?0:Math.max(0,saidaMaxMins-entrada-almoco);
      var saidaLock=ov.saida!=null?ov.saida:null;
      var expected=weekend?0:480; // meta líquida: 8h/dia (44h: jornada 8h48 − 48min de abono; 40h: jornada 8h); FDS não tem meta
      return {date:ds,r:regra(ds),weekend:weekend,entrada:entrada,almoco:almoco,maxWork:maxWork,saidaLock:saidaLock,falta:falta,expected:expected};
    });
    var totalExpected=0;
    dayConfigs.forEach(function(dc){totalExpected+=dc.expected;});
    var alvo=parseSaldo($("projAlvo").value)||0;
    var totalWorkNeeded=totalExpected-saldoPos+alvo;
    var lockedWork=0,freeConfigs=[],freeIndices=[];
    var allocated=dayConfigs.map(function(){return 0;});
    dayConfigs.forEach(function(dc,i){
      if(dc.falta){
        allocated[i]=0;
      } else if(dc.saidaLock!=null){
        var w=Math.max(0,dc.saidaLock-dc.entrada-dc.almoco);
        allocated[i]=w;lockedWork+=dc.weekend?w:tolWork(w,dc.r);
      } else if(dc.weekend){
        allocated[i]=0; // fim de semana desligado por padrão; só conta se você definir uma saída
      } else {
        freeConfigs.push(dc);freeIndices.push(i);
      }
    });
    var freeWork=totalWorkNeeded-lockedWork;
    var freeAlloc=$('projPrior').checked
      ?priorWork(freeConfigs,freeWork,parseTime($('projPiso').value)||420,Math.max(0,parseInt($('projArred').value)||0))
      :distributeWork(freeConfigs,freeWork);
    freeIndices.forEach(function(idx,j){allocated[idx]=freeAlloc[j];});
    // saída planejada de cada dia (null = folga/falta)
    dayConfigs.forEach(function(dc,i){
      var work=Math.max(0,allocated[i]);
      if(dc.falta||(dc.weekend&&dc.saidaLock==null)) dc.saida=null;
      else dc.saida=dc.saidaLock!=null?dc.saidaLock:Math.round(dc.entrada+work+dc.almoco);
    });
    var deficit=Math.round(freeWork-freeAlloc.reduce(function(a,b,j){return a+tolWork(b,freeConfigs[j].r);},0));
    return {dayConfigs:dayConfigs,allocated:allocated,saldoPos:saldoPos,deficit:deficit,todayStr:todayStr};
  }
  var projRendering=false;
  window.renderProjection=function(){
    projRendering=true;
    var c=$('projResult'),st=getState(),bank=calcBank(st);
    if(!bank){c.innerHTML='<div class="empty-hint">Preencha o saldo do Ícarus</div>';projRendering=false;return;}
    var proj=calcProjection(bank);
    if(!proj){c.innerHTML='<div class="empty-hint">Nenhum dia restante no período</div>';projRendering=false;return;}
    var dayConfigs=proj.dayConfigs,allocated=proj.allocated,saldoPos=proj.saldoPos,todayStr=proj.todayStr;
    // rótulos do "Priorizar" seguem a regra dos dias projetados (44h até 30/11/2026, 40h depois)
    var regrasProj={};
    dayConfigs.forEach(function(dc){ if(!dc.weekend) regrasProj[dc.r.jornada]=dc.r; });
    var rp=Object.keys(regrasProj).sort().reverse().map(function(k){return regrasProj[k];});
    if(rp.length){
      var fh=fmtDur;
      $('projPriorTit').textContent='Priorizar '+rp.map(function(r){return fh(r.tolMin);}).join(' / ');
      $('projPriorDesc').textContent='Cada dia em '+rp.map(function(r){return fh(r.tolMin)+' vale '+fh(r.jornada);}).join(' (at\u00e9 30/11) e em ')+
        (rp.length>1?' (a partir de 01/12)':'')+' \u2014 10 min de gra\u00e7a. Os outros dias ficam mais curtos para compensar.';
      $('projArredLbl').textContent='Completar '+rp.map(function(r){return fh(r.tolMin);}).join(' / ');
    }
    var weekDays=['dom','seg','ter','qua','qui','sex','sáb'];
    var html='<div class="esp-scroll proj-scroll"><table class="esp-table proj-table"><thead><tr>'+
      '<th scope="col">Dia</th><th scope="col">Entrada</th><th scope="col">Almo&ccedil;o</th><th scope="col">Sa&iacute;da</th><th scope="col">Trabalho</th><th scope="col">Saldo</th><th scope="col"></th></tr></thead><tbody>',totalAlloc=0;
    var runningSaldo=saldoPos; // mesma régua do card Banco: saldo pós abono, meta líquida de 8h/dia
    dayConfigs.forEach(function(dc,i){
      var work=Math.max(0,allocated[i]);totalAlloc+=work;
      var vale=dc.weekend?work:tolWork(work,dc.r); // FDS não tem jornada, então não tem tolerância
      runningSaldo+=vale-dc.expected;
      var saida=dc.saida!=null?dc.saida:Math.round(dc.entrada+work+dc.almoco);
      var isLocked=dc.saidaLock!=null;
      var dayName=weekDays[fromStr(dc.date).getDay()];
      var isToday=dc.date===todayStr;
      var weekendOff=dc.weekend&&!isLocked;
      var cls=(isToday?'proj-tr-today ':'')+(dc.weekend?'proj-tr-fds ':'')+(dc.falta?'proj-tr-falta':'');
      html+='<tr class="'+cls+'">';
      html+='<td class="esp-td-dia">'+fmtDateBr(dc.date)+' <small>'+dayName+'</small>'+(dc.weekend?' <span class="proj-fds-badge">FDS</span>':'')+'</td>';
      if(dc.falta){
        html+='<td colspan="3"><span class="esp-falta-txt">Falta</span></td>';
      } else {
        html+='<td><input type="time" value="'+fmtTime(dc.entrada)+'" onblur="setProjDay(\''+dc.date+'\',\'entrada\',this.value)" aria-label="Entrada"></td>';
        html+='<td><input type="number" value="'+dc.almoco+'" min="0" max="180" onblur="setProjDay(\''+dc.date+'\',\'almoco\',this.value)" aria-label="Almo\u00e7o (min)"></td>';
        if(weekendOff){
          html+='<td><input type="time" value="" onblur="setProjDay(\''+dc.date+'\',\'saida\',this.value)" title="Defina uma saída para usar este dia como hora extra" aria-label="Sa\u00edda"></td>';
        } else {
          html+='<td><span class="pj-saida"><input type="time" class="'+(isLocked?'pj-locked':'')+'" value="'+fmtTime(saida)+'" onblur="setProjDay(\''+dc.date+'\',\'saida\',this.value)" aria-label="Sa\u00edda">'+
            (isLocked?'<button class="proj-reset" aria-label="Resetar sa\u00edda" onclick="resetProjSaida(\''+dc.date+'\')" title="Resetar">&times;</button>':'')+'</span></td>';
        }
      }
      var tolTxt=!dc.falta&&!dc.weekend&&vale!==work?' <small class="proj-tol" title="Dentro da toler\u00e2ncia de 10 min: conta como '+fmtDur(dc.r.jornada)+'">= '+fmtDur(dc.r.jornada)+'</small>':'';
      html+='<td class="esp-td-num">'+(dc.falta?'\u2014':(weekendOff?'folga':(work>0&&dc.weekend?'+'+fmtDur(work)+' HE':fmtDur(work))))+tolTxt+'</td>';
      html+='<td class="esp-td-num '+(runningSaldo<0?'negative':'positive')+'">'+fmtSaldo(Math.round(runningSaldo))+'</td>';
      html+='<td>'+(!dc.weekend?'<button class="proj-falta-btn'+(dc.falta?' active':'')+'" onclick="toggleProjFalta(\''+dc.date+'\')">'+(dc.falta?'Desmarcar':'Falta')+'</button>':'')+'</td>';
      html+='</tr>';
    });
    html+='</tbody></table></div>';
    var saldoFinal=Math.round(saldoPos);
    dayConfigs.forEach(function(dc,i){var w=Math.max(0,allocated[i]);saldoFinal+=Math.round((dc.weekend?w:tolWork(w,dc.r))-dc.expected);});
    var deficit=proj.deficit;
    var alvoFinal=parseSaldo($('projAlvo').value)||0;
    var metaTxt=alvoFinal===0?'zerar':'atingir '+fmtSaldo(alvoFinal);
    html+='<div class="proj-summary">';
    if(deficit>1)html+='<div class="proj-warn">Não é possível '+metaTxt+' com a saída máxima atual. Déficit: '+fmtDur(deficit)+'</div>';
    html+='<div class="proj-final"><span>Saldo projetado</span><span class="'+(Math.abs(saldoFinal-alvoFinal)<2?'positive':saldoFinal>=alvoFinal?'positive':'negative')+'">'+fmtSaldo(saldoFinal)+'</span></div>';
    html+='</div>';
    c.innerHTML=html;
    projRendering=false;
  };
  window.setProjDay=function(date,field,value){
    if(projRendering)return;
    if(!projOverrides[date])projOverrides[date]={};
    if(field==='entrada')projOverrides[date].entrada=parseTime(value);
    else if(field==='almoco')projOverrides[date].almoco=parseInt(value)||60;
    else if(field==='saida')projOverrides[date].saida=parseTime(value);
    renderProjection();
  };
  window.resetProjSaida=function(date){
    if(projOverrides[date])delete projOverrides[date].saida;
    renderProjection();
  };
  window.toggleProjFalta=function(date){
    if(projRendering)return;
    if(!projOverrides[date])projOverrides[date]={};
    projOverrides[date].falta=!projOverrides[date].falta;
    if(!projOverrides[date].falta)delete projOverrides[date].falta;
    renderProjection();
  };


