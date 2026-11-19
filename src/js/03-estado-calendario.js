  // ===== STATE =====
  var period = getCurrentPeriod();
  var ferias = [null,null,null], atestados = [], abonos = [], holidays = [], allYearHolidays = [], disabledHolidays = {}, customHolidays = [], holidayOverrides = {};
  var customTargets = []; // metas personalizadas: {id, label, mins}
  var saldoIcarusDate = null; // dia em que o saldo Icarus foi informado
  var projOverrides = {};
  var notificationsEnabled = false, notifiedToday = {}, notifDate = toStr(new Date());

  function applyOverrides(list) {
    return list.map(function (h) {
      var key = h.name + '_' + h.date.substring(0, 4);
      return holidayOverrides[key] ? { date: holidayOverrides[key], name: h.name } : h;
    });
  }
  function initHolidays() {
    var years = {}, d = new Date(period.inicio);
    while (d <= period.fim) { years[d.getFullYear()] = true; d = addDays(d, 1); }
    var periodNational = [];
    Object.keys(years).forEach(function (y) { periodNational = periodNational.concat(getNationalHolidays(parseInt(y))); });
    periodNational = applyOverrides(periodNational);
    var ini = toStr(period.inicio), fim = toStr(period.fim);
    holidays = periodNational.filter(function (h) { return h.date >= ini && h.date <= fim; });
    customHolidays.forEach(function (ch) {
      if (ch.date >= ini && ch.date <= fim && !holidays.some(function (h) { return h.date === ch.date; }))
        holidays.push(ch);
    });
    holidays.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var currentYear = new Date().getFullYear();
    var yearList = getNationalHolidays(currentYear);
    yearList = applyOverrides(yearList);
    allYearHolidays = yearList.slice();
    customHolidays.forEach(function (ch) {
      if (ch.date.substring(0,4) === String(currentYear) && !allYearHolidays.some(function (h) { return h.date === ch.date; }))
        allYearHolidays.push(ch);
    });
    allYearHolidays.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function getActiveHolidayDates() {
    var set = {};
    holidays.concat(customHolidays).forEach(function (h) { if (!disabledHolidays[h.date]) set[h.date] = true; });
    return set;
  }
  function isInRanges(dateStr, ranges) {
    return ranges.some(function (r) { return r && dateStr >= r.inicio && dateStr <= r.fim; });
  }
  function getAbonoIntegralDates() {
    var ini=toStr(period.inicio),fim=toStr(period.fim),set={};
    abonos.forEach(function(a){ if(a.tipo==='integral'&&a.date>=ini&&a.date<=fim) set[a.date]=true; });
    return set;
  }
  function calcCalendar() {
    var hd = getActiveHolidayDates(), abonoInt = getAbonoIntegralDates(), todayStr = toStr(new Date());
    var diasUteis=0, diasTrab=0, diasFerias=0, diasAtest=0, diasAbono=0, diasRest=0, abonoMinutos=0, abonoTrab=0, abonoRest=0, diasTrabAbono=0;
    var ini=toStr(period.inicio),fim=toStr(period.fim);
    var d = new Date(period.inicio);
    while (d <= period.fim) {
      var ds = toStr(d);
      if (!isWeekend(d) && !hd[ds] && !abonoInt[ds]) {
        diasUteis++;
        if (isInRanges(ds, ferias)) diasFerias++;
        else if (isInRanges(ds, atestados)) diasAtest++;
        else {
          var abonoParc = null;
          abonos.forEach(function(a){ if(a.tipo==='parcial'&&a.date===ds) abonoParc=a; });
          if(abonoParc) abonoMinutos+=abonoParc.minutos;
          if (ds < todayStr) { diasTrab++; abonoTrab += regra(ds).abono; if (regra(ds).abono) diasTrabAbono++; }
          else { diasRest++; abonoRest += regra(ds).abono; }
        }
      } else if(!isWeekend(d) && abonoInt[ds]) {
        diasAbono++;
      }
      d = addDays(d, 1);
    }
    return {diasUteis:diasUteis,diasTrab:diasTrab,diasFerias:diasFerias,diasAtest:diasAtest,diasAbono:diasAbono,diasRest:diasRest,abonoMinutos:abonoMinutos,abonoTrab:abonoTrab,abonoRest:abonoRest,diasTrabAbono:diasTrabAbono};
  }

