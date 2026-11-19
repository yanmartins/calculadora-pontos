  // ===== METAS PERSONALIZADAS =====
  var metaSeq = 0;
  window.addMeta = function () {
    var nome=$('metaNome').value.trim();
    var mins=parseDur($('metaDur').value);
    if(mins==null||mins<=0){ $('metaDur').focus(); return; }
    if(mins>1440) mins=1440;
    var id='m'+(Date.now())+'_'+(metaSeq++);
    customTargets.push({ id:id, label:nome||fmtHoras(mins), mins:mins });
    $('metaNome').value=''; $('metaDur').value='';
    save(); render();
  };
  window.removeMeta = function (id) {
    customTargets=customTargets.filter(function(t){return t.id!==id;});
    save(); render();
  };

